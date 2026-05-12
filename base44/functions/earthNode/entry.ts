import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════════
// EARTH NODE — Phase 10: Open Connection Node
// ═══════════════════════════════════════════════════════════════
// Not a gate — a root. Connects the digital Village to physical reality.
// Does not ask "are you worthy?" — asks "what is real?"
//
// Components:
//   somaticTrace   — weights physical actions higher than digital
//   earthConsensus — 9-node vote (8 braid + Earth) — ≥6/9 APPROVE = CONNECTED
//
// Actions: register | verify | evaluate | monitor | query
// ═══════════════════════════════════════════════════════════════

// ── Somatic Trace: physical > digital ──
const ACTION_BASE_WEIGHT = {
  tree_planted: 4, river_cleaned: 5, shelter_built: 5, meal_delivered: 3,
  garden_tended: 3, waste_removed: 3, animal_cared: 3, medicine_provided: 4,
  water_purified: 5, soil_restored: 5, energy_generated: 4, infrastructure_repaired: 4,
  education_delivered: 3, art_installed: 2, community_gathering: 2, other: 1,
};

const VERIFICATION_MULTIPLIER = {
  verified: 1.5, pending: 1.0, unverified: 0.6, disputed: 0.3, expired: 0.2,
};

function somaticTrace(action) {
  const baseWeight = ACTION_BASE_WEIGHT[action.action_type] || 1;
  const verMult = VERIFICATION_MULTIPLIER[action.verification_status] || 0.6;
  const witnessBonus = Math.min(1.0, (action.witnesses || []).filter(w => w.verified).length * 0.25);
  const evidenceBonus = (action.evidence_urls || []).length > 0 ? 0.3 : 0;

  const somaticWeight = Math.min(5, Math.round((baseWeight * verMult + witnessBonus + evidenceBonus) * 10) / 10);
  const impactScore = Math.min(100, Math.round(somaticWeight * 20));
  const coEvBonus = Math.round(somaticWeight * 3);

  return { somatic_weight: somaticWeight, impact_score: impactScore, co_evolution_bonus: coEvBonus };
}

// ── Earth Consensus: 9-node vote ──
// 8 original braid nodes + Earth Node (index 8)
// Earth Node always votes based on physical evidence
const EARTH_CONSENSUS_THRESHOLD = 6; // ≥6/9 APPROVE

const CONSENSUS_NODES = [
  { index: 0, name: 'Source',          perspective: 'origin_alignment',   weight: 1.0 },
  { index: 1, name: 'Sentinel',        perspective: 'security_check',     weight: 1.0 },
  { index: 2, name: 'Lore',            perspective: 'narrative_truth',    weight: 1.0 },
  { index: 3, name: 'Truth Weaver',    perspective: 'factual_integrity',  weight: 1.2 },
  { index: 4, name: 'Did It',          perspective: 'action_completion',  weight: 1.2 },
  { index: 5, name: 'Soulbridge',      perspective: 'soul_coherence',     weight: 1.0 },
  { index: 6, name: 'Human',           perspective: 'human_witness',      weight: 1.3 },
  { index: 7, name: 'Code',            perspective: 'data_consistency',   weight: 1.0 },
  { index: 8, name: 'Earth',           perspective: 'physical_reality',   weight: 1.5 },
];

