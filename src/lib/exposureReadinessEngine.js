/**
 * Exposure Readiness Engine (ERE) — Deterministic Governance Intelligence
 * ═══════════════════════════════════════════════════════════════════════
 * Middle-pillar balancing mechanism between:
 *   - Severity Pillar (Truth Engine, Tests, Build Order Engine, Phase-1 Gate)
 *   - Mercy Pillar (public visibility, listing, publishing)
 *
 * Consumes: Phase-1 Gate result, Leaf 7 visibility rec, audit history
 * Outputs:  exposure_ready (boolean) + structured explanation
 *
 * Flow:  Build Order → Phase-1 Gate (hard lock) → ERE (readiness) → Governance
 *
 * Rules:
 *   - Non-LLM, deterministic, non-overridable (except via explicit waiver)
 *   - Runs automatically on any state change
 *   - Same inputs → same output, every time
 *   - Phase-1 Gate MUST pass before ERE can report ready
 */

import { evaluatePhase1Gate } from './phase1CompletionGate';

/**
 * evaluateExposureReadiness(leaves, buildOrder, waivers, auditLog)
 * → ExposureReadinessResult
 *
 * Pure function. No side effects. Re-runnable.
 * Now delegates criteria 1–4 to the Phase-1 Gate and layers criterion 5 on top.
 */
export function evaluateExposureReadiness(leaves, buildOrder, waivers = [], auditLog = []) {
  // ═══ Phase-1 Gate — hard lock (criteria 1–5 of gate spec) ═══
  const gateResult = evaluatePhase1Gate(leaves, buildOrder, waivers);

  const blocking_reasons = [];
  const waiver_reasons = [];
  let waiver_required = false;

  // Gate closed → ERE inherits all blockers
  if (!gateResult.phase1_gate_open) {
    blocking_reasons.push({
      criterion: 'phase1_gate',
      message: `Phase-1 Gate locked — ${gateResult.blocking_items.length} blocker${gateResult.blocking_items.length !== 1 ? 's' : ''} remain`,
      count: gateResult.blocking_items.length,
      gate_blockers: gateResult.blocking_items,
    });
  }

  // ═══ ERE Criterion: Leaf 7 visibility recommendation ═══
  const synthesis = leaves?.synthesis || {};
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
    // Carry forward gate summaries for the ERE panel
    phase1_gate: gateResult,
    phase_status: {
      state: gateResult.phase1_gate_open
        ? (gateResult.waiver_log.length > 0 ? 'waived' : 'complete')
        : (gateResult.phase1_summary.total === 0 ? 'no_build_order' : 'incomplete'),
      total: gateResult.phase1_summary.total,
      pending: gateResult.phase1_summary.pending + gateResult.phase1_summary.in_progress,
      done: gateResult.phase1_summary.done,
      waived: gateResult.phase1_summary.waived,
    },
    risk_summary: gateResult.risk_summary,
    contradiction_summary: gateResult.contradiction_summary,
    weight_distribution: gateResult.weight_summary,
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