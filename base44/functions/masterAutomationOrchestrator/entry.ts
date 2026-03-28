import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Master Automation Gate-Keeper
 *
 * Runs at most 3 heavy functions concurrently.
 * Uses AutomationLog idempotency: skips any function that already succeeded
 * within its defined minimum interval.
 *
 * Groups (run sequentially within each group, groups fire in parallel up to limit=3):
 *   GROUP A — Kinetic:    kineticEnergyAlerts (min 25 min gap)
 *   GROUP B — Skill/Agent: automatedSkillGapAnalysis (min 22 hours gap)
 *   GROUP C — Governance:  monitorGovernanceCompliance (min 22 hours gap)
 */

const CONCURRENCY_LIMIT = 3;

const GATE_TASKS = [
  { fn: 'kineticEnergyAlerts',        minGapMs: 25 * 60 * 1000,       label: 'Kinetic Energy Alerts' },
  { fn: 'automatedSkillGapAnalysis',  minGapMs: 22 * 60 * 60 * 1000,  label: 'Skill Gap Analysis' },
  { fn: 'monitorGovernanceCompliance', minGapMs: 22 * 60 * 60 * 1000, label: 'Governance Compliance' },
];

async function shouldRun(db, functionName, minGapMs) {
  try {
    const logs = await db.entities.AutomationLog.filter(
      { function_name: functionName, status: 'success' },
      '-run_at',
      1
    );
    const arr = Array.isArray(logs) ? logs : [];
    if (arr.length === 0) return true; // never run — go for it
    const lastRunMs = new Date(arr[0].run_at).getTime();
    return Date.now() - lastRunMs >= minGapMs;
  } catch {
    return true; // if we can't check, allow run
  }
}

async function runTask(db, base44, task) {
  const run = await shouldRun(db, task.fn, task.minGapMs);
  if (!run) {
    return { fn: task.fn, status: 'skipped', reason: 'recently_ran' };
  }

  const start = Date.now();
  try {
    await base44.asServiceRole.functions.invoke(task.fn, {});
    const durationMs = Date.now() - start;

    await db.entities.AutomationLog.create({
      automation_name: `GateKeeper → ${task.label}`,
      function_name: task.fn,
      status: 'success',
      message: `Invoked by masterAutomationOrchestrator in ${durationMs}ms`,
      duration_ms: durationMs,
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler',
    });

    return { fn: task.fn, status: 'success', duration_ms: durationMs };
  } catch (err) {
    const errMsg = typeof err?.message === 'string' ? err.message : String(err);
    const durationMs = Date.now() - start;

    await db.entities.AutomationLog.create({
      automation_name: `GateKeeper → ${task.label}`,
      function_name: task.fn,
      status: 'error',
      message: errMsg,
      error_detail: errMsg,
      duration_ms: durationMs,
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler',
    }).catch(() => {});

    return { fn: task.fn, status: 'failed', error: errMsg, duration_ms: durationMs };
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  try {
    const now = new Date().toISOString();

    // Run up to CONCURRENCY_LIMIT tasks in parallel
    const batches = [];
    for (let i = 0; i < GATE_TASKS.length; i += CONCURRENCY_LIMIT) {
      batches.push(GATE_TASKS.slice(i, i + CONCURRENCY_LIMIT));
    }

    const results = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(task => runTask(db, base44, task))
      );
      results.push(...batchResults);
    }

    const successes = results.filter(r => r.status === 'success').length;
    const skipped   = results.filter(r => r.status === 'skipped').length;
    const failures  = results.filter(r => r.status === 'failed').length;

    return Response.json({
      success: true,
      summary: `Gate-keeper ran ${GATE_TASKS.length} tasks: ${successes} executed, ${skipped} skipped (idempotent), ${failures} failed`,
      concurrency_limit: CONCURRENCY_LIMIT,
      results,
      timestamp: now,
    });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    return Response.json({ error: errMsg }, { status: 500 });
  }
});