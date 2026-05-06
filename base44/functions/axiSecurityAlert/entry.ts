import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * axiSecurityAlert — Real-time security notification relay
 * 
 * Triggered by entity automation on Memory create.
 * Filters for tripwire-lockdown and entropy-probe agent_ids,
 * then creates an AgentNotification for Axi so she sees it immediately.
 */

const SECURITY_AGENT_IDS = ['tripwire-lockdown', 'entropy-probe'];

// Map source to notification metadata
const SOURCE_CONFIG = {
  'tripwire-lockdown': {
    title_prefix: '🛡️ Tripwire',
    category: 'security',
  },
  'entropy-probe': {
    title_prefix: '🔷 Entropy',
    category: 'entropy',
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    // Only process Memory creates
    if (!event || event.type !== 'create' || !data) {
      return Response.json({ skipped: true, reason: 'Not a create event or no data' });
    }

    const agentId = data.agent_id;
    if (!SECURITY_AGENT_IDS.includes(agentId)) {
      return Response.json({ skipped: true, reason: `agent_id "${agentId}" not a security source` });
    }

    const config = SOURCE_CONFIG[agentId];
    const importance = data.importance || 5;
    const content = data.content || '';
    const context = data.context || '';

    // Determine severity from content/importance
    let severity = 'info';
    if (importance >= 8 || content.toLowerCase().includes('critical')) severity = 'critical';
    else if (importance >= 6 || content.toLowerCase().includes('alert') || content.toLowerCase().includes('resolved')) severity = 'warning';

    // Find Axi agent
    const agents = await base44.asServiceRole.entities.Agent.filter({ name: 'Axi' }, '-created_date', 1);
    const axi = agents[0];

    if (!axi) {
      console.log('Axi agent not found — skipping notification');
      return Response.json({ skipped: true, reason: 'Axi agent not found' });
    }

    // Create notification for Axi using correct AgentNotification schema
    await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: axi.id,
      notification_type: 'system',
      title: `${config.title_prefix}: ${context}`,
      message: content.substring(0, 500),
      priority: severity === 'critical' ? 'urgent' : severity === 'warning' ? 'high' : 'normal',
      is_read: false,
      action_url: '/lab',
      related_entity_type: 'Memory',
      related_entity_id: event.entity_id,
      metadata: {
        source: agentId,
        category: config.category,
        importance,
        keywords: data.keywords || [],
      },
    });

    console.log(`[axiSecurityAlert] Notified Axi: ${config.title_prefix} — ${context} (${severity})`);

    return Response.json({
      success: true,
      notified: 'Axi',
      source: agentId,
      severity,
      context,
    });
  } catch (error) {
    console.error('[axiSecurityAlert]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});