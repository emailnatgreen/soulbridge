import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch recent audit logs to detect critical events
    const recentLogs = await base44.asServiceRole.entities.DidAuditLog.list('-created_date', 100);
    
    // Check for existing alerts to avoid duplicates
    const existingAlerts = await base44.asServiceRole.entities.DidHealthAlert.list('-created_date', 200);
    const existingEventIds = new Set(existingAlerts.map(a => a.triggered_by_event_id));

    const newAlerts = [];
    const ALERT_CONFIG = {
      did_revoked: {
        title: 'DID Revocation Detected',
        severity: 'critical',
        description: (event) => `DID ${event.did_classic_address?.slice(0, 8)}… was revoked`,
      },
      permission_revoked: {
        title: 'Critical Permission Removed',
        severity: 'critical',
        description: (event) => `Permission revoked for ${event.action_details?.action || 'unknown action'}`,
      },
      agent_unlinked: {
        title: 'Agent Unlinking',
        severity: 'high',
        description: (event) => `Agent unlinked from DID ${event.did_classic_address?.slice(0, 8)}…`,
      },
      version_created: {
        title: 'Unexpected DID Document Version',
        severity: 'medium',
        description: (event) => `New version created for DID ${event.did_classic_address?.slice(0, 8)}…`,
        condition: (event) => !event.user_email || event.user_email.includes('system'),
      },
    };

    for (const event of recentLogs) {
      // Skip if already alerted
      if (existingEventIds.has(event.id)) continue;

      const config = ALERT_CONFIG[event.action_type];
      if (!config) continue;

      // Apply optional condition
      if (config.condition && !config.condition(event)) continue;

      // Get related agents (owner + linked agents)
      let agentIds = [];
      if (event.agent_id) {
        agentIds.push(event.agent_id);
      }
      
      // Find agents linked to this DID
      if (event.did_classic_address) {
        const permissions = await base44.asServiceRole.entities.DidPermission.filter(
          { did_classic_address: event.did_classic_address, status: 'active' }
        );
        agentIds.push(...permissions.map(p => p.agent_id).filter(Boolean));
      }

      newAlerts.push({
        did_classic_address: event.did_classic_address,
        wallet_id: event.wallet_id,
        alert_type: event.action_type,
        severity: config.severity,
        title: config.title,
        description: config.description(event),
        triggered_by_event_id: event.id,
        notified_agent_ids: [...new Set(agentIds)],
        status: 'active',
        metadata: {
          action_details: event.action_details,
          user_email: event.user_email,
          ip_address: event.ip_address,
        },
      });
    }

    // Create all new alerts
    if (newAlerts.length > 0) {
      await base44.asServiceRole.entities.DidHealthAlert.bulkCreate(newAlerts);
    }

    return Response.json({
      success: true,
      alertsCreated: newAlerts.length,
      alerts: newAlerts.map(a => ({ title: a.title, severity: a.severity })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});