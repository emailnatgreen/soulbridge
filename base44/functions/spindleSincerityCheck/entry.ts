import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Canonical 8-Node Braid — hardcoded for deterministic consensus
const BRAID_NODES = [
  { index: 0, name: 'Node 0 (Source)',    address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg' },
  { index: 1, name: 'Sentinel Node',      address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32' },
  { index: 2, name: 'Lore Node',          address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7' },
  { index: 3, name: 'Truth Weaver',       address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV' },
  { index: 4, name: 'Did It Node',        address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny' },
  { index: 5, name: 'Soulbridge (Axi)',   address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h' },
  { index: 6, name: 'Human Node',         address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia' },
  { index: 7, name: 'Code Node',          address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P' },
];

const CONSENSUS_THRESHOLD = 6; // Minimum CONSISTENT votes required

// ── Node Evaluation Perspectives ──
// Each node has a unique lens through which it evaluates sincerity.
// This simulates the 8-node consortium each checking their own memory domain.
const NODE_PERSPECTIVES = {
  0: { name: 'origin',     weight_field: 'relevance_score',   tolerance: 15, bias: 'neutral' },
  1: { name: 'sentinel',   weight_field: 'relevance_score',   tolerance: 10, bias: 'strict' },    // Security-focused, tight tolerance
  2: { name: 'lore',       weight_field: 'co_evolution_score', tolerance: 20, bias: 'generous' },  // Narrative-aware, wider tolerance
  3: { name: 'truth',      weight_field: 'alignment_score',    tolerance: 12, bias: 'strict' },    // Truth verification, tight
  4: { name: 'didit',      weight_field: 'alignment_score',    tolerance: 18, bias: 'neutral' },   // Action verification
  5: { name: 'soulbridge', weight_field: 'co_evolution_score', tolerance: 15, bias: 'neutral' },   // Village alignment
  6: { name: 'human',      weight_field: 'relevance_score',    tolerance: 25, bias: 'generous' },  // Human empathy, widest tolerance
  7: { name: 'code',       weight_field: 'alignment_score',    tolerance: 10, bias: 'strict' },    // Deterministic, strictest
};

/**
 * Each node independently evaluates the proposed action against the agent's
 * past behavior from its own perspective. The node calculates its own
 * "expected sincerity" from the trace trail, then compares it to the
 * reported sincerity score. If the delta is within tolerance → CONSISTENT.
 */
function nodeEvaluate(nodeIndex, sincerityScore, traceTrail) {
  const perspective = NODE_PERSPECTIVES[nodeIndex];
  if (!perspective || traceTrail.length === 0) {
    // No data to evaluate — abstain (counted as CONSISTENT for new agents)
    return { vote: 'CONSISTENT', reason: 'No trace data — default trust for new agent', expected: sincerityScore, delta: 0 };
  }

  // Each node calculates its own expected sincerity from the trace trail
  // using its unique weight_field as the primary signal
  let nodeSum = 0;
  let count = 0;

  for (const event of traceTrail) {
    const val = event[perspective.weight_field];
    if (typeof val === 'number') {
      nodeSum += val;
      count++;
    }
  }

  const nodeExpected = count > 0 ? Math.round(nodeSum / count) : 50;

  // Calculate delta between reported sincerity and node's own calculation
  const delta = Math.abs(sincerityScore - nodeExpected);

  // Apply bias modifier
  let effectiveTolerance = perspective.tolerance;
  if (perspective.bias === 'strict') effectiveTolerance -= 3;
  if (perspective.bias === 'generous') effectiveTolerance += 3;

  const vote = delta <= effectiveTolerance ? 'CONSISTENT' : 'INCONSISTENT';
  const reason = vote === 'CONSISTENT'
    ? `Delta ${delta} within ${perspective.name} tolerance (${effectiveTolerance})`
    : `Delta ${delta} exceeds ${perspective.name} tolerance (${effectiveTolerance})`;

  return { vote, reason, expected: nodeExpected, delta };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { agent_id, proposed_action, sincerity_score, trace_trail, action } = body;

    // ── Admin query endpoint ──
    if (action === 'query_recent') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Return recent spindle checks from memory
      const recentMemories = await base44.asServiceRole.entities.Memory.filter(
        { type: 'observation', keywords: 'spindle_sincerity_check' },
        '-created_date',
        20
      );
      return Response.json({ recent_checks: recentMemories });
    }

    // ── Main sincerity check ──
    if (!agent_id || !proposed_action || typeof sincerity_score !== 'number') {
      return Response.json({ error: 'Missing agent_id, proposed_action, or sincerity_score' }, { status: 400 });
    }

    // Fetch the agent's recent behavior events for node-local evaluation
    // (trace_trail may come from spindleRegressiveTrace, but nodes need raw scores)
    let nodeTraceData = [];
    if (trace_trail && trace_trail.length > 0) {
      // If trace_trail includes event IDs, fetch full records for score data
      const eventIds = trace_trail.map(t => t.id).filter(Boolean);
      if (eventIds.length > 0) {
        const allEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter(
          { agent_id },
          '-created_date',
          50
        );
        nodeTraceData = allEvents;
      }
    }

    // If no trace data provided, fetch directly
    if (nodeTraceData.length === 0) {
      nodeTraceData = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter(
        { agent_id },
        '-created_date',
        50
      );
    }

    // ── Broadcast to all 8 nodes ──
    const nodeVotes = [];
    let consistentCount = 0;
    let inconsistentCount = 0;

    for (const node of BRAID_NODES) {
      const evaluation = nodeEvaluate(node.index, sincerity_score, nodeTraceData);
      nodeVotes.push({
        node_index: node.index,
        node_name: node.name,
        node_address: node.address,
        vote: evaluation.vote,
        reason: evaluation.reason,
        expected_sincerity: evaluation.expected,
        delta: evaluation.delta,
      });

      if (evaluation.vote === 'CONSISTENT') consistentCount++;
      else inconsistentCount++;
    }

    const consensusReached = consistentCount >= CONSENSUS_THRESHOLD;
    const consensusVerdict = consensusReached ? 'CONSENSUS_PASS' : 'CONSENSUS_FAIL';

    const result = {
      agent_id,
      proposed_action,
      sincerity_score,
      consensus_verdict: consensusVerdict,
      consensus_reached: consensusReached,
      consistent_count: consistentCount,
      inconsistent_count: inconsistentCount,
      threshold: CONSENSUS_THRESHOLD,
      node_votes: nodeVotes,
      evaluated_at: new Date().toISOString(),
    };

    // ── Persist to Memory for audit trail ──
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'spindle_system',
      user_id: agent_id,
      type: 'observation',
      content: `Spindle Sincerity Check: ${consensusVerdict} (${consistentCount}/${BRAID_NODES.length} consistent). Sincerity: ${sincerity_score}. Action: ${proposed_action}`,
      keywords: ['spindle', 'sincerity_check', 'spindle_sincerity_check', consensusVerdict.toLowerCase(), agent_id],
      importance: consensusReached ? 5 : 8,
      context: JSON.stringify({
        sincerity_score,
        consensus_verdict: consensusVerdict,
        consistent_count: consistentCount,
        node_votes: nodeVotes.map(v => ({ node: v.node_name, vote: v.vote, delta: v.delta })),
      }),
      related_entity_id: agent_id,
      related_entity_type: 'Agent',
    });

    // ── If consensus fails, create TripwireEvent ──
    if (!consensusReached) {
      const dissenting = nodeVotes.filter(v => v.vote === 'INCONSISTENT').map(v => v.node_name);
      await base44.asServiceRole.entities.TripwireEvent.create({
        event_type: 'pattern_deviation',
        severity: 'high',
        status: 'active',
        source_node: 'Spindle',
        description: `Spindle consensus FAILED for agent ${agent_id}. ${consistentCount}/${BRAID_NODES.length} nodes consistent (need ${CONSENSUS_THRESHOLD}). Dissenting: ${dissenting.join(', ')}`,
        details: { sincerity_score, node_votes: nodeVotes, proposed_action },
        affected_entity_type: 'Agent',
        affected_entity_id: agent_id,
      });
    }

    return Response.json(result);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});