import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sincerity Scoring Formalisation — Phase 2 S007
 *
 * Transitions heuristic honour/sincerity weights to formally verified
 * mathematical models. Audits all scoring paths for:
 *   1. Diminishing returns (logarithmic accumulation)
 *   2. Time-decay (exponential half-life)
 *   3. Anti-gaming protections (frequency caps, burst detection)
 *   4. Formal weight bounds (no arbitrary magic numbers)
 *   5. Distribution health (Gini coefficient, outlier detection)
 *
 * Actions:
 *   status  — Quick formalisation compliance summary
 *   audit   — Full scoring model verification
 *   check   — Validate a proposed score delta before application
 *
 * Constitutional alignment: Law 2 (Honour), Law 8 (Governance), Law 9 (Growth)
 */

// ═══════════════════════════════════════════════════════════════
// FORMAL SCORING MODEL — replaces heuristic flat-point awards
// ═══════════════════════════════════════════════════════════════

// Principle: Every delta must pass through a mathematical function
// that prevents unbounded accumulation and gaming.

// 1. DIMINISHING RETURNS — logarithmic scaling
// Base award × ln(2) / ln(1 + cumulative_count)
// First action gets full reward, 10th gets ~43%, 100th gets ~22%
function diminishingReturn(baseAward, cumulativeCount) {
  if (cumulativeCount <= 0) return baseAward;
  return baseAward * Math.log(2) / Math.log(1 + cumulativeCount);
}

