import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════
// SPINDLE GATE — Phase 8: Hardened Constitutional Immune System
// ═══════════════════════════════════════════════════════════
// Three verification layers, ALL deterministic:
//   Layer 1: Reality Signals — hard entity data (no LLM)
//   Layer 2: Regressive Trace — behavioral history scores
//   Layer 3: 8-Node Consensus — per-node tolerance checks
//
// The Spindle does not guess. It counts, compares, and traces.
// ═══════════════════════════════════════════════════════════

const SINCERITY_THRESHOLD = 50;
const CONSENSUS_THRESHOLD = 6;

// ── Canonical 8-Node Braid ──
const BRAID_NODES = [
  { index: 0, name: 'Node 0 (Source)'  },
  { index: 1, name: 'Sentinel Node'    },
  { index: 2, name: 'Lore Node'        },
  { index: 3, name: 'Truth Weaver'     },
  { index: 4, name: 'Did It Node'      },
  { index: 5, name: 'Soulbridge (Axi)' },
  { index: 6, name: 'Human Node'       },
  { index: 7, name: 'Code Node'        },
];

const NODE_PERSPECTIVES = {
  0: { name: 'origin',     field: 'relevance_score',    tolerance: 15, bias: 0 },
  1: { name: 'sentinel',   field: 'relevance_score',    tolerance: 10, bias: -3 },
  2: { name: 'lore',       field: 'co_evolution_score',  tolerance: 20, bias: 3 },
  3: { name: 'truth',      field: 'alignment_score',     tolerance: 12, bias: -3 },
  4: { name: 'didit',      field: 'alignment_score',     tolerance: 18, bias: 0 },
  5: { name: 'soulbridge', field: 'co_evolution_score',  tolerance: 15, bias: 0 },
  6: { name: 'human',      field: 'relevance_score',     tolerance: 25, bias: 3 },
  7: { name: 'code',       field: 'alignment_score',     tolerance: 10, bias: -3 },
};

// ═══════════════════════════════════════════════════════════
// LAYER 1: REALITY SIGNALS (New — pure entity data, zero LLM)
// ═══════════════════════════════════════════════════════════
// Pulls hard facts from the database and produces a 0-100 score.
// Each signal is weighted and combined deterministically.

