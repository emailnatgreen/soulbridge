/**
 * Build Order Engine — Pure Deterministic Orchestration
 * ═════════════════════════════════════════════════════
 * Consumes: L3 contradictions, L4 cross-links, L5 risk + weight, L6 actions, L7 synthesis
 * Outputs:  phased plan in strict order
 *
 * Contract:
 *   - DETERMINISTIC: same inputs → same ordering
 *   - NON-LLM: pure logic, no generation
 *   - NON-DESTRUCTIVE: never edits leaves, only reads them
 *   - RE-RUNNABLE: recompute after changes/tests
 *
 * Target:
 *   8 steps | 2 publish blockers | 3 tests required
 *   P1: 2 | P2: 3 | P3: 1 | P4: 2
 */

// ─── Type priority for ordering within a phase ───
const TYPE_ORDER = { node: 0, security: 1, governance: 2, agent: 3, logic: 4, ux: 5, general: 6 };

function typeRank(item) {
  const domain = (item.risk_domain || item.action_group || item.domain || item.target || 'general').toLowerCase();
  if (domain.includes('node') || domain.includes('integrity')) return TYPE_ORDER.node;
  if (domain.includes('secur')) return TYPE_ORDER.security;
  if (domain.includes('govern')) return TYPE_ORDER.governance;
  if (domain.includes('agent')) return TYPE_ORDER.agent;
  if (domain.includes('logic')) return TYPE_ORDER.logic;
  if (domain.includes('ux') || domain.includes('ui') || domain.includes('polish')) return TYPE_ORDER.ux;
  return TYPE_ORDER.general;
}

// ─── Sort steps within a phase ───
function sortSteps(steps) {
  const depended = new Set();
  steps.forEach(s => {
    if (s.dependencies && s.dependencies !== 'none') {
      String(s.dependencies).split(',').map(d => d.trim()).forEach(d => depended.add(d));
    }
  });

  return [...steps].sort((a, b) => {
    const aIsDepended = depended.has(a.step_id) ? 0 : 1;
    const bIsDepended = depended.has(b.step_id) ? 0 : 1;
    if (aIsDepended !== bIsDepended) return aIsDepended - bIsDepended;

    const wA = a.suggested_weight || 0;
    const wB = b.suggested_weight || 0;
    if (wB !== wA) return wB - wA;

    return typeRank(a) - typeRank(b);
  });
}

// ─── Step builder ───
let stepCounter = 0;
function makeStep(source, overrides = {}) {
  stepCounter++;
  return {
    step_id: overrides.step_id || `S${String(stepCounter).padStart(3, '0')}`,
    title: source.title || source.description || '',
    description: source.description || source.impact_description || '',
    phase: overrides.phase || 1,
    suggested_weight: source.suggested_weight || 0,
    weight_category: source.weight_category || 'medium',
    dependencies: source.dependencies || 'none',
    target: source.action_group || source.risk_domain || source.target || 'general',
    publish_blocker: overrides.publish_blocker || false,
    test_required: overrides.test_required || false,
    status: 'pending',
    source_leaf: overrides.source_leaf || 0,
    ...overrides,
  };
}

/**
 * computeBuildOrder(leaves) → { phases: [...], summary: {...} }
 * Pure function. No side effects. Re-runnable.
 */
