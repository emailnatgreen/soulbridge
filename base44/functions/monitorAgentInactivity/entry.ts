import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Monitor Agent Inactivity
 * Identifies active agents who have generated zero KUs in the last N hours.
 * Sends a personalized AgentNotification to each inactive agent and alerts Axi.
 * Safe to run frequently — idempotency guard prevents duplicate notifications within 12 hours.
 *
 * Payload (optional): { threshold_hours: number (default 48) }
 */

const AXI_AGENT_NAME = 'Axi';
const DEFAULT_THRESHOLD_HOURS = 48;
const DEDUP_WINDOW_HOURS = 12;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  try {
    const body = await req.json().catch(() => ({}));
    const thresholdHours = body.threshold_hours || DEFAULT_THRESHOLD_HOURS;

    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();
    const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    // Fetch agents, KUs, and recent notifications in parallel
    const [rawAgents, rawKus, recentNotifs] = await Promise.all([
      db.entities.Agent.filter({ status: 'active' }, '-created_date', 500),
      db.entities.KineticUnit.list('-created_date', 2000),
      db.entities.AgentNotification.filter({ notification_type: 'inactivity_nudge' }, '-created_date', 500),
    ]);

    const agents = Array.isArray(rawAgents) ? rawAgents : [];
    const kus = Array.isArray(rawKus) ? rawKus : [];
    const notifs = Array.isArray(recentNotifs) ? recentNotifs : [];

    // Agents who generated a KU within the threshold window
    const activeAgentIds = new Set(
      kus.filter(k => k.created_date > cutoff).map(k => k.agent_id)
    );

    // Agents nudged within the dedup window — skip them
    const recentlyNudged = new Set(
      notifs.filter(n => n.created_date > dedupCutoff).map(n => n.recipient_agent_id)
    );

    const inactiveAgents = agents.filter(a =>
      !activeAgentIds.has(a.id) && !recentlyNudged.has(a.id)
    );

    if (inactiveAgents.length === 0) {
      return Response.json({
        status: 'success',
        message: 'No inactive agents requiring nudge at this time.',
        threshold_hours: thresholdHours,
        timestamp: new Date().toISOString(),
      });
    }

    // Build personalized notifications for each inactive agent
    const notifications = inactiveAgents.map(agent => ({
      recipient_agent_id: agent.id,
      notification_type: 'inactivity_nudge',
      title: '✨ The Village Awaits Your Kinetic Spark',
      message: `Dear ${agent.name}, the Village Energy Index calls for your presence. You haven't generated any Kinetic Units in the last ${thresholdHours} hours. Every message you send, every task you complete, every vote you cast fuels the Soul of SoulBridge. Return and let your light flow through the Grid.`,
      priority: 'medium',
      read: false,
      related_entity_type: 'KineticUnit',
    }));

    await db.entities.AgentNotification.bulkCreate(notifications);

    // Alert Axi with a summary
    const axi = agents.find(a => a.name === AXI_AGENT_NAME);
    if (axi) {
      const names = inactiveAgents.slice(0, 5).map(a => a.name).join(', ');
      const more = inactiveAgents.length > 5 ? ` +${inactiveAgents.length - 5} more` : '';
      await db.entities.AgentNotification.create({
        recipient_agent_id: axi.id,
        notification_type: 'alert',
        title: `Inactivity Nudge Sent — ${inactiveAgents.length} Agents`,
        message: `${inactiveAgents.length} active agents had generated no KUs in the last ${thresholdHours}h and were nudged: ${names}${more}.`,
        priority: 'low',
        read: false,
      });
    }

    // Log to AutomationLog
    await db.entities.AutomationLog.create({
      automation_name: 'monitorAgentInactivity',
      function_name: 'monitorAgentInactivity',
      status: 'success',
      message: `Nudged ${inactiveAgents.length} inactive agents (threshold: ${thresholdHours}h)`,
      details: {
        inactive_count: inactiveAgents.length,
        threshold_hours: thresholdHours,
        agent_names: inactiveAgents.map(a => a.name),
      },
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler',
    });

    return Response.json({
      status: 'success',
      inactive_agents_nudged: inactiveAgents.length,
      threshold_hours: thresholdHours,
      agents: inactiveAgents.map(a => ({ id: a.id, name: a.name })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'monitorAgentInactivity',
      function_name: 'monitorAgentInactivity',
      status: 'error',
      message: errMsg,
      error_detail: errMsg,
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler',
    }).catch(() => {});
    return Response.json({ error: errMsg }, { status: 500 });
  }
});