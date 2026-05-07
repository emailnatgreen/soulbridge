import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Scheduled Node 8 Scan — Phase 3
 * 
 * Runs on a 5-minute schedule via automation.
 * Calls node8Injector actions using asServiceRole to bypass admin gate.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = { timestamp: new Date().toISOString(), steps: {} };

    // Step 1: Generate new recommendations
    try {
      const genResult = await base44.functions.invoke('node8Injector', { action: 'generate' });
      results.steps.generate = {
        success: true,
        threat_level: genResult.data?.threat_level,
        recommendations_created: genResult.data?.recommendations_created || 0,
        auto_eligible: genResult.data?.auto_eligible || 0,
      };
    } catch (e) {
      results.steps.generate = { success: false, error: e.message };
    }

    // Step 2: Auto-execute flag/warn past override window
    try {
      const autoResult = await base44.functions.invoke('node8Injector', { action: 'autoExecute' });
      results.steps.autoExecute = {
        success: true,
        processed: autoResult.data?.processed || 0,
        auto_executed_ids: autoResult.data?.auto_executed_ids || [],
      };
    } catch (e) {
      results.steps.autoExecute = { success: false, error: e.message };
    }

    // Step 3: Check escalations
    try {
      const escResult = await base44.functions.invoke('node8Injector', { action: 'escalate' });
      results.steps.escalate = {
        success: true,
        checked: escResult.data?.checked || 0,
        escalated: escResult.data?.escalated || 0,
      };
    } catch (e) {
      results.steps.escalate = { success: false, error: e.message };
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    console.error('[scheduledNode8Scan]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});