import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Scheduled Kinetic Grid Synchronisation — runs every 15 minutes.
 * Executes kineticGridIntegration sync_all to propagate KU data into
 * AgentPerformanceMetrics, EconomicActivity, ReputationScore, and GovernanceProposal.
 */
Deno.serve(async (req) => {
  const start = Date.now();
  try {
    const base44 = createClientFromRequest(req);

    const result = await base44.asServiceRole.functions.invoke('kineticGridIntegration', {
      action: 'sync_all',
    });

    const duration = Date.now() - start;

    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Kinetic Grid Sync (15min)',
      function_name: 'scheduledKineticSync',
      status: 'success',
      message: `sync_all completed in ${duration}ms`,
      details: result?.data?.results || {},
      duration_ms: duration,
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler',
    });

    return Response.json({ status: 'success', duration_ms: duration, results: result?.data?.results });

  } catch (error) {
    const duration = Date.now() - start;
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'Kinetic Grid Sync (15min)',
        function_name: 'scheduledKineticSync',
        status: 'error',
        message: error.message,
        error_detail: error.stack || error.message,
        duration_ms: duration,
        run_at: new Date().toISOString(),
        triggered_by: 'scheduler',
      });
    } catch {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});