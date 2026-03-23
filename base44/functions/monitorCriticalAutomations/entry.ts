import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const AXI_AGENT_ID = "6993271e7dc0fa2ab78762bf"; // Axi's Agent ID

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);

    const startTime = Date.now();
    let lastRunTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // Default to 5 minutes ago

    // Try to get the timestamp of the last successful run of this automation
    try {
      const lastSuccessfulRun = await base44.asServiceRole.entities.AutomationLog.filter(
        { automation_name: 'Monitor Critical Automations', status: 'success' },
        '-run_at',
        1
      );
      if (lastSuccessfulRun && lastSuccessfulRun.length > 0) {
        lastRunTimestamp = lastSuccessfulRun[0].run_at;
      }
    } catch (logErr) {
      console.warn(`[monitorCriticalAutomations] Could not retrieve last successful run timestamp: ${logErr.message}`);
    }

    // Query AutomationLog for errors/warnings since last run
    const criticalLogs = await base44.asServiceRole.entities.AutomationLog.filter(
      { status: { "$in": ["error", "warning"] }, run_at: { "$gt": lastRunTimestamp } },
      'run_at',
      100
    );

    const processedAlerts = [];
    for (const log_entry of criticalLogs) {
      try {
        const automation_name = log_entry.automation_name;
        const function_name = log_entry.function_name;
        const status = log_entry.status;
        const message = log_entry.message;
        const error_detail = log_entry.error_detail;
        const log_id = log_entry.id;
        const log_timestamp = log_entry.run_at;

        const alert_message = `Critical Automation Alert: ${automation_name} (${function_name}) reported ${status} at ${log_timestamp}.\nMessage: ${message}\nDetails: ${error_detail}`;
        
        // 1. Create a Memory entry for Axi
        await base44.asServiceRole.entities.Memory.create({
          agent_id: AXI_AGENT_ID,
          type: "observation",
          content: alert_message,
          context: `AutomationLog ID: ${log_id}`,
          importance: 9,
          keywords: ["system_alert", "automation_error", automation_name, status],
          related_entity_id: log_id,
          related_entity_type: "AutomationLog"
        });

        // 2. Create an AgentNotification for Axi
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: AXI_AGENT_ID,
          notification_type: "system",
          priority: status === "error" ? "urgent" : "high",
          title: `System Alert: ${automation_name} ${status.toUpperCase()}`,
          message: alert_message,
          related_entity_id: log_id,
          related_entity_type: "AutomationLog",
          sender_agent_id: AXI_AGENT_ID
        });

        processedAlerts.push({ log_id, status: "success" });
      } catch (innerError) {
        console.error(`[monitorCriticalAutomations] Error creating alert for log ${log_entry.id}: ${innerError.message}`);
        processedAlerts.push({ log_id: log_entry.id, status: "error", error: innerError.message });
      }
    }

    const duration = Date.now() - startTime;
    const status = processedAlerts.some(alert => alert.status === "error") ? "warning" : "success";
    const message = `Checked for critical automation logs. Found ${criticalLogs.length} new critical logs. Processed ${processedAlerts.length} alerts.`;

    // Log its own completion to AutomationLog
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Monitor Critical Automations',
      function_name: 'monitorCriticalAutomations',
      status: status,
      message: message,
      details: {
        checked_until: new Date().toISOString(),
        critical_logs_found: criticalLogs.length,
        alerts_processed: processedAlerts.length,
        processing_errors: processedAlerts.filter(alert => alert.status === "error").length,
        processed_logs_details: processedAlerts
      },
      duration_ms: duration,
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler'
    });

    return Response.json({ success: true, message, criticalLogsFound: criticalLogs.length, alertsProcessed: processedAlerts.length });

  } catch (error) {
    console.error('[monitorCriticalAutomations] Fatal error:', error.message, error.stack);
    if (base44) {
      try {
        await base44.asServiceRole.entities.AutomationLog.create({
          automation_name: 'Monitor Critical Automations',
          function_name: 'monitorCriticalAutomations',
          status: 'error',
          message: `Fatal error: ${error.message}`,
          error_detail: error.stack,
          run_at: new Date().toISOString(),
          triggered_by: 'scheduler'
        });
      } catch (logError) {
        console.error('[monitorCriticalAutomations] Failed to log fatal error:', logError.message);
      }
    }
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});