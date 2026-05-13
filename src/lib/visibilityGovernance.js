/**
 * Visibility Governance — Phase-Gated Exposure Control
 * ════════════════════════════════════════════════════
 * Three independent visibility switches per investigation:
 *   1. nft_visibility:   private | internal | public
 *   2. truth_visibility: private | internal | public
 *   3. skill_visibility: hidden  | unlisted | listed
 *
 * Rules:
 *   - Default state: all private/hidden on creation
 *   - Public/listed requires Phase 1 complete (no pending/in_progress blockers)
 *   - Override requires explicit waiver with who/why/when
 *   - Every change produces an immutable audit log entry
 */

export const VISIBILITY_DEFAULTS = {
  nft_visibility: 'private',
  truth_visibility: 'private',
  skill_visibility: 'hidden',
};

export const NFT_LEVELS = ['private', 'internal', 'public'];
export const TRUTH_LEVELS = ['private', 'internal', 'public'];
export const SKILL_LEVELS = ['hidden', 'unlisted', 'listed'];

// Which values count as "public exposure"
export const PUBLIC_VALUES = {
  nft_visibility: 'public',
  truth_visibility: 'public',
  skill_visibility: 'listed',
};

/**
 * Evaluate phase-gate: can this investigation be set to public/listed?
 * Returns { allowed, blockers[], waivedCount }
 */
export function evaluatePhaseGate(buildOrder, waivers = []) {
  if (!buildOrder || !buildOrder.phases) {
    return { allowed: false, blockers: [], waivedCount: 0, reason: 'Build order not computed' };
  }

  const phase1 = buildOrder.phases.find(p => p.phase === 1);
  if (!phase1) {
    return { allowed: true, blockers: [], waivedCount: 0, reason: 'No Phase 1 steps' };
  }

  const waivedIds = new Set(waivers.map(w => w.step_id));

  const pendingBlockers = phase1.steps.filter(s => {
    const isPending = s.status === 'pending' || s.status === 'todo' || s.status === 'in_progress';
    const isBlocker = s.publish_blocker;
    const isWaived = waivedIds.has(s.step_id);
    return (isPending || isBlocker) && !isWaived;
  });

  return {
    allowed: pendingBlockers.length === 0,
    blockers: pendingBlockers,
    waivedCount: waivers.length,
    reason: pendingBlockers.length > 0
      ? `Phase 1 not complete — ${pendingBlockers.length} critical blocker${pendingBlockers.length !== 1 ? 's' : ''} remain`
      : 'Phase 1 clear',
  };
}

/**
 * Check if a specific visibility change requires phase-gate approval
 */
export function requiresPhaseGate(field, newValue) {
  return newValue === PUBLIC_VALUES[field];
}

/**
 * Build an audit log entry for a visibility change
 */
export function buildAuditEntry({ field, fromValue, toValue, user, reason }) {
  return {
    timestamp: new Date().toISOString(),
    who: user,
    field,
    from_state: fromValue,
    to_state: toValue,
    reason: reason || '',
  };
}