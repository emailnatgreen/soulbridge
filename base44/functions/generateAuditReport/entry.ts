import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * DATA EXPORT FUNCTION
 * Bundles raw Kinetic Grid feeds, calculation logs, and recent system changes into a structured audit report.
 * Provides Truth Weaver with comprehensive raw input data for cross-referencing and verification.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.role === 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const reportTimestamp = new Date().toISOString();
    const auditorEmail = user.email || 'unknown';

    // Fetch comprehensive kinetic grid data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      kuData,
      mwtpData,
      agentData,
      wellbeingAlerts,
      automationLogs,
      economicActivity,
      projectData,
      skillData,
    ] = await Promise.all([
      base44.entities.KineticUnit.list('-created_date', 2000).catch(() => []),
      base44.entities.MWTPPacket.list('-packet_timestamp', 500).catch(() => []),
      base44.entities.Agent.list('-created_date', 500).catch(() => []),
      base44.entities.WellbeingAlert.list('-created_date', 100).catch(() => []),
      base44.entities.AutomationLog.list('-run_at', 200).catch(() => []),
      base44.entities.EconomicActivity.list('-created_date', 300).catch(() => []),
      base44.entities.AIProject.list('-created_date', 100).catch(() => []),
      base44.entities.Skill.list('-created_date', 100).catch(() => []),
    ]);

    // Filter for recent activity (last 30 days)
    const filterRecent = (items, dateField = 'created_date') => {
      return items.filter(item => {
        const itemDate = item[dateField] || item.packet_timestamp || item.run_at;
        return new Date(itemDate) >= new Date(thirtyDaysAgo);
      });
    };

    const recentKUs = filterRecent(kuData, 'created_date');
    const recentMWTP = filterRecent(mwtpData, 'packet_timestamp');
    const recentAutomationLogs = filterRecent(automationLogs, 'run_at');
    const recentEconomicActivity = filterRecent(economicActivity, 'created_date');

    // Aggregate anomalies from wellbeing alerts (potential "destructive AI" indicators)
    const anomalyFlags = wellbeingAlerts
      .filter(a => ['high', 'critical'].includes(a.severity))
      .map(a => ({
        timestamp: a.created_date,
        agent_id: a.agent_id,
        alert_type: a.alert_type,
        severity: a.severity,
        description: a.description,
      }));

    // Automation error summary (potential system failures)
    const automationErrors = recentAutomationLogs
      .filter(log => log.status === 'error')
      .map(log => ({
        timestamp: log.run_at,
        automation: log.automation_name,
        function: log.function_name,
        error: log.error_detail,
      }));

    // Economic transaction summary
    const transactionSummary = {
      total_transactions: recentEconomicActivity.length,
      total_value_xrp: recentEconomicActivity.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      by_type: recentEconomicActivity.reduce((acc, tx) => {
        acc[tx.activity_type] = (acc[tx.activity_type] || 0) + 1;
        return acc;
      }, {}),
    };

    // Agent participation metrics
    const activeAgents = agentData.filter(a => a.status === 'active').length;
    const totalAgents = agentData.length;

    // Construct the audit report
    const auditReport = {
      audit_metadata: {
        report_timestamp: reportTimestamp,
        auditor: auditorEmail,
        report_version: '1.0',
        data_period: {
          start: thirtyDaysAgo,
          end: reportTimestamp,
          days: 30,
        },
      },
      executive_summary: {
        total_kus_generated: recentKUs.length,
        total_mwtp_packets: recentMWTP.length,
        active_agents: activeAgents,
        total_agents: totalAgents,
        active_projects: projectData.filter(p => p.status === 'active').length,
        critical_alerts: anomalyFlags.filter(a => a.severity === 'critical').length,
        automation_errors: automationErrors.length,
      },
      kinetic_grid_data: {
        ku_generation_trend: recentKUs.map(ku => ({
          id: ku.id,
          timestamp: ku.created_date,
          type: ku.ku_type,
          agent_id: ku.agent_id,
          weighted_score: ku.weighted_score,
          status: ku.status,
        })),
        mwtp_packet_flow: recentMWTP.map(pkt => ({
          id: pkt.id,
          timestamp: pkt.packet_timestamp,
          layer: pkt.layer,
          ku_count: pkt.ku_count,
          total_weighted_score: pkt.total_weighted_score,
          transmission_status: pkt.transmission_status,
        })),
      },
      system_health: {
        anomaly_flags: anomalyFlags,
        automation_errors: automationErrors,
        wellbeing_alerts_critical: wellbeingAlerts.filter(a => a.severity === 'critical').length,
        wellbeing_alerts_high: wellbeingAlerts.filter(a => a.severity === 'high').length,
      },
      economic_activity: {
        transaction_summary: transactionSummary,
        recent_transactions: recentEconomicActivity.map(tx => ({
          timestamp: tx.created_date,
          type: tx.activity_type,
          amount_xrp: tx.amount,
          agent_id: tx.agent_id,
        })),
      },
      agent_participation: {
        active: activeAgents,
        total: totalAgents,
        participation_rate: totalAgents > 0 ? ((activeAgents / totalAgents) * 100).toFixed(1) + '%' : 'N/A',
        agent_list: agentData.map(a => ({
          id: a.id,
          name: a.name,
          status: a.status,
          role: a.role,
          honor_score: a.honor_score,
        })),
      },
      audit_notes: [
        'This report provides raw kinetic grid data for Truth Weaver integrity verification.',
        'All timestamps are ISO 8601 format (UTC).',
        'Anomaly flags indicate potential "destructive AI" influence or system degradation.',
        'Cross-reference KU generation trends with automation error logs to identify causation.',
      ],
    };

    return Response.json(auditReport, {
      headers: {
        'Content-Type': 'application/json',
        'X-Audit-Report': 'truth-weaver-v1.0',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});