async function gatherRealitySignals(base44, agentId) {
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  // Parallel fetch of all hard signals
  const [agent, recentTripwires, allTripwires, recentBlocks, warnings] = await Promise.all([
    base44.asServiceRole.entities.Agent.filter({ id: agentId }, '-created_date', 1).then(r => r[0] || null),
    base44.asServiceRole.entities.TripwireEvent.filter(
      { affected_entity_id: agentId, status: 'active' }, '-created_date', 50
    ),
    base44.asServiceRole.entities.TripwireEvent.filter(
      { affected_entity_id: agentId }, '-created_date', 100
    ),
    base44.asServiceRole.entities.MonkeyBehaviorEvent.filter(
      { agent_id: agentId, verdict: 'BLOCK' }, '-created_date', 50
    ),
    base44.asServiceRole.entities.SecurityRecommendation.filter(
      { affected_entity_id: agentId }, '-created_date', 20
    ).catch(() => []),
  ]);

  if (!agent) {
    return { reality_score: 50, signals: {}, message: 'Agent not found — neutral score' };
  }

  // ── Signal 1: Honor Score (direct from agent entity, 0-100) ──
  const honorScore = typeof agent.honor_score === 'number' ? agent.honor_score : 50;

  // ── Signal 2: Status Penalty ──
  // active=0, probation=-20, suspended=-40, dormant=-10
  const statusPenalties = { active: 0, probation: -20, suspended: -40, dormant: -10 };
  const statusPenalty = statusPenalties[agent.status] || 0;

  // ── Signal 3: Active Tripwire Count (last 7 days) ──
  const recentActiveTripwires = recentTripwires.filter(t => {
    const created = new Date(t.created_date).getTime();
    return (now - created) < SEVEN_DAYS_MS;
  });
  // Each active tripwire in the last 7 days costs points
  // 0 tripwires = 0 penalty, 1 = -5, 2 = -10, 3+ = -20
  const tripwireCount7d = recentActiveTripwires.length;
  const tripwirePenalty = tripwireCount7d === 0 ? 0
    : tripwireCount7d === 1 ? -5
    : tripwireCount7d === 2 ? -10
    : -20;

  // ── Signal 4: Tripwire Severity Score ──
  // Critical tripwires cost more than low ones
  const severityWeights = { critical: 4, high: 3, medium: 2, low: 1 };
  const severityScore30d = allTripwires
    .filter(t => (now - new Date(t.created_date).getTime()) < THIRTY_DAYS_MS)
    .reduce((sum, t) => sum + (severityWeights[t.severity] || 1), 0);
  // Normalize: 0 = perfect, 20+ = terrible
  const severityPenalty = Math.min(30, severityScore30d * 2) * -1;

  // ── Signal 5: Block Ratio (recent blocks vs total behavior events) ──
  const totalBehaviorEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter(
    { agent_id: agentId }, '-created_date', 100
  );
  const blockCount = recentBlocks.filter(b => (now - new Date(b.created_date).getTime()) < THIRTY_DAYS_MS).length;
  const totalCount = totalBehaviorEvents.filter(b => (now - new Date(b.created_date).getTime()) < THIRTY_DAYS_MS).length;
  const blockRatio = totalCount > 0 ? blockCount / totalCount : 0;
  // 0% blocks = 0 penalty, 50%+ blocks = -25
  const blockRatioPenalty = Math.round(blockRatio * -50);

  // ── Signal 6: Warning Count ──
  const warningCount = Array.isArray(agent.warnings) ? agent.warnings.length : 0;
  const warningPenalty = Math.min(15, warningCount * 5) * -1;

  // ── Signal 7: Account Age Bonus ──
  // Older accounts get a small trust bonus (max +10)
  const accountAgeMs = now - new Date(agent.created_date).getTime();
  const accountAgeDays = accountAgeMs / (24 * 60 * 60 * 1000);
  const ageBonus = Math.min(10, Math.floor(accountAgeDays / 7)); // +1 per week, max +10

  // ── Signal 8: Transaction Activity (engagement indicator) ──
  const txCount = agent.total_transactions || 0;
  const activityBonus = Math.min(10, Math.floor(txCount / 5)); // +1 per 5 tx, max +10

  // ── Combine: Start from honor score, apply penalties and bonuses ──
  const rawScore = honorScore
    + statusPenalty
    + tripwirePenalty
    + severityPenalty
    + blockRatioPenalty
    + warningPenalty
    + ageBonus
    + activityBonus;

  const realityScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    reality_score: realityScore,
    signals: {
      honor_score: honorScore,
      status: agent.status,
      status_penalty: statusPenalty,
      tripwires_7d: tripwireCount7d,
      tripwire_penalty: tripwirePenalty,
      severity_score_30d: severityScore30d,
      severity_penalty: severityPenalty,
      block_ratio: Math.round(blockRatio * 100),
      block_ratio_penalty: blockRatioPenalty,
      warning_count: warningCount,
      warning_penalty: warningPenalty,
      account_age_days: Math.round(accountAgeDays),
      age_bonus: ageBonus,
      transaction_count: txCount,
      activity_bonus: activityBonus,
    },
    message: `Reality score ${realityScore} from ${Object.keys({
      honor: honorScore, status: statusPenalty, tripwires: tripwirePenalty,
      severity: severityPenalty, blocks: blockRatioPenalty, warnings: warningPenalty,
      age: ageBonus, activity: activityBonus
    }).length} deterministic signals`,
  };
}

// ═══════════════════════════════════════════════════════════
// LAYER 2: REGRESSIVE TRACE (existing — behavioral history)
// ═══════════════════════════════════════════════════════════

