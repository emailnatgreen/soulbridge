/**
 * Phase‑1 Completion Gate — Hard Lock (Severity Pillar)
 * ═════════════════════════════════════════════════════
 * The uncompromising left-pillar mechanism that ensures the system
 * cannot lie to itself. No public exposure until structurally sound.
 *
 * Sits between:
 *   Build Order Engine (what must be done)  →  THIS  →  ERE (is it safe)
 *
 * Evaluates 5 hard criteria:
 *   1. All Phase 1 steps done or waived
 *   2. No unwaived publish blockers
 *   3. No critical risks (risk ≥ 8 OR impact ≥ 8)
 *   4. No contradictions or integrity flags
 *   5. Weight distribution stable (critical = 0)
 *
 * Outputs: phase1_gate_open (boolean) + structured breakdown
 *
 * Rules:
 *   - Deterministic, non-LLM, pure function
 *   - Same inputs → same output, every time
 *   - Cannot be overridden without explicit waiver (who/why/when)
 */

/**
 * evaluatePhase1Gate(leaves, buildOrder, waivers)
 * → Phase1GateResult
 *
 * Pure function. No side effects. Re-runnable.
 */
export function evaluatePhase1Gate(leaves, buildOrder, waivers = []) {
  const blocking_items = [];
  const waiver_log = [];

  const waivedIds = new Set(waivers.map(w => w.step_id));

  // ═══ 2.1  All Phase 1 steps must be done or waived ═══
  let phase1_total = 0;
  let phase1_pending = 0;
  let phase1_done = 0;
  let phase1_waived = 0;
  let phase1_in_progress = 0;

  if (buildOrder && buildOrder.phases) {
    const phase1 = buildOrder.phases.find(p => p.phase === 1);
    if (phase1) {
      phase1_total = phase1.steps.length;
      phase1.steps.forEach(s => {
        if (waivedIds.has(s.step_id)) {
          phase1_waived++;
          waiver_log.push({
            step_id: s.step_id,
            title: s.title,
            waiver: waivers.find(w => w.step_id === s.step_id),
          });
        } else if (s.status === 'done' || s.status === 'complete') {
          phase1_done++;
        } else if (s.status === 'in_progress') {
          phase1_in_progress++;
          blocking_items.push({
            criterion: 'phase1_steps',
            step_id: s.step_id,
            title: s.title,
            status: s.status,
            message: `Step "${s.title}" is in_progress — must be done or waived`,
          });
        } else {
          phase1_pending++;
          blocking_items.push({
            criterion: 'phase1_steps',
            step_id: s.step_id,
            title: s.title,
            status: s.status || 'todo',
            message: `Step "${s.title}" is ${s.status || 'todo'} — must be done or waived`,
          });
        }
      });
    }
  }

  // ═══ 2.2  No unwaived publish blockers ═══
  let blocker_total = 0;
  let blocker_unwaived = 0;

  if (buildOrder && buildOrder.phases) {
    buildOrder.phases.forEach(p => {
      p.steps.forEach(s => {
        if (s.publish_blocker) {
          blocker_total++;
          if (!waivedIds.has(s.step_id) && s.status !== 'done' && s.status !== 'complete') {
            blocker_unwaived++;
            // Only add if not already listed from criterion 2.1
            const alreadyListed = blocking_items.some(b => b.step_id === s.step_id);
            if (!alreadyListed) {
              blocking_items.push({
                criterion: 'publish_blockers',
                step_id: s.step_id,
                title: s.title,
                status: s.status,
                message: `Publish blocker "${s.title}" unresolved and unwaived`,
              });
            }
          }
        }
      });
    });
  }

  // ═══ 2.3  No critical risks (risk ≥ 8 OR impact ≥ 8) ═══
  const risks = leaves?.risk_impact || [];
  const criticalRisks = risks.filter(
    r => ((r.risk_score || 0) >= 8 || (r.impact_score || 0) >= 8 || r.severity === 'critical')
      && r.status !== 'resolved' && r.status !== 'done'
  );

  criticalRisks.forEach(r => {
    blocking_items.push({
      criterion: 'critical_risks',
      title: r.title || r.description,
      risk_score: r.risk_score,
      impact_score: r.impact_score,
      severity: r.severity,
      message: `Critical risk: "${r.title || r.description}" (risk=${r.risk_score || '?'}, impact=${r.impact_score || '?'})`,
    });
  });

  // ═══ 2.4  No contradictions or integrity flags ═══
  const contradictions = leaves?.contradictions || [];
  const integrityFlags = contradictions.filter(c => c.integrity_flag);

  if (contradictions.length > 0) {
    blocking_items.push({
      criterion: 'contradictions',
      count: contradictions.length,
      integrity_count: integrityFlags.length,
      message: `${contradictions.length} contradiction${contradictions.length !== 1 ? 's' : ''} found (${integrityFlags.length} integrity flag${integrityFlags.length !== 1 ? 's' : ''})`,
      items: contradictions.map(c => c.title || c.description),
    });
  }

  // ═══ 2.5  Weight distribution must be stable ═══
  const weightDist = { critical: 0, high: 0, medium: 0, low: 0 };
  risks.forEach(r => { if (r.weight_category) weightDist[r.weight_category]++; });
  const actions = leaves?.proposed_actions || [];
  actions.forEach(a => { if (a.weight_category) weightDist[a.weight_category]++; });

  if (weightDist.critical > 0) {
    blocking_items.push({
      criterion: 'weight_stability',
      count: weightDist.critical,
      message: `${weightDist.critical} critical-weight item${weightDist.critical !== 1 ? 's' : ''} — distribution unstable`,
    });
  }

  // ═══ Determine waiver necessity ═══
  const waiver_required = blocking_items.length > 0;
  const waiver_reasons = blocking_items.map(b => ({
    criterion: b.criterion,
    message: b.message,
  }));

  // ═══ Final determination ═══
  const phase1_gate_open = blocking_items.length === 0;

  return {
    phase1_gate_open,
    blocking_items,
    waiver_required,
    waiver_reasons,
    phase1_summary: {
      total: phase1_total,
      done: phase1_done,
      in_progress: phase1_in_progress,
      pending: phase1_pending,
      waived: phase1_waived,
    },
    blocker_summary: {
      total: blocker_total,
      unwaived: blocker_unwaived,
    },
    risk_summary: {
      total: risks.length,
      critical: criticalRisks.length,
    },
    contradiction_summary: {
      total: contradictions.length,
      integrity_flags: integrityFlags.length,
    },
    weight_summary: weightDist,
    waiver_log,
  };
}

/**
 * Get gate badge state: 'open' | 'overridden' | 'closed'
 */
export function getGateBadgeState(result) {
  if (!result) return 'closed';
  if (result.phase1_gate_open && result.waiver_log.length === 0) return 'open';
  if (result.phase1_gate_open && result.waiver_log.length > 0) return 'overridden';
  return 'closed';
}