export function computeBuildOrder(leaves) {
  if (!leaves) return { phases: [], summary: { total: 0, blockers: 0, tests_required: 0, by_phase: {} } };

  stepCounter = 0;

  const risks = leaves.risk_impact || [];
  const contradictions = leaves.contradictions || [];
  const actions = leaves.proposed_actions || [];
  const crossLinks = leaves.cross_links || [];
  const synthesis = leaves.synthesis || {};
  const visRec = (synthesis.visibility_recommendation || 'private').toLowerCase();

  // ═══ Phase 1 — Critical Fixes (target: 2 steps) ═══
  // Critical/high severity risks, integrity flags, critical weight actions
  const phase1 = [];

  risks.filter(r => r.severity === 'critical' || r.severity === 'high').forEach(r => {
    phase1.push(makeStep(r, {
      phase: 1,
      source_leaf: 5,
      publish_blocker: r.severity === 'critical',
      test_required: true,
    }));
  });

  contradictions.filter(c => c.integrity_flag).forEach(c => {
    phase1.push(makeStep({
      ...c,
      title: `[INTEGRITY] ${c.title || c.description}`,
      suggested_weight: Math.max(c.suggested_weight || 0, 16),
      weight_category: 'critical',
    }, {
      phase: 1,
      source_leaf: 3,
      publish_blocker: true,
      test_required: true,
    }));
  });

  actions.filter(a => a.weight_category === 'critical').forEach(a => {
    const alreadyCovered = phase1.some(s => s.title === a.title);
    if (!alreadyCovered) {
      phase1.push(makeStep(a, {
        phase: 1,
        source_leaf: 6,
        publish_blocker: true,
        test_required: true,
      }));
    }
  });

  // ═══ Phase 2 — Hardening (target: 3 steps) ═══
  // Non-integrity contradictions, medium risks, high-weight actions, cross-link issues
  const phase2 = [];

  // L6 actions with high weight first (e.g. Patch ERR_VAL_04)
  actions.filter(a => a.weight_category === 'high').forEach(a => {
    const alreadyCovered = phase1.some(s => s.title === a.title);
    if (!alreadyCovered) {
      phase2.push(makeStep(a, {
        phase: 2,
        source_leaf: 6,
        test_required: a.test_required || false,
      }));
    }
  });

  // L3 contradictions (non-integrity)
  contradictions.filter(c => !c.integrity_flag).forEach(c => {
    phase2.push(makeStep({
      ...c,
      suggested_weight: c.suggested_weight || (c.severity === 'high' ? 10 : 6),
      weight_category: c.severity === 'high' ? 'high' : 'medium',
    }, {
      phase: 2,
      source_leaf: 3,
      test_required: c.severity === 'high',
    }));
  });

  // L5 medium risks
  risks.filter(r => r.severity === 'medium').forEach(r => {
    phase2.push(makeStep(r, {
      phase: 2,
      source_leaf: 5,
      test_required: r.test_required || true,
    }));
  });

  // L4 cross-links that indicate gaps
  crossLinks.filter(cl => cl.severity === 'high' || cl.severity === 'medium').forEach(cl => {
    phase2.push(makeStep({
      ...cl,
      title: cl.title || `Cross-link: ${cl.description || ''}`,
      suggested_weight: cl.suggested_weight || 6,
      weight_category: cl.severity === 'high' ? 'high' : 'medium',
    }, {
      phase: 2,
      source_leaf: 4,
      test_required: cl.severity === 'high',
    }));
  });

  // ═══ Phase 3 — Optimisation / Clarity (target: 1 step) ═══
  // Medium-weight actions, low-severity risks, performance/polish
  const phase3 = [];

  actions.filter(a => a.weight_category === 'medium').forEach(a => {
    phase3.push(makeStep(a, {
      phase: 3,
      source_leaf: 6,
    }));
  });

  risks.filter(r => r.severity === 'low').forEach(r => {
    phase3.push(makeStep(r, {
      phase: 3,
      source_leaf: 5,
    }));
  });

  crossLinks.filter(cl => cl.severity === 'low').forEach(cl => {
    phase3.push(makeStep({
      ...cl,
      title: cl.title || `Cross-link: ${cl.description || ''}`,
      suggested_weight: cl.suggested_weight || 3,
      weight_category: 'medium',
    }, {
      phase: 3,
      source_leaf: 4,
    }));
  });

  // ═══ Phase 4 — Pre-publish Checks (target: 2 steps) ═══
  const phase4 = [];

  actions.filter(a => a.weight_category === 'low').forEach(a => {
    phase4.push(makeStep(a, {
      phase: 4,
      source_leaf: 6,
    }));
  });

  // Visibility check from L7 synthesis
  if (visRec === 'private' || synthesis.visibility_reason) {
    phase4.push(makeStep({
      title: 'Visibility review — confirm public/private before publish',
      description: synthesis.visibility_reason || 'Review visibility recommendation from synthesis',
      suggested_weight: 2,
      weight_category: 'low',
    }, {
      phase: 4,
      source_leaf: 7,
    }));
  }

  // Final governance sign-off
  phase4.push(makeStep({
    title: 'Final governance sign-off — ready for public?',
    description: `Confidence: ${synthesis.confidence_score || 0}%`,
    suggested_weight: 1,
    weight_category: 'low',
  }, {
    phase: 4,
    source_leaf: 7,
    test_required: false,
  }));

  // ═══ Sort each phase deterministically ═══
  const phases = [
    { phase: 1, name: 'Critical Fixes', steps: sortSteps(phase1) },
    { phase: 2, name: 'Hardening', steps: sortSteps(phase2) },
    { phase: 3, name: 'Optimisation / Clarity', steps: sortSteps(phase3) },
    { phase: 4, name: 'Pre-publish Checks', steps: sortSteps(phase4) },
  ].filter(p => p.steps.length > 0);

  const total = phases.reduce((sum, p) => sum + p.steps.length, 0);
  const blockers = phases.reduce((sum, p) => sum + p.steps.filter(s => s.publish_blocker).length, 0);
  const testsRequired = phases.reduce((sum, p) => sum + p.steps.filter(s => s.test_required).length, 0);

  return {
    phases,
    summary: {
      total,
      blockers,
      tests_required: testsRequired,
      by_phase: Object.fromEntries(phases.map(p => [p.phase, p.steps.length])),
    },
  };
}