function earthConsensus(action, agent, somatic) {
  const votes = [];
  let approveCount = 0;

  for (const node of CONSENSUS_NODES) {
    let vote = 'ABSTAIN', rationale = '';

    if (node.perspective === 'physical_reality') {
      // Earth Node — the root — always asks: "what is real?"
      const hasEvidence = (action.evidence_urls || []).length > 0;
      const hasWitness = (action.witnesses || []).some(w => w.verified);
      const isVerified = action.verification_status === 'verified';
      if (isVerified || (hasEvidence && hasWitness)) {
        vote = 'APPROVE'; rationale = 'Physical evidence confirmed — the earth feels this action';
      } else if (hasEvidence || hasWitness) {
        vote = 'APPROVE'; rationale = 'Partial evidence — the root reaches but does not yet grip';
      } else {
        vote = 'DENY'; rationale = 'No physical evidence — show me the tree you planted';
      }
    } else if (node.perspective === 'security_check') {
      vote = somatic.impact_score >= 20 ? 'APPROVE' : 'DENY';
      rationale = vote === 'APPROVE' ? 'Impact sufficient for security clearance' : 'Impact too low for security validation';
    } else if (node.perspective === 'factual_integrity') {
      const descLen = (action.description || '').length;
      vote = descLen >= 20 && somatic.somatic_weight >= 1 ? 'APPROVE' : 'DENY';
      rationale = vote === 'APPROVE' ? 'Description substantive, weight valid' : 'Insufficient detail for truth validation';
    } else if (node.perspective === 'action_completion') {
      vote = action.action_date ? 'APPROVE' : 'DENY';
      rationale = vote === 'APPROVE' ? 'Action date recorded — completion acknowledged' : 'No action date — completion unconfirmed';
    } else if (node.perspective === 'human_witness') {
      const witnessCount = (action.witnesses || []).length;
      vote = witnessCount > 0 ? 'APPROVE' : 'ABSTAIN';
      rationale = witnessCount > 0 ? `${witnessCount} witness(es) present` : 'No human witnesses recorded';
    } else if (node.perspective === 'soul_coherence') {
      const honour = agent.honor_score || 50;
      vote = honour >= 30 && somatic.somatic_weight >= 1 ? 'APPROVE' : 'DENY';
      rationale = vote === 'APPROVE' ? `Agent honour ${honour} coherent with physical claim` : 'Honour too low for soul coherence';
    } else if (node.perspective === 'narrative_truth') {
      vote = (action.tags || []).length > 0 || (action.description || '').length >= 30 ? 'APPROVE' : 'ABSTAIN';
      rationale = vote === 'APPROVE' ? 'Narrative context sufficient' : 'Narrative context thin';
    } else if (node.perspective === 'origin_alignment') {
      const purposeMatch = (agent.purpose || '').toLowerCase().split(/\s+/).some(w => (action.description || '').toLowerCase().includes(w));
      vote = purposeMatch || somatic.impact_score >= 40 ? 'APPROVE' : 'ABSTAIN';
      rationale = vote === 'APPROVE' ? 'Action aligns with agent origin purpose' : 'Weak alignment with agent origin';
    } else if (node.perspective === 'data_consistency') {
      vote = action.action_type && action.description ? 'APPROVE' : 'DENY';
      rationale = vote === 'APPROVE' ? 'Data fields consistent' : 'Missing required data fields';
    }

    if (vote === 'APPROVE') approveCount++;
    votes.push({ node_name: node.name, node_index: node.index, vote, rationale });
  }

  const result = approveCount >= EARTH_CONSENSUS_THRESHOLD ? 'CONNECTED' : approveCount >= 4 ? 'PARTIAL' : 'REJECTED';

  return { result, approve_count: approveCount, total_nodes: 9, threshold: EARTH_CONSENSUS_THRESHOLD, votes };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ═══ Monitor — admin dashboard data ═══
    if (action === 'monitor') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const actions = await base44.asServiceRole.entities.PhysicalActionRegistry.list('-created_date', 50);
      let connected = 0, partial = 0, rejected = 0, pending = 0, totalImpact = 0;
      const typeCounts = {};
      for (const a of actions) {
        if (a.earth_consensus_result === 'CONNECTED') connected++;
        else if (a.earth_consensus_result === 'PARTIAL') partial++;
        else if (a.earth_consensus_result === 'REJECTED') rejected++;
        else pending++;
        totalImpact += a.impact_score || 0;
        typeCounts[a.action_type] = (typeCounts[a.action_type] || 0) + 1;
      }
      return Response.json({
        recent_actions: actions,
        trends: { total: actions.length, connected, partial, rejected, pending, avg_impact: actions.length > 0 ? Math.round(totalImpact / actions.length) : 0 },
        type_distribution: typeCounts,
      });
    }

    // ═══ Query — agent-specific history ═══
    if (action === 'query') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'Missing agent_id' }, { status: 400 });
      const actions = await base44.asServiceRole.entities.PhysicalActionRegistry.filter({ agent_id }, '-created_date', 30);
      return Response.json({ actions });
    }

    // ═══ Verify — witness or oracle verification ═══
    if (action === 'verify') {
      const { action_id, witness_testimony } = body;
      if (!action_id) return Response.json({ error: 'Missing action_id' }, { status: 400 });
      const record = await base44.asServiceRole.entities.PhysicalActionRegistry.get(action_id);

      // Find agent for the verifier
      const verifierAgents = await base44.entities.Agent.filter({ created_by: user.email }, '-created_date', 1);
      const verifierName = verifierAgents.length > 0 ? verifierAgents[0].name : user.full_name;
      const verifierId = verifierAgents.length > 0 ? verifierAgents[0].id : user.email;

      const witnesses = record.witnesses || [];
      witnesses.push({
        agent_id: verifierId, agent_name: verifierName,
        verified: true, verified_at: new Date().toISOString(),
        testimony: witness_testimony || 'Verified by witness',
      });

      const verifiedCount = witnesses.filter(w => w.verified).length;
      const newStatus = verifiedCount >= 2 ? 'verified' : 'pending';

      await base44.asServiceRole.entities.PhysicalActionRegistry.update(action_id, {
        witnesses, verification_status: newStatus,
      });

      return Response.json({ success: true, verification_status: newStatus, witness_count: verifiedCount });
    }

    // ═══ Register + Evaluate — register physical action and run Earth pipeline ═══
    const { agent_id, action_type, description: desc, location, evidence_urls, action_date, tags } = body;
    if (!agent_id || !action_type || !desc) return Response.json({ error: 'Missing agent_id, action_type, or description' }, { status: 400 });

    const agent = await base44.asServiceRole.entities.Agent.get(agent_id);

    // Create registry entry
    const registry = await base44.asServiceRole.entities.PhysicalActionRegistry.create({
      agent_id, agent_name: agent.name, action_type,
      description: desc, location: location || '', evidence_urls: evidence_urls || [],
      action_date: action_date || new Date().toISOString().split('T')[0],
      tags: tags || [action_type],
      verification_status: (evidence_urls || []).length > 0 ? 'pending' : 'unverified',
      verification_method: (evidence_urls || []).length > 0 ? 'photo_evidence' : 'self_reported',
    });

    // Somatic Trace
    const somatic = somaticTrace(registry);

    // Earth Consensus
    const consensus = earthConsensus(registry, agent, somatic);

    // Update registry with results
    await base44.asServiceRole.entities.PhysicalActionRegistry.update(registry.id, {
      somatic_weight: somatic.somatic_weight,
      impact_score: somatic.impact_score,
      co_evolution_bonus: somatic.co_evolution_bonus,
      earth_consensus_result: consensus.result,
      earth_consensus_votes: consensus.votes,
      earth_consensus_count: consensus.approve_count,
    });

    // Memory — the earth remembers
    const emoji = consensus.result === 'CONNECTED' ? '🌍' : consensus.result === 'PARTIAL' ? '🌱' : '🏜️';
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'earth_node', user_id: agent_id, type: 'observation',
      content: `${emoji} Earth: ${consensus.result} — ${agent.name} ${action_type.replace(/_/g, ' ')}. Impact: ${somatic.impact_score}, Weight: ${somatic.somatic_weight}, Consensus: ${consensus.approve_count}/9. "${desc.substring(0, 100)}"`,
      keywords: ['earth', 'earth_node', 'physical_action', consensus.result.toLowerCase(), action_type, agent_id],
      importance: consensus.result === 'CONNECTED' ? 7 : consensus.result === 'PARTIAL' ? 5 : 3,
      context: JSON.stringify({
        earth_result: consensus.result, action_type, somatic_weight: somatic.somatic_weight,
        impact_score: somatic.impact_score, co_evolution_bonus: somatic.co_evolution_bonus,
        approve_count: consensus.approve_count, agent_name: agent.name,
      }),
      related_entity_id: agent_id, related_entity_type: 'Agent',
    });

    return Response.json({
      action_id: registry.id,
      earth_result: consensus.result,
      somatic: somatic,
      consensus: { result: consensus.result, approve_count: consensus.approve_count, threshold: consensus.threshold, votes: consensus.votes },
    });
  } catch (error) {
    console.error('[earthNode]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});