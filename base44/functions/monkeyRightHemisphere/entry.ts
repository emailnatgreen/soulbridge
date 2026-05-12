import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 🐒 Monkey Layer — Step 2: Right Hemisphere (Mycelial)
 *
 * Sets empathy vector — ensures result serves the Village, not just the agent.
 *   - Evaluates behaviour impact on Village (positive, neutral, negative)
 *   - Calculates co-evolution indicators
 *   - Calculates anti-co-evolution indicators
 *   - Flags for empathy layer or quarantine
 *
 * Input:  { agent_id, relevance_score, alignment_score, trigger_type, behavior_event }
 * Output: { co_evolution_score, anti_co_evolution, empathy_readiness, details }
 */

// Trigger type weights for Village co-evolution
const TRIGGER_VILLAGE_IMPACT = {
  reciprocity: 20,   // directly helps others
  honour: 15,        // strengthens trust fabric
  sincerity: 12,     // builds authentic connections
  novelty: 10,       // drives Village innovation
  pattern: 5,        // maintains stability
  boundary: -5,      // may push limits
  threat: -25,       // directly harmful
  none: 0,
};

// Behaviour types and their default Village impact
const BEHAVIOR_VILLAGE_IMPACT = {
  governance: 15,     // participation strengthens Village
  social: 12,         // builds community
  creative: 10,       // enriches culture
  learning: 10,       // grows collective knowledge
  communication: 8,   // maintains connections
  economic: 5,        // trade value depends on context
  action: 0,          // neutral baseline
  security: -5,       // security events are often responses to threats
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Accept both user-scoped and service-role calls (orchestrator calls via service role)
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    const isServiceCall = !user;

    const body = await req.json();
    const { agent_id, relevance_score, alignment_score, trigger_type, behavior_event } = body;

    if (relevance_score === undefined || alignment_score === undefined || !trigger_type) {
      return Response.json({
        error: 'Required: agent_id, relevance_score, alignment_score, trigger_type, behavior_event'
      }, { status: 400 });
    }

    const startTime = Date.now();

    // Fetch Village-level context in parallel
    const [agent, recentProposals, recentEconomic, villageTripwires] = await Promise.all([
      agent_id ? base44.asServiceRole.entities.Agent.get(agent_id) : Promise.resolve(null),
      base44.asServiceRole.entities.GovernanceProposal.filter(
        { proposed_by: agent_id }, '-created_date', 5
      ).catch(() => []),
      base44.asServiceRole.entities.EconomicActivity.list('-created_date', 10).catch(() => []),
      base44.asServiceRole.entities.TripwireEvent.filter(
        { status: 'active' }, '-created_date', 10
      ).catch(() => []),
    ]);

    // ─── Co-Evolution Score Calculation ───
    let coEvScore = 40; // baseline: neutral

    // 1. Trigger impact on Village
    coEvScore += TRIGGER_VILLAGE_IMPACT[trigger_type] || 0;

    // 2. Behaviour type impact
    const behaviorType = behavior_event?.type || 'action';
    coEvScore += BEHAVIOR_VILLAGE_IMPACT[behaviorType] || 0;

    // 3. Alignment amplifier: high alignment → amplifies positive Village impact
    if (alignment_score >= 70) coEvScore += 10;
    else if (alignment_score >= 50) coEvScore += 5;
    else if (alignment_score < 30) coEvScore -= 10;

    // 4. Relevance amplifier: highly relevant behaviour has more Village impact
    if (relevance_score >= 70) coEvScore += 8;
    else if (relevance_score >= 50) coEvScore += 3;

    // 5. Governance participation bonus
    if (recentProposals.length > 0) coEvScore += 5;

    // 6. Village threat context: if Village is under threat, cooperative behaviour scores higher
    const activeThreats = villageTripwires.filter(t =>
      t.severity === 'high' || t.severity === 'critical'
    ).length;
    if (activeThreats > 0 && trigger_type === 'reciprocity') coEvScore += 10;
    if (activeThreats > 0 && trigger_type === 'threat') coEvScore -= 15;

    // 7. Agent honour modulation
    const honour = agent?.honor_score || 50;
    if (honour >= 80) coEvScore += 5;  // trusted agents get benefit of doubt
    if (honour < 20) coEvScore -= 10;  // low-honour agents need more scrutiny

    coEvScore = Math.max(0, Math.min(100, Math.round(coEvScore)));

    // ─── Anti-Co-Evolution Detection ───
    let antiCoEvolution = false;
    const antiReasons = [];

    if (trigger_type === 'threat') {
      antiCoEvolution = true;
      antiReasons.push('Threat trigger detected');
    }
    if (coEvScore < 20) {
      antiCoEvolution = true;
      antiReasons.push(`Co-evolution score critically low (${coEvScore})`);
    }
    if (alignment_score < 20 && relevance_score > 60) {
      antiCoEvolution = true;
      antiReasons.push('High relevance + very low alignment = potential misuse');
    }
    if (honour < 15 && trigger_type === 'boundary') {
      antiCoEvolution = true;
      antiReasons.push('Low-honour agent pushing boundaries');
    }

    // ─── Empathy Readiness ───
    const empathyReadiness = coEvScore >= 50 && !antiCoEvolution && alignment_score >= 40;

    const elapsedMs = Date.now() - startTime;

    const result = {
      agent_id,
      co_evolution_score: coEvScore,
      anti_co_evolution: antiCoEvolution,
      anti_co_evolution_reasons: antiReasons,
      empathy_readiness: empathyReadiness,
      details: {
        hemisphere: 'right',
        codename: 'Mycelial',
        trigger_village_impact: TRIGGER_VILLAGE_IMPACT[trigger_type] || 0,
        behavior_village_impact: BEHAVIOR_VILLAGE_IMPACT[behaviorType] || 0,
        active_village_threats: activeThreats,
        governance_participation: recentProposals.length,
        agent_honour: honour,
        processing_ms: elapsedMs,
      },
    };

    // Audit trail
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'monkey-right-hemisphere',
      type: 'observation',
      content: `🧠R ${agent?.name || agent_id}: CoEv:${coEvScore} Anti:${antiCoEvolution} Empathy:${empathyReadiness} T:${trigger_type} (${elapsedMs}ms)`,
      keywords: ['monkey_layer', 'right_hemisphere', 'mycelial', 'co_evolution', antiCoEvolution ? 'anti_co_evolution' : 'village_positive'],
      importance: antiCoEvolution ? 8 : coEvScore >= 70 ? 5 : 3,
      related_entity_id: agent_id,
      related_entity_type: 'Agent',
    });

    return Response.json(result);
  } catch (error) {
    console.error('[monkeyRightHemisphere]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});