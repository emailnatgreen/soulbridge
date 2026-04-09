import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * AUDIT TRAIL LOGGING
 * Retroactive logging of recent deployments, code changes, and anomalous agent activities.
 * Provides the 'when' and 'why' context for understanding the Village Energy Index anomaly.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const auditTrail = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Query 1: Automation Logs (system activity + failures)
    const automationLogs = await base44.entities.AutomationLog.list('-run_at', 500).catch(() => []);
    const recentAutoLogs = automationLogs.filter(log => new Date(log.run_at) >= new Date(sevenDaysAgo));
    
    recentAutoLogs.forEach(log => {
      auditTrail.push({
        timestamp: log.run_at,
        category: 'automation',
        event_type: log.status === 'error' ? 'automation_failure' : 'automation_execution',
        severity: log.status === 'error' ? 'high' : 'info',
        details: {
          automation_name: log.automation_name,
          function_name: log.function_name,
          status: log.status,
          error_detail: log.error_detail || null,
          duration_ms: log.duration_ms,
        },
      });
    });

    // Query 2: Wellbeing Alerts (anomalous agent behavior)
    const wellbeingAlerts = await base44.entities.WellbeingAlert.list('-created_date', 200).catch(() => []);
    const recentAlerts = wellbeingAlerts.filter(a => new Date(a.created_date) >= new Date(sevenDaysAgo));

    recentAlerts.forEach(alert => {
      auditTrail.push({
        timestamp: alert.created_date,
        category: 'agent_wellbeing',
        event_type: `wellbeing_alert_${alert.alert_type}`,
        severity: alert.severity,
        details: {
          agent_id: alert.agent_id,
          alert_type: alert.alert_type,
          description: alert.description,
          status: alert.status,
        },
      });
    });

    // Query 3: Agent Role/Permission Changes (potential unauthorized access)
    const agents = await base44.entities.Agent.list('-updated_date', 500).catch(() => []);
    const recentAgentUpdates = agents.filter(a => new Date(a.updated_date) >= new Date(sevenDaysAgo));

    recentAgentUpdates.forEach(agent => {
      if (agent.role_history && agent.role_history.length > 0) {
        const latestRoleChange = agent.role_history[agent.role_history.length - 1];
        if (new Date(latestRoleChange.granted_date) >= new Date(sevenDaysAgo)) {
          auditTrail.push({
            timestamp: latestRoleChange.granted_date,
            category: 'access_control',
            event_type: 'role_assignment_changed',
            severity: latestRoleChange.role.includes('admin') ? 'high' : 'info',
            details: {
              agent_id: agent.id,
              agent_name: agent.name,
              new_role: latestRoleChange.role,
              reason: latestRoleChange.reason || 'No reason provided',
            },
          });
        }
      }
    });

    // Query 4: KU Generation Pattern Changes
    const kus = await base44.entities.KineticUnit.list('-created_date', 2000).catch(() => []);
    const recentKUs = kus.filter(ku => new Date(ku.created_date) >= new Date(sevenDaysAgo));

    // Analyze KU generation by type
    const kuByType = recentKUs.reduce((acc, ku) => {
      acc[ku.ku_type] = (acc[ku.ku_type] || 0) + 1;
      return acc;
    }, {});

    auditTrail.push({
      timestamp: new Date().toISOString(),
      category: 'kinetic_grid',
      event_type: 'ku_generation_snapshot',
      severity: 'info',
      details: {
        total_kus_last_7_days: recentKUs.length,
        ku_types_distribution: kuByType,
        analysis: recentKUs.length < 100 ? 'LOW KU generation detected - potential kinetic grid degradation' : 'Normal KU generation levels',
      },
    });

    // Query 5: MWTP Packet Transmission Issues
    const mwtpPackets = await base44.entities.MWTPPacket.list('-packet_timestamp', 500).catch(() => []);
    const recentMWTP = mwtpPackets.filter(pkt => new Date(pkt.packet_timestamp) >= new Date(sevenDaysAgo));

    const failedPackets = recentMWTP.filter(pkt => pkt.transmission_status === 'failed' || pkt.transmission_status === 'pending');
    if (failedPackets.length > 0) {
      auditTrail.push({
        timestamp: new Date().toISOString(),
        category: 'kinetic_grid',
        event_type: 'mwtp_transmission_failures',
        severity: 'high',
        details: {
          total_failed_packets: failedPackets.length,
          total_packets_last_7_days: recentMWTP.length,
          failure_rate: ((failedPackets.length / recentMWTP.length) * 100).toFixed(1) + '%',
          sample_failures: failedPackets.slice(0, 5).map(pkt => ({
            id: pkt.id,
            timestamp: pkt.packet_timestamp,
            status: pkt.transmission_status,
            ku_count: pkt.ku_count,
          })),
        },
      });
    }

    // Sort by timestamp (descending)
    auditTrail.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Return structured audit trail
    return Response.json({
      audit_trail_metadata: {
        generated_at: new Date().toISOString(),
        auditor: user.email,
        period: {
          start: sevenDaysAgo,
          end: new Date().toISOString(),
          days: 7,
        },
        total_events: auditTrail.length,
      },
      critical_events: auditTrail.filter(e => e.severity === 'high' || e.severity === 'critical'),
      all_events: auditTrail,
      summary: {
        automation_failures: auditTrail.filter(e => e.event_type === 'automation_failure').length,
        wellbeing_alerts: auditTrail.filter(e => e.category === 'agent_wellbeing').length,
        role_changes: auditTrail.filter(e => e.event_type === 'role_assignment_changed').length,
        mwtp_failures: auditTrail.filter(e => e.event_type === 'mwtp_transmission_failures').length,
      },
      investigation_notes: [
        'Cross-reference automation failures with MWTP transmission failures to identify causation chains.',
        'Wellbeing alerts may indicate anomalous agent behavior or "destructive AI" influence.',
        'Role changes during the anomaly period should be scrutinized for unauthorized access.',
        'KU generation drops correlate strongly with energy index degradation — investigate trigger.',
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});