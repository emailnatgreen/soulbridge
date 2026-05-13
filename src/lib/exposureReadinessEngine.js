/**
 * Exposure Readiness Engine (ERE) — Deterministic Governance Intelligence
 * ═══════════════════════════════════════════════════════════════════════
 * Middle-pillar balancing mechanism between:
 *   - Severity Pillar (Truth Engine, Tests, Build Order Engine)
 *   - Mercy Pillar (public visibility, listing, publishing)
 *
 * Consumes: Phase 1 state, weight distribution, contradictions, risks,
 *           Leaf 7 visibility rec, waivers, audit history
 * Outputs:  exposure_ready (boolean) + structured explanation
 *
 * Rules:
 *   - Non-LLM, deterministic, non-overridable (except via explicit waiver)
 *   - Runs automatically on any state change
 *   - Same inputs → same output, every time
 */

/**
 * evaluateExposureReadiness(leaves, buildOrder, waivers, auditLog)
 * → ExposureReadinessResult
 *
 * Pure function. No side effects. Re-runnable.
 */
export function evaluateExposureReadiness(leaves, buildOrder, waivers = [], auditLog = []) {
  const blocking_reasons = [];
  const waiver_reasons = [];
  let waiver_required = false;

  const risks = leaves?.risk_impact || [];
  const contradictions = leaves?.contradictions || [];
  const synthesis = leaves?.synthesis || {};
  const metrics = leaves ? {
    total_risks: risks.length,
    critical_risks: risks.filter(r => r.severity === 'critical').length,
    high_risks: risks.filter(r => r.severity === 'high').length,
    contradictions_found: contradictions.length,
    integrity_flags: contradictions.filter(c => c.integrity_flag).length,
  } : {};

  const waivedIds = new Set(waivers.map(w => w.step_id));

  // ═══ Criterion 1: Phase 1 must be complete or waived ═══
  let phase_status = 'no_build_order';
  let phase1_total = 0;
  let phase1_pending = 0;
  let phase1_done = 0;
  let phase1_waived = 0;

  if (buildOrder && buildOrder.phases) {
    const phase1 = buildOrder.phases.find(p => p.phase === 1);
    if (phase1) {
      phase1_total = phase1.steps.length;
      phase1.steps.forEach(s => {
        if (waivedIds.has(s.step_id)) {
          phase1_waived++;
        } else if (s.status === 'done' || s.status === 'complete') {
          phase1_done++;
        } else {
          phase1_pending++;
        }
      });

      if (phase1_pending > 0) {
        phase_status = 'incomplete';
        blocking_reasons.push({
          criterion: 'phase_1_completion',
          message: `Phase 1 has ${phase1_pending} unresolved step${phase1_pending !== 1 ? 's' : ''} (of ${phase1_total} total)`,
          count: phase1_pending,
        });
      } else {
        phase_status = phase1_waived > 0 ? 'waived' : 'complete';
      }
    } else {
      phase_status = 'no_phase_1';
    }
  } else {
    blocking_reasons.push({
      criterion: 'phase_1_completion',
      message: 'Build order not computed — cannot verify Phase 1 status',
      count: 0,
    });
  }

  // ═══ Criterion 2: No unaddressed critical risks ═══
  const criticalUnaddressed = risks.filter(
    r => (r.risk_score >= 8 || r.severity === 'critical') && r.status !== 'resolved' && r.status !== 'done'
  );
  if (criticalUnaddressed.length > 0) {
    blocking_reasons.push({
      criterion: 'critical_risks',
      message: `${criticalUnaddressed.length} critical risk${criticalUnaddressed.length !== 1 ? 's' : ''} unaddressed (risk_score ≥ 8 or severity = critical)`,
      count: criticalUnaddressed.length,
      items: criticalUnaddressed.map(r => r.title || r.description),
    });
  }

  // ═══ Criterion 3: No unresolved contradictions with integrity flags ═══
  const unresolvedIntegrity = contradictions.filter(c => c.integrity_flag);
  if (unresolvedIntegrity.length > 0) {
    blocking_reasons.push({
      criterion: 'contradictions',
      message: `${unresolvedIntegrity.length} integrity flag${unresolvedIntegrity.length !== 1 ? 's' : ''} present in contradictions`,
      count: unresolvedIntegrity.length,
      items: unresolvedIntegrity.map(c => c.title || c.description),
    });
  }

  // ═══ Criterion 4: Weight distribution must be stable ═══
  const weightDist = {
    critical: 0, high: 0, medium: 0, low: 0,
  };
  risks.forEach(r => { if (r.weight_category) weightDist[r.weight_category]++; });
  const actions = leaves?.proposed_actions || [];
  actions.forEach(a => { if (a.weight_category) weightDist[a.weight_category]++; });

  if (weightDist.critical > 0) {
    blocking_reasons.push({
      criterion: 'weight_stability',
      message: `${weightDist.critical} critical-weight item${weightDist.critical !== 1 ? 's' : ''} remain — weight distribution unstable`,
      count: weightDist.critical,
    });
  }

  // ═══ Criterion 5: Leaf 7 visibility recommendation ═══
  const visRec = (synthesis.visibility_recommendation || 'private').toLowerCase();
  const recommended_visibility = visRec;

  if (visRec === 'private') {
    waiver_required = true;
    waiver_reasons.push({
      criterion: 'visibility_recommendation',
      message: `Leaf 7 recommends "private" — ${synthesis.visibility_reason || 'no reason given'}`,
    });
  }

  // ═══ Final determination ═══
  const exposure_ready = blocking_reasons.length === 0;

  return {
    exposure_ready,
    blocking_reasons,
    phase_status: {
      state: phase_status,
      total: phase1_total,
      pending: phase1_pending,
      done: phase1_done,
      waived: phase1_waived,
    },
    risk_summary: {
      total: risks.length,
      critical: criticalUnaddressed.length,
      high: risks.filter(r => r.severity === 'high').length,
      medium: risks.filter(r => r.severity === 'medium').length,
      low: risks.filter(r => r.severity === 'low').length,
    },
    contradiction_summary: {
      total: contradictions.length,
      integrity_flags: unresolvedIntegrity.length,
    },
    weight_distribution: weightDist,
    recommended_visibility,
    waiver_required,
    waiver_reasons,
    audit_entries: auditLog.length,
  };
}

/**
 * Get readiness badge state: 'ready' | 'waiver' | 'blocked'
 */
export function getReadinessBadgeState(result) {
  if (!result) return 'blocked';
  if (result.exposure_ready && !result.waiver_required) return 'ready';
  if (result.exposure_ready && result.waiver_required) return 'waiver';
  return 'blocked';
}