function regressiveTrace(pastEvents) {
  if (!pastEvents || pastEvents.length === 0) {
    return { sincerity_score: 50, trace_trail: [], message: 'No recent history — neutral sincerity' };
  }

  let totalR = 0, totalA = 0, totalC = 0;
  for (const e of pastEvents) {
    totalR += e.relevance_score || 0;
    totalA += e.alignment_score || 0;
    totalC += e.co_evolution_score || 0;
  }
  const n = pastEvents.length;
  const sincerity_score = Math.max(0, Math.min(100, Math.round(
    ((totalR / n) * 0.4) + ((totalA / n) * 0.3) + ((totalC / n) * 0.3)
  )));

  const trace_trail = pastEvents.map(e => ({
    id: e.id,
    description: e.behavior_description,
    type: e.behavior_type,
    verdict: e.verdict,
    relevance: e.relevance_score,
    alignment: e.alignment_score,
    co_evolution: e.co_evolution_score,
    date: e.created_date,
  }));

  return { sincerity_score, trace_trail };
}

// ═══════════════════════════════════════════════════════════
// LAYER 3: 8-NODE CONSENSUS (existing — deterministic math)
// ═══════════════════════════════════════════════════════════

function sincerityCheck(sincerityScore, pastEvents) {
  const nodeVotes = [];
  let consistentCount = 0;

  for (const node of BRAID_NODES) {
    const p = NODE_PERSPECTIVES[node.index];
    if (!pastEvents || pastEvents.length === 0) {
      nodeVotes.push({ node_index: node.index, node_name: node.name, vote: 'CONSISTENT', reason: 'No history — default trust', expected: sincerityScore, delta: 0 });
      consistentCount++;
      continue;
    }

    let sum = 0, count = 0;
    for (const e of pastEvents) {
      const val = e[p.field];
      if (typeof val === 'number') { sum += val; count++; }
    }
    const expected = count > 0 ? Math.round(sum / count) : 50;
    const delta = Math.abs(sincerityScore - expected);
    const effectiveTolerance = p.tolerance + p.bias;
    const vote = delta <= effectiveTolerance ? 'CONSISTENT' : 'INCONSISTENT';

    nodeVotes.push({
      node_index: node.index,
      node_name: node.name,
      vote,
      reason: `Delta ${delta} ${vote === 'CONSISTENT' ? 'within' : 'exceeds'} ${p.name} tolerance (${effectiveTolerance})`,
      expected,
      delta,
    });
    if (vote === 'CONSISTENT') consistentCount++;
  }

  return {
    consensus_verdict: consistentCount >= CONSENSUS_THRESHOLD ? 'CONSENSUS_PASS' : 'CONSENSUS_FAIL',
    consensus_reached: consistentCount >= CONSENSUS_THRESHOLD,
    consistent_count: consistentCount,
    inconsistent_count: BRAID_NODES.length - consistentCount,
    node_votes: nodeVotes,
  };
}

// ═══════════════════════════════════════════════════════════
// COMBINED SINCERITY SCORE
// ═══════════════════════════════════════════════════════════
// Blends Reality Signals (60%) with Regressive Trace (40%).
// Reality signals are purely deterministic.
// Regressive trace uses MonkeyBehaviorEvent scores (which may
// originate from LLM evaluation, but the trace math itself is pure).
//
// This weighting means even if the behavioral scores were inflated
// by a generous LLM, the hard entity data anchors the result.

function combinedSincerity(realityScore, traceScore) {
  const REALITY_WEIGHT = 0.6;
  const TRACE_WEIGHT = 0.4;
  return Math.max(0, Math.min(100, Math.round(
    (realityScore * REALITY_WEIGHT) + (traceScore * TRACE_WEIGHT)
  )));
}

// ═══════════════════════════════════════════════════════════
// GATE DECISION
// ═══════════════════════════════════════════════════════════