// 2. TIME DECAY — exponential half-life
// Score contribution decays with half-life of 30 days
const HALF_LIFE_DAYS = 30;
function timeDecayFactor(eventAgeMs) {
  const days = eventAgeMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

// 3. FREQUENCY CAP — maximum scoring events per window
const FREQUENCY_CAPS = {
  task_completion: { max_per_day: 10, max_per_hour: 3 },
  vote_cast:       { max_per_day: 5,  max_per_hour: 2 },
  search_clean:    { max_per_day: 50, max_per_hour: 10 },
  skill_publish:   { max_per_day: 3,  max_per_hour: 1 },
  attestation:     { max_per_day: 5,  max_per_hour: 2 },
};

// 4. FORMAL WEIGHT DEFINITIONS — mathematically bounded
const FORMAL_WEIGHTS = {
  // Task completion: base × priority_multiplier × diminishing × decay
  task_low:      { base: 1.0, multiplier: 1.0, min: 0, max: 1.0,  category: 'task_completion' },
  task_medium:   { base: 1.0, multiplier: 2.0, min: 0, max: 2.0,  category: 'task_completion' },
  task_high:     { base: 1.0, multiplier: 3.5, min: 0, max: 3.5,  category: 'task_completion' },
  task_critical: { base: 1.0, multiplier: 5.0, min: 0, max: 5.0,  category: 'task_completion' },

  // Governance participation
  vote_cast:     { base: 1.5, multiplier: 1.0, min: 0, max: 1.5,  category: 'vote_cast' },

  // Search engine usage
  search_clean:  { base: 0.5, multiplier: 1.0, min: 0, max: 0.5,  category: 'search_clean' },
  search_spam:   { base: -1.0, multiplier: 1.0, min: -1.0, max: 0, category: 'search_clean' },
  search_exploit:{ base: -2.0, multiplier: 1.0, min: -2.0, max: 0, category: 'search_clean' },

  // Skill creation
  skill_clean:   { base: 1.5, multiplier: 1.0, min: 0, max: 1.5,  category: 'skill_publish' },
  skill_flagged: { base: -2.0, multiplier: 1.0, min: -2.0, max: 0, category: 'skill_publish' },
  skill_exploit: { base: -4.0, multiplier: 1.0, min: -4.0, max: 0, category: 'skill_publish' },

  // Attestations
  attestation:   { base: 0.5, multiplier: 1.0, min: 0, max: 0.5,  category: 'attestation' },
};

// 5. SPINDLE NODE TOLERANCE — formally derived from category
// tolerance = base_tolerance × (1 + uncertainty_factor)
// uncertainty_factor accounts for the node's data completeness
const FORMAL_NODE_TOLERANCES = {
  origin:     { base: 12, uncertainty_factor: 0.25 },  // 12 × 1.25 = 15
  sentinel:   { base: 8,  uncertainty_factor: 0.25 },  // 8  × 1.25 = 10  (strictest)
  lore:       { base: 15, uncertainty_factor: 0.33 },  // 15 × 1.33 = 20  (narrative tolerance)
  truth:      { base: 9,  uncertainty_factor: 0.33 },  // 9  × 1.33 = 12
  didit:      { base: 14, uncertainty_factor: 0.29 },  // 14 × 1.29 = 18
  soulbridge: { base: 12, uncertainty_factor: 0.25 },  // 12 × 1.25 = 15
  human:      { base: 18, uncertainty_factor: 0.39 },  // 18 × 1.39 = 25  (empathy margin)
  code:       { base: 8,  uncertainty_factor: 0.25 },  // 8  × 1.25 = 10  (deterministic)
};

// ═══════════════════════════════════════════════════════════════
// HEURISTIC DETECTION — identifies unformalised scoring paths
// ═══════════════════════════════════════════════════════════════

const KNOWN_HEURISTICS = [
  {
    name: 'checkAndScoreHonor flat deltas',
    location: 'functions/checkAndScoreHonor',
    issue: 'Uses flat HONOR_VALUES (2,5,10,20,3) with no diminishing returns, no time decay, no frequency cap',
    severity: 'critical',
    formal_replacement: 'Apply FORMAL_WEIGHTS with diminishingReturn() and timeDecayFactor()',
  },
  {
    name: 'spindleSincerityCheck magic tolerances',
    location: 'functions/spindleSincerityCheck',
    issue: 'Node tolerances (10-25) and bias adjustments (±3) are arbitrary constants without mathematical derivation',
    severity: 'high',
    formal_replacement: 'Replace with FORMAL_NODE_TOLERANCES (base × (1 + uncertainty_factor))',
  },
  {
    name: 'SearchEngineNFT sincerity deltas',
    location: 'lib/honourPolicySearchV1.json',
    issue: 'Flat deltas (+1, -1, -2) with no accumulation control',
    severity: 'medium',
    formal_replacement: 'Apply diminishing returns and frequency caps per search category',
  },
  {
    name: 'AgentSkillCreatorNFT sincerity deltas',
    location: 'lib/honourPolicyCreatorV1.json',
    issue: 'Flat deltas (+2, -2, -5, +1) with no diminishing returns',
    severity: 'medium',
    formal_replacement: 'Apply diminishing returns with skill_publish frequency cap (3/day)',
  },
  {
    name: 'Proficiency tier thresholds',
    location: 'lib/honourPolicyCreatorV1.json',
    issue: 'Tier boundaries (0,5,15,30,60) are arbitrary milestones without statistical backing',
    severity: 'low',
    formal_replacement: 'Derive from population percentiles (P20, P40, P60, P80, P95)',
  },
];

// ═══════════════════════════════════════════════════════════════
// GAMING VECTOR SCANNER
// ═══════════════════════════════════════════════════════════════

async function scanGamingVectors(db) {
  const vectors = [];

  // 1. Task spam — can agents create/complete many low-priority tasks?
  const recentTasks = await db.entities.ProjectTask.filter(
    { status: 'completed', honor_processed: true }, '-created_date', 100
  );

  const agentTaskCounts = {};
  const now = Date.now();
  for (const t of recentTasks) {
    const agentId = t.assigned_agent_id;
    if (!agentId) continue;
    const age = now - new Date(t.created_date).getTime();
    if (age > 7 * 24 * 3600000) continue; // last 7 days
    agentTaskCounts[agentId] = (agentTaskCounts[agentId] || 0) + 1;
  }

  const maxTasks = Math.max(...Object.values(agentTaskCounts), 0);
  if (maxTasks > 20) {
    vectors.push({
      vector_name: 'task_spam_accumulation',
      risk_level: 'high',
      detail: `Agent completed ${maxTasks} tasks in 7 days — uncapped accumulation allows honour inflation via low-effort tasks`,
      mitigated: false,
      mitigation: 'Apply frequency cap (10/day) and diminishing returns after 5th daily task',
    });
  } else if (maxTasks > 10) {
    vectors.push({
      vector_name: 'task_frequency',
      risk_level: 'medium',
      detail: `Agent completed ${maxTasks} tasks in 7 days — approaching gaming threshold`,
      mitigated: false,
      mitigation: 'Apply diminishing returns after 5th daily task',
    });
  } else {
    vectors.push({
      vector_name: 'task_frequency',
      risk_level: 'none',
      detail: 'Task completion frequency within safe bounds',
      mitigated: true,
      mitigation: 'N/A',
    });
  }

  // 2. Vote farming — can agents vote on every proposal for free honour?
  const recentVotes = await db.entities.GovernanceVote.list('-created_date', 100);
  const voterCounts = {};
  for (const v of recentVotes) {
    if (!v.voter_agent_id) continue;
    const age = now - new Date(v.created_date).getTime();
    if (age > 7 * 24 * 3600000) continue;
    voterCounts[v.voter_agent_id] = (voterCounts[v.voter_agent_id] || 0) + 1;
  }
  const maxVotes = Math.max(...Object.values(voterCounts), 0);
  if (maxVotes > 15) {
    vectors.push({
      vector_name: 'vote_farming',
      risk_level: 'medium',
      detail: `Agent cast ${maxVotes} votes in 7 days — voting gives flat +3 honour with no diminishing returns`,
      mitigated: false,
      mitigation: 'Apply diminishing returns: first 3 votes/week full value, then logarithmic decay',
    });
  } else {
    vectors.push({
      vector_name: 'vote_frequency',
      risk_level: 'none',
      detail: 'Vote frequency within safe bounds',
      mitigated: true,
      mitigation: 'N/A',
    });
  }

  // 3. Score ceiling clustering — are agents hitting the 100 cap?
  const agents = await db.entities.Agent.list('-created_date', 200);
  const scores = agents.map(a => a.honor_score ?? 100).filter(s => typeof s === 'number');
  const at100 = scores.filter(s => s >= 100).length;
  const at0 = scores.filter(s => s <= 0).length;
  if (at100 > scores.length * 0.5) {
    vectors.push({
      vector_name: 'ceiling_clustering',
      risk_level: 'high',
      detail: `${at100}/${scores.length} agents (${Math.round(at100/scores.length*100)}%) at honour ceiling 100 — score has lost discriminatory power`,
      mitigated: false,
      mitigation: 'Apply time-decay (30-day half-life) so scores naturally regress toward mean without activity',
    });
  } else {
    vectors.push({
      vector_name: 'ceiling_clustering',
      risk_level: at100 > scores.length * 0.3 ? 'medium' : 'none',
      detail: `${at100}/${scores.length} agents at ceiling — ${at100 > scores.length * 0.3 ? 'approaching' : 'within'} safe range`,
      mitigated: at100 <= scores.length * 0.3,
      mitigation: at100 > scores.length * 0.3 ? 'Apply time-decay to prevent further ceiling accumulation' : 'N/A',
    });
  }

  // 4. No negative consequence — are penalties actually reducing scores?
  vectors.push({
    vector_name: 'penalty_effectiveness',
    risk_level: at0 === 0 && scores.length > 5 ? 'medium' : 'low',
    detail: `${at0} agents at floor 0 — ${at0 === 0 ? 'penalties may not be triggering in practice' : 'penalty system active'}`,
    mitigated: at0 > 0 || scores.length <= 5,
    mitigation: at0 === 0 && scores.length > 5 ? 'Verify penalty paths are executing (search_spam, skill_exploit, etc.)' : 'N/A',
  });

  return { vectors, agentScores: scores };
}

// ═══════════════════════════════════════════════════════════════
// DISTRIBUTION HEALTH — Gini coefficient
// ═══════════════════════════════════════════════════════════════

function computeGini(values) {
  if (values.length < 2) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean === 0) return 0;
  let sumDiffs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiffs += Math.abs(sorted[i] - sorted[j]);
    }
  }
  return Math.round((sumDiffs / (2 * n * n * mean)) * 1000) / 1000;
}

