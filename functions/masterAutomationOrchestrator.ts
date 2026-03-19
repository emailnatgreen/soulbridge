import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Master automation orchestrator
 * Runs all critical automations in sequence and logs results
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

    // List of critical automations to orchestrate
    const automationFunctions = [
      'processPageSignalToMemory',
      'autoCreateVillagePageForReport',
      'autoDraftGovernanceProposal',
      'aggregateDashboardData',
      'detectAnomalyComprehensive',
      'detectAnomalyAndOutreach'
    ];

    // Get all Signals that need processing
    let signals = [];
    try {
      signals = await base44.asServiceRole.entities.Signal.list('-updated_date', 100);
    } catch (err) {
      console.warn('Failed to fetch signals:', err.message);
    }

    // Process each signal through applicable automations
    for (const signal of signals) {
      for (const funcName of automationFunctions) {
        if (funcName === 'aggregateDashboardData' || funcName === 'detectAnomalyComprehensive' || funcName === 'detectAnomalyAndOutreach') {
          continue; // Skip non-signal-dependent functions
        }

        try {
          const result = await base44.asServiceRole.functions.invoke(funcName, {
            signal: signal,
            event: { entity_id: signal.id, entity_name: 'Signal', type: 'update' },
            data: signal
          });
          
          results.executions.push({
            function: funcName,
            signal_id: signal.id,
            status: 'success',
            result: result.data
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
    for (const funcName of ['aggregateDashboardData', 'detectAnomalyComprehensive', 'detectAnomalyAndOutreach']) {
      try {
        const result = await base44.asServiceRole.functions.invoke(funcName, {});
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
      summary: `Executed ${results.executions.length} automation tasks: ${results.successes} succeeded, ${results.failures} failed`,
      results
    });
  } catch (error) {
    console.error('Master orchestrator error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});