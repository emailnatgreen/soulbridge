import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Master automation orchestrator
 * Runs critical automations in small batches to avoid timeouts
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = {
      timestamp: new Date().toISOString(),
      executions: [],
      successes: 0,
      failures: 0
    };

    // Get all Signals that need processing (limit to 20 per run)
    let signals = [];
    try {
      signals = await base44.asServiceRole.entities.Signal.list('-updated_date', 20);
    } catch (err) {
      console.warn('Failed to fetch signals:', err.message);
    }

    // Filter out signals that already have a corresponding VillagePage
    const processedPaths = new Set();
    try {
      const villagePages = await base44.asServiceRole.entities.VillagePage.list();
      villagePages.forEach(page => {
        if (page.metadata?.related_signal_id) {
          processedPaths.add(page.metadata.related_signal_id);
        }
      });
    } catch (err) {
      console.warn('Failed to fetch VillagePages:', err.message);
    }

    const unprocessedSignals = signals.filter(s => !processedPaths.has(s.id));

    // Process each signal through applicable automations
    for (const signal of unprocessedSignals) {
      const automationFunctions = [
        'processPageSignalToMemory',
        'autoCreateVillagePageForReport',
        'autoDraftGovernanceProposal'
      ];

      for (const funcName of automationFunctions) {
        try {
          const result = await base44.asServiceRole.functions.invoke(funcName, {
            signal_id: signal.id,
            event: { entity_id: signal.id, entity_name: 'Signal', type: 'update' },
            data: signal
          });
          
          results.executions.push({
            function: funcName,
            signal_id: signal.id,
            status: 'success'
          });
          results.successes++;
        } catch (err) {
          console.warn(`${funcName} failed for signal ${signal.id}:`, err.message);
          results.executions.push({
            function: funcName,
            signal_id: signal.id,
            status: 'failed',
            error: err.message
          });
          results.failures++;
        }
      }
    }

    // Run aggregate/detection automations
    const aggregateFunctions = ['aggregateDashboardData', 'detectAnomalyComprehensive', 'detectAnomalyAndOutreach'];
    for (const funcName of aggregateFunctions) {
      try {
        await base44.asServiceRole.functions.invoke(funcName, {});
        results.executions.push({
          function: funcName,
          status: 'success'
        });
        results.successes++;
      } catch (err) {
        console.warn(`${funcName} failed:`, err.message);
        results.executions.push({
          function: funcName,
          status: 'failed',
          error: err.message
        });
        results.failures++;
      }
    }

    console.log(`Master orchestrator complete: ${results.successes} successes, ${results.failures} failures`);

    return Response.json({
      success: true,
      summary: `Executed ${results.executions.length} tasks: ${results.successes} succeeded, ${results.failures} failed`,
      results
    });
  } catch (error) {
    console.error('Master orchestrator error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});