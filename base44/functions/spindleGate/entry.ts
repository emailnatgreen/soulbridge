import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════
// SPINDLE GATE — Phase 7: The Constitutional Immune System
// ═══════════════════════════════════════════════════════════
// Unifies: Monkey Verdict + Regressive Trace + 8-Node Consensus
// into a single PASS / BLOCK verdict.
//
// The Spindle does not guess. It traces.
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

// ── Component 1: Regressive Trace (inline) ──
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

// ── Component 2: 8-Node Sincerity Check (inline) ──
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

// ── Component 3: Final Gate Logic ──
function gateDecision(monkeyVerdict, sincerityScore, consensusResult) {
  // Rule 1: Monkey quarantine → immediate BLOCK
  if (monkeyVerdict === 'QUARANTINE') {
    return { verdict: 'BLOCK', reason: 'Monkey Layer quarantined this behaviour', block_source: 'monkey_quarantine' };
  }
  // Rule 2: Monkey block → immediate BLOCK
  if (monkeyVerdict === 'BLOCK') {
    return { verdict: 'BLOCK', reason: 'Monkey Layer blocked this behaviour', block_source: 'monkey_block' };
  }
  // Rule 3: Low sincerity → BLOCK
  if (sincerityScore < SINCERITY_THRESHOLD) {
    return { verdict: 'BLOCK', reason: `Sincerity score ${sincerityScore} below threshold ${SINCERITY_THRESHOLD}`, block_source: 'low_sincerity' };
  }
  // Rule 4: Consensus failed → BLOCK
  if (!consensusResult.consensus_reached) {
    return { verdict: 'BLOCK', reason: `Consensus failed: ${consensusResult.consistent_count}/${BRAID_NODES.length} consistent (need ${CONSENSUS_THRESHOLD})`, block_source: 'consensus_failure' };
  }
  // All gates passed → PASS to Empathy Layer
  return { verdict: 'PASS', reason: 'Spindle verified: sincere, consensus-backed, Monkey-approved — passed to Empathy Layer', block_source: null };
}

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

    // ═══ Main Pipeline: Evaluate ═══
    const { agent_id, proposed_action, monkey_verdict } = body;
    if (!agent_id || !proposed_action || !monkey_verdict) {
      return Response.json({ error: 'Missing agent_id, proposed_action, or monkey_verdict' }, { status: 400 });
    }

    const startMs = Date.now();

    // Step 1: Fetch agent's recent behavior events (single query)
    const pastEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter(
      { agent_id },
      '-created_date',
      50
    );

    // Step 2: Regressive Trace — calculate sincerity from history
    const trace = regressiveTrace(pastEvents);

    // Step 3: 8-Node Sincerity Check — consensus from the consortium
    const consensus = sincerityCheck(trace.sincerity_score, pastEvents);

    // Step 4: Final Gate Decision
    const gate = gateDecision(monkey_verdict, trace.sincerity_score, consensus);

    const processingMs = Date.now() - startMs;

    const result = {
      agent_id,
      proposed_action,
      monkey_verdict,
      sincerity_score: trace.sincerity_score,
      sincerity_threshold: SINCERITY_THRESHOLD,
      consensus_verdict: consensus.consensus_verdict,
      consistent_count: consensus.consistent_count,
      inconsistent_count: consensus.inconsistent_count,
      consensus_threshold: CONSENSUS_THRESHOLD,
      node_votes: consensus.node_votes,
      spindle_verdict: gate.verdict,
      spindle_reason: gate.reason,
      block_source: gate.block_source,
      trace_events_used: trace.trace_trail.length,
      processing_ms: processingMs,
    };

    // ── Persist verdict to Memory ──
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'spindle_system',
      user_id: agent_id,
      type: 'observation',
      content: `Spindle Gate: ${gate.verdict}. Sincerity: ${trace.sincerity_score}. Consensus: ${consensus.consensus_verdict} (${consensus.consistent_count}/8). Monkey: ${monkey_verdict}. Action: ${proposed_action}`,
      keywords: ['spindle', 'spindle_gate', 'spindle_gate_verdict', gate.verdict.toLowerCase(), agent_id],
      importance: gate.verdict === 'BLOCK' ? 8 : 4,
      context: JSON.stringify({
        verdict: gate.verdict,
        reason: gate.reason,
        block_source: gate.block_source,
        sincerity_score: trace.sincerity_score,
        consensus_verdict: consensus.consensus_verdict,
        consistent_count: consensus.consistent_count,
        monkey_verdict,
      }),
      related_entity_id: agent_id,
      related_entity_type: 'Agent',
    });

    // ── If BLOCK, create TripwireEvent ──
    if (gate.verdict === 'BLOCK') {
      await base44.asServiceRole.entities.TripwireEvent.create({
        event_type: 'access_violation',
        severity: gate.block_source === 'monkey_quarantine' ? 'critical' : 'high',
        status: 'active',
        source_node: 'Spindle Gate',
        description: `Spindle BLOCKED agent ${agent_id}: ${gate.reason}`,
        details: { sincerity_score: trace.sincerity_score, consensus: consensus.consensus_verdict, monkey_verdict, proposed_action, block_source: gate.block_source },
        affected_entity_type: 'Agent',
        affected_entity_id: agent_id,
      });
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});