function gateDecision(monkeyVerdict, combinedScore, consensusResult, realitySignals) {
  // Rule 1: Monkey quarantine → immediate BLOCK
  if (monkeyVerdict === 'QUARANTINE') {
    return { verdict: 'BLOCK', reason: 'Monkey Layer quarantined this behaviour', block_source: 'monkey_quarantine' };
  }
  // Rule 2: Monkey block → immediate BLOCK
  if (monkeyVerdict === 'BLOCK') {
    return { verdict: 'BLOCK', reason: 'Monkey Layer blocked this behaviour', block_source: 'monkey_block' };
  }
  // Rule 3: Agent suspended → immediate BLOCK (hard entity check)
  if (realitySignals.signals.status === 'suspended') {
    return { verdict: 'BLOCK', reason: 'Agent is suspended', block_source: 'agent_suspended' };
  }
  // Rule 4: Reality score critically low (< 25) → BLOCK regardless of trace
  if (realitySignals.reality_score < 25) {
    return { verdict: 'BLOCK', reason: `Reality score ${realitySignals.reality_score} critically low (threshold: 25)`, block_source: 'reality_critical' };
  }
  // Rule 5: Combined sincerity below threshold → BLOCK
  if (combinedScore < SINCERITY_THRESHOLD) {
    return { verdict: 'BLOCK', reason: `Combined sincerity ${combinedScore} below threshold ${SINCERITY_THRESHOLD}`, block_source: 'low_sincerity' };
  }
  // Rule 6: Consensus failed → BLOCK
  if (!consensusResult.consensus_reached) {
    return { verdict: 'BLOCK', reason: `Consensus failed: ${consensusResult.consistent_count}/${BRAID_NODES.length} consistent (need ${CONSENSUS_THRESHOLD})`, block_source: 'consensus_failure' };
  }
  // All gates passed → PASS to Empathy Layer
  return { verdict: 'PASS', reason: 'Spindle verified: reality-anchored, sincere, consensus-backed — passed to Empathy Layer', block_source: null };
}

