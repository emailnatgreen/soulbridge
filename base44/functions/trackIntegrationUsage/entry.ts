import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();

    const {
      integration_type = 'other',
      service_name = 'unknown',
      credits_consumed = 1,
      triggered_by = 'user_action',
      function_name,
      model_used,
      response_time_ms,
      success = true,
      error_message,
      metadata,
      cost_estimate_usd
    } = payload;

    // Validate required fields
    if (!integration_type || !service_name) {
      return Response.json({ error: 'Missing required fields: integration_type, service_name' }, { status: 400 });
    }

    // Create usage log entry
    const logEntry = await base44.entities.IntegrationUsageLog.create({
      integration_type,
      service_name,
      credits_consumed,
      triggered_by,
      user_email: user.email,
      function_name,
      model_used,
      response_time_ms,
      success,
      error_message,
      metadata,
      cost_estimate_usd: cost_estimate_usd || (credits_consumed * 0.01)
    });

    // Check if usage exceeds budget
    const settings = await base44.entities.IntegrationCreditSettings.list();
    const setting = settings[0];

    if (setting) {
      // Get this month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyLogs = await base44.entities.IntegrationUsageLog.filter({
        created_date: { $gte: startOfMonth.toISOString() }
      });

      const totalUsed = monthlyLogs.reduce((sum, log) => sum + (log.credits_consumed || 0), 0);
      const usagePercent = Math.round((totalUsed / (setting.monthly_budget_credits || 1000)) * 100);

      // Return usage status
      return Response.json({
        success: true,
        logEntry,
        currentUsagePercent: usagePercent,
        totalUsedThisMonth: totalUsed,
        budget: setting.monthly_budget_credits,
        remaining: Math.max(0, setting.monthly_budget_credits - totalUsed),
        thresholdWarning: usagePercent >= (setting.alert_threshold_percent || 80),
        thresholdCritical: usagePercent >= (setting.critical_threshold_percent || 95)
      });
    }

    return Response.json({
      success: true,
      logEntry
    });
  } catch (error) {
    console.error('trackIntegrationUsage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});