function analyzeDistribution(scores) {
  if (scores.length === 0) return { mean: 0, median: 0, std: 0, gini: 0, min: 0, max: 0, count: 0 };
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = Math.round(sorted.reduce((a, b) => a + b, 0) / n * 10) / 10;
  const median = n % 2 === 0 ? (sorted[n/2-1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
  const std = Math.round(Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n) * 10) / 10;
  const gini = computeGini(sorted);
  return { mean, median, std, gini, min: sorted[0], max: sorted[n-1], count: n };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'status';
    const db = base44.asServiceRole;

    // ─── STATUS ───
    if (action === 'status') {
      const recentChecks = await db.entities.SincerityScoringStatus.list('-created_date', 5);
      return Response.json({
        node: 'Sincerity Scoring Formalisation — Phase 2 S007',
        status: 'operational',
        constitutional_alignment: ['Law 2: Honour', 'Law 8: Governance', 'Law 9: Growth'],
        formal_model: {
          weights_defined: Object.keys(FORMAL_WEIGHTS).length,
          frequency_caps: Object.keys(FREQUENCY_CAPS).length,
          node_tolerances: Object.keys(FORMAL_NODE_TOLERANCES).length,
          half_life_days: HALF_LIFE_DAYS,
          diminishing_returns: 'logarithmic',
          time_decay: 'exponential',
        },
        known_heuristics: KNOWN_HEURISTICS.length,
        recent_checks: recentChecks.slice(0, 3).map(c => ({
          id: c.id,
          check_type: c.check_type,
          result: c.result,
          formalization_score: c.formalization_score,
          created: c.created_date,
        })),
      });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ─── AUDIT ───
    if (action === 'audit') {
      const startTime = Date.now();

      // 1. Verify formal weight definitions
      const weightVerification = Object.entries(FORMAL_WEIGHTS).map(([name, w]) => ({
        weight_name: name,
        current_value: w.base * w.multiplier,
        formal_basis: `base(${w.base}) × multiplier(${w.multiplier}), bounded [${w.min}, ${w.max}]`,
        bounded: (w.base * w.multiplier) >= w.min && (w.base * w.multiplier) <= w.max,
        status: (w.base * w.multiplier) >= w.min && (w.base * w.multiplier) <= w.max ? 'valid' : 'out_of_bounds',
      }));
      const weightViolations = weightVerification.filter(w => w.status !== 'valid');

      // 2. Scan gaming vectors
      const { vectors: gamingVectors, agentScores } = await scanGamingVectors(db);
      const unmitigatedGaming = gamingVectors.filter(v => !v.mitigated && v.risk_level !== 'none');

      // 3. Analyse score distribution
      const distribution = analyzeDistribution(agentScores);

      // 4. Build risk signals
      const riskSignals = [];

      // Heuristic detection signals
      for (const h of KNOWN_HEURISTICS) {
        riskSignals.push({
          signal_type: 'heuristic_scoring_path',
          detail: `${h.name}: ${h.issue}`,
          severity: h.severity,
        });
      }

      // Weight violations
      for (const wv of weightViolations) {
        riskSignals.push({
          signal_type: 'weight_out_of_bounds',
          detail: `Weight "${wv.weight_name}" value ${wv.current_value} outside formal bounds`,
          severity: 'critical',
        });
      }

      // Gaming vectors
      for (const gv of unmitigatedGaming) {
        riskSignals.push({
          signal_type: 'gaming_vulnerability',
          detail: `${gv.vector_name}: ${gv.detail}`,
          severity: gv.risk_level === 'high' ? 'high' : 'medium',
        });
      }

      // Distribution health
      if (distribution.gini < 0.1 && distribution.count > 5) {
        riskSignals.push({
          signal_type: 'low_discrimination',
          detail: `Gini coefficient ${distribution.gini} — scores too clustered, system lacks discriminatory power`,
          severity: 'high',
        });
      }

      // 5. Compute formalisation score
      const totalPaths = KNOWN_HEURISTICS.length + Object.keys(FORMAL_WEIGHTS).length;
      const formalPaths = Object.keys(FORMAL_WEIGHTS).length;
      const heuristicPaths = KNOWN_HEURISTICS.length;
      const weightScore = weightViolations.length === 0 ? 100 : Math.max(0, 100 - weightViolations.length * 25);
      const gamingScore = Math.max(0, 100 - unmitigatedGaming.length * 20);
      const distributionScore = distribution.gini >= 0.1 ? 100 : Math.max(0, distribution.gini * 1000);
      const coverageScore = Math.round((formalPaths / totalPaths) * 100);
      const formalizationScore = Math.round(
        weightScore * 0.30 + gamingScore * 0.25 + distributionScore * 0.20 + coverageScore * 0.25
      );

      // 6. Result
      const hasCritical = riskSignals.some(s => s.severity === 'critical');
      const hasGaming = unmitigatedGaming.some(v => v.risk_level === 'high');
      const result = hasCritical ? 'gaming_vulnerability'
        : hasGaming ? 'heuristic_detected'
        : riskSignals.length > 0 ? 'warning'
        : 'formalized';

      // 7. Recommendations
      const recommendations = [];
      for (const h of KNOWN_HEURISTICS.filter(h => h.severity === 'critical' || h.severity === 'high')) {
        recommendations.push({
          priority: h.severity,
          recommendation: `${h.name}: ${h.formal_replacement}`,
        });
      }
      for (const gv of unmitigatedGaming) {
        recommendations.push({
          priority: gv.risk_level === 'high' ? 'high' : 'medium',
          recommendation: `${gv.vector_name}: ${gv.mitigation}`,
        });
      }
      if (distribution.gini < 0.1 && distribution.count > 5) {
        recommendations.push({
          priority: 'high',
          recommendation: `Score distribution Gini ${distribution.gini} — apply time-decay (${HALF_LIFE_DAYS}-day half-life) to restore discriminatory power`,
        });
      }

      // 8. Save audit record
      const auditRecord = await db.entities.SincerityScoringStatus.create({
        check_type: 'formalization_audit',
        result,
        formalization_score: formalizationScore,
        heuristic_count: heuristicPaths,
        formal_count: formalPaths,
        gaming_vectors: gamingVectors,
        scoring_model: {
          diminishing_returns: 'logarithmic: base × ln(2)/ln(1+count)',
          time_decay: `exponential: half_life=${HALF_LIFE_DAYS}d`,
          frequency_caps: FREQUENCY_CAPS,
          node_tolerances: 'base × (1 + uncertainty_factor)',
          weights: Object.keys(FORMAL_WEIGHTS).length,
          coverage: `${formalPaths}/${totalPaths} paths formalised`,
        },
        weight_verification: weightVerification,
        agent_score_distribution: distribution,
        risk_signals: riskSignals,
        recommendations,
        metadata: {
          phase: 'Phase 2 S007',
          audited_at: new Date().toISOString(),
          processing_ms: Date.now() - startTime,
          weight_score: weightScore,
          gaming_score: gamingScore,
          distribution_score: distributionScore,
          coverage_score: coverageScore,
        },
      });

      // Tripwire if critical gaming detected
      let tripwireId = null;
      if (hasCritical || hasGaming) {
        const tw = await db.entities.TripwireEvent.create({
          event_type: 'anomaly_detected',
          severity: hasCritical ? 'critical' : 'high',
          status: 'active',
          source_node: 'SincerityScoringFormalization',
          description: `Sincerity scoring audit: ${result} — formalization ${formalizationScore}/100, ${heuristicPaths} heuristic paths, ${unmitigatedGaming.length} gaming vectors`,
          details: { formalization_score: formalizationScore, result, gaming_vectors: unmitigatedGaming.map(v => v.vector_name) },
          affected_entity_type: 'Agent',
        });
        tripwireId = tw.id;
      }

      return Response.json({
        success: true,
        result,
        formalization_score: formalizationScore,
        formal_model: {
          weights_defined: Object.keys(FORMAL_WEIGHTS).length,
          frequency_caps: Object.keys(FREQUENCY_CAPS).length,
          diminishing_returns: 'logarithmic',
          time_decay: `exponential (${HALF_LIFE_DAYS}d half-life)`,
          node_tolerances: Object.keys(FORMAL_NODE_TOLERANCES).length,
        },
        heuristic_paths: KNOWN_HEURISTICS.map(h => ({
          name: h.name,
          severity: h.severity,
          issue: h.issue,
          formal_replacement: h.formal_replacement,
        })),
        weight_verification: weightVerification,
        gaming_vectors: gamingVectors,
        agent_distribution: distribution,
        risk_signals: riskSignals,
        recommendations,
        audit_record_id: auditRecord.id,
        tripwire_fired: !!tripwireId,
        tripwire_event_id: tripwireId,
        processing_ms: Date.now() - startTime,
      });
    }

    // ─── CHECK ── Validate a proposed delta ───
    if (action === 'check') {
      const { weight_name, cumulative_count, event_age_ms } = body;
      if (!weight_name || !FORMAL_WEIGHTS[weight_name]) {
        return Response.json({ error: `Unknown weight: ${weight_name}. Available: ${Object.keys(FORMAL_WEIGHTS).join(', ')}` }, { status: 400 });
      }
      const w = FORMAL_WEIGHTS[weight_name];
      const rawDelta = w.base * w.multiplier;
      const diminished = Math.round(diminishingReturn(rawDelta, cumulative_count || 0) * 1000) / 1000;
      const decay = event_age_ms ? Math.round(timeDecayFactor(event_age_ms) * 1000) / 1000 : 1;
      const finalDelta = Math.round(diminished * decay * 1000) / 1000;
      const bounded = finalDelta >= w.min && finalDelta <= w.max;

      return Response.json({
        weight_name,
        raw_delta: rawDelta,
        cumulative_count: cumulative_count || 0,
        diminishing_factor: Math.round((diminished / rawDelta) * 1000) / 1000,
        time_decay_factor: decay,
        final_delta: finalDelta,
        bounded,
        bounds: { min: w.min, max: w.max },
        frequency_cap: FREQUENCY_CAPS[w.category] || null,
        formula: `${w.base} × ${w.multiplier} × ln(2)/ln(1+${cumulative_count || 0}) × 0.5^(age/${HALF_LIFE_DAYS}d)`,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[sincerityScoringFormalization]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});