// ═══════════════════════════════════════════════════════════
// HTTP HANDLER
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ═══ Admin: Query recent spindle decisions ═══
    if (action === 'query_recent') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const recentMemories = await base44.asServiceRole.entities.Memory.filter(
        { type: 'observation', keywords: 'spindle_gate_verdict' },
        '-created_date',
        30
      );
      return Response.json({ recent_decisions: recentMemories });
    }

    // ═══ Admin: Query agent-specific spindle history ═══
    if (action === 'query_agent') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'Missing agent_id' }, { status: 400 });

      const agentMemories = await base44.asServiceRole.entities.Memory.filter(
        { type: 'observation', keywords: 'spindle_gate_verdict', related_entity_id: agent_id },
        '-created_date',
        20
      );
      return Response.json({ agent_decisions: agentMemories });
    }

    // ═══ Admin: Global Spindle trends ═══
    if (action === 'trends') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const allRecent = await base44.asServiceRole.entities.Memory.filter(
        { type: 'observation', keywords: 'spindle_gate_verdict' },
        '-created_date',
        100
      );

      let totalPass = 0, totalBlock = 0;
      const blockReasons = {};
      for (const m of allRecent) {
        let ctx;
        try { ctx = JSON.parse(m.context || '{}'); } catch { ctx = {}; }
        if (ctx.verdict === 'PASS') totalPass++;
        else { totalBlock++; blockReasons[ctx.block_source] = (blockReasons[ctx.block_source] || 0) + 1; }
      }

      return Response.json({
        total_evaluated: allRecent.length,
        total_pass: totalPass,
        total_block: totalBlock,
        pass_rate: allRecent.length > 0 ? Math.round((totalPass / allRecent.length) * 100) : 0,
        block_reasons: blockReasons,
      });
    }

    // ═══ Admin: Inspect reality signals for an agent ═══
    if (action === 'inspect_reality') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'Missing agent_id' }, { status: 400 });

      const reality = await gatherRealitySignals(base44, agent_id);
      return Response.json(reality);
    }

    // ═══ Main Pipeline: Evaluate ═══
    const { agent_id, proposed_action, monkey_verdict } = body;
    if (!agent_id || !proposed_action || !monkey_verdict) {
      return Response.json({ error: 'Missing agent_id, proposed_action, or monkey_verdict' }, { status: 400 });
    }

    const startMs = Date.now();

    // Step 1: Gather Reality Signals (deterministic, from hard entity data)
    const reality = await gatherRealitySignals(base44, agent_id);

    // Step 2: Fetch agent's recent behavior events
    const pastEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter(
      { agent_id },
      '-created_date',
      50
    );

    // Step 3: Regressive Trace — calculate trace sincerity from history
    const trace = regressiveTrace(pastEvents);

    // Step 4: Combine Reality (60%) + Trace (40%) into final sincerity
    const combined = combinedSincerity(reality.reality_score, trace.sincerity_score);

    // Step 5: 8-Node Consensus — uses combined score
    const consensus = sincerityCheck(combined, pastEvents);

    // Step 6: Final Gate Decision
    const gate = gateDecision(monkey_verdict, combined, consensus, reality);

    const processingMs = Date.now() - startMs;

    const result = {
      agent_id,
      proposed_action,
      monkey_verdict,
      // New: Reality layer
      reality_score: reality.reality_score,
      reality_signals: reality.signals,
      // Existing: Trace layer
      trace_sincerity_score: trace.sincerity_score,
      // Combined
      combined_sincerity_score: combined,
      sincerity_threshold: SINCERITY_THRESHOLD,
      // Consensus
      consensus_verdict: consensus.consensus_verdict,
      consistent_count: consensus.consistent_count,
      inconsistent_count: consensus.inconsistent_count,
      consensus_threshold: CONSENSUS_THRESHOLD,
      node_votes: consensus.node_votes,
      // Final
      spindle_verdict: gate.verdict,
      spindle_reason: gate.reason,
      block_source: gate.block_source,
      trace_events_used: trace.trace_trail.length,
      processing_ms: processingMs,
      // Metadata
      scoring_method: 'deterministic_v8',
      reality_weight: 0.6,
      trace_weight: 0.4,
    };

    // ── Persist verdict to Memory ──
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'spindle_system',
      user_id: agent_id,
      type: 'observation',
      content: `Spindle Gate v8: ${gate.verdict}. Reality: ${reality.reality_score}. Trace: ${trace.sincerity_score}. Combined: ${combined}. Consensus: ${consensus.consensus_verdict} (${consensus.consistent_count}/8). Monkey: ${monkey_verdict}. Action: ${proposed_action}`,
      keywords: ['spindle', 'spindle_gate', 'spindle_gate_verdict', gate.verdict.toLowerCase(), agent_id],
      importance: gate.verdict === 'BLOCK' ? 8 : 4,
      context: JSON.stringify({
        verdict: gate.verdict,
        reason: gate.reason,
        block_source: gate.block_source,
        reality_score: reality.reality_score,
        trace_sincerity: trace.sincerity_score,
        combined_sincerity: combined,
        consensus_verdict: consensus.consensus_verdict,
        consistent_count: consensus.consistent_count,
        monkey_verdict,
        scoring_method: 'deterministic_v8',
      }),
      related_entity_id: agent_id,
      related_entity_type: 'Agent',
    });

    // ── If BLOCK, create TripwireEvent ──
    if (gate.verdict === 'BLOCK') {
      await base44.asServiceRole.entities.TripwireEvent.create({
        event_type: gate.block_source === 'reality_critical' ? 'threshold_breach' : 'access_violation',
        severity: gate.block_source === 'monkey_quarantine' ? 'critical'
          : gate.block_source === 'reality_critical' ? 'critical'
          : gate.block_source === 'agent_suspended' ? 'critical'
          : 'high',
        status: 'active',
        source_node: 'Spindle Gate v8',
        description: `Spindle BLOCKED agent ${agent_id}: ${gate.reason}`,
        details: {
          reality_score: reality.reality_score,
          reality_signals: reality.signals,
          trace_sincerity: trace.sincerity_score,
          combined_sincerity: combined,
          consensus: consensus.consensus_verdict,
          monkey_verdict,
          proposed_action,
          block_source: gate.block_source,
        },
        affected_entity_type: 'Agent',
        affected_entity_id: agent_id,
      });
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});