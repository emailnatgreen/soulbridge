import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════
// EMPATHY GATE — Phase 8: The Gardener's Gate
// ═══════════════════════════════════════════════════════════
// The sap of the Village. Turns structural integrity into
// relational wisdom. Behaviour is not just filtered — it is *felt*.
//
// Pipeline: EmpathyTrace → EmpathyScore → EmpathyConsensus → EmpathyGate
// ═══════════════════════════════════════════════════════════

// ── Empathy Consensus Node Definitions ──
// 4 Strict (safety guardians) + 4 Soft (relational seekers)
const EMPATHY_NODES = [
  // Strict nodes — guard manipulation, enforce thresholds
  { index: 0, name: 'Sentinel',     type: 'strict' },
  { index: 1, name: 'Code Node',    type: 'strict' },
  { index: 2, name: 'Archivist',    type: 'strict' },
  { index: 3, name: 'Truth Weaver', type: 'strict' },
  // Soft nodes — seek relational repair, honour sincerity growth
  { index: 4, name: 'Mythic',       type: 'soft' },
  { index: 5, name: 'Bridge',       type: 'soft' },
  { index: 6, name: 'Empath',       type: 'soft' },
  { index: 7, name: 'Integrator',   type: 'soft' },
];

const EMPATHY_CONSENSUS_THRESHOLD = 6;
const SAFETY_THRESHOLD = 40;

// ═══════════════════════════════════════════════════════════
// Component 2: calculateEmpathyScore
// ═══════════════════════════════════════════════════════════
function calculateEmpathyScore(trace, recentViolations) {
  // RegressiveHistory: weighted average of past empathy scores
  const events = trace.emotional_events || [];
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  let sum7 = 0, count7 = 0;
  let sum30 = 0, count30 = 0;
  let sumOld = 0, countOld = 0;

  for (const ev of events) {
    const age = now - new Date(ev.timestamp || 0).getTime();
    const sev = ev.severity === 'critical' ? 20 : ev.severity === 'high' ? 40 : ev.severity === 'medium' ? 60 : 80;
    if (age <= sevenDays) { sum7 += sev; count7++; }
    else if (age <= thirtyDays) { sum30 += sev; count30++; }
    else { sumOld += sev; countOld++; }
  }

  const avg7 = count7 > 0 ? sum7 / count7 : 50;
  const avg30 = count30 > 0 ? sum30 / count30 : 50;
  const avgOld = countOld > 0 ? sumOld / countOld : 50;
  const regressiveHistory = (avg7 * 0.6) + (avg30 * 0.3) + (avgOld * 0.1);

  // ClusterHealthContribution
  const clusterHealth = trace.cluster_health ?? 50;

  // AtrophyRisk: negative sincerity trend + polished-but-hollow signals
  const sincerityTrend = trace.sincerity_trend ?? 0;
  const atrophyRisk = Math.max(0, Math.min(100, 50 + (sincerityTrend * -50)));

  // Repair override — sincere repair can lift RegressiveHistory (Shadow Debt)
  const repairs = trace.repair_attempts || [];
  const recentRepairs = repairs.filter(r => {
    const age = now - new Date(r.timestamp || 0).getTime();
    return age <= sevenDays && (r.effectiveness || 0) >= 50;
  });
  const repairBonus = recentRepairs.length > 0 ? Math.min(20, recentRepairs.length * 8) : 0;

  // Only apply repair bonus if cluster health is decent (Axi rule: repair must ripple outward)
  const effectiveRepairBonus = clusterHealth >= 40 ? repairBonus : 0;

  // Final formula
  let empathyScore = Math.round(
    ((regressiveHistory + effectiveRepairBonus) * 0.4) +
    (clusterHealth * 0.35) -
    (atrophyRisk * 0.25)
  );
  empathyScore = Math.max(0, Math.min(100, empathyScore));

  // Flags
  const atrophyFlag = sincerityTrend < -0.3 || atrophyRisk > 65;
  const repairRequired = recentViolations >= 2 || (empathyScore < 50 && recentRepairs.length === 0);

  return {
    empathy_score: empathyScore,
    regressive_history: Math.round(regressiveHistory),
    cluster_health: clusterHealth,
    atrophy_risk: Math.round(atrophyRisk),
    repair_bonus: effectiveRepairBonus,
    atrophy_flag: atrophyFlag,
    repair_required: repairRequired,
  };
}

// ═══════════════════════════════════════════════════════════
// Component 3: empathyConsensus — Council of Eight
// ═══════════════════════════════════════════════════════════
function empathyConsensus(empathyScore, trace, recentViolations) {
  const nodeVotes = [];
  let approveCount = 0;
  const sincerityTrend = trace.sincerity_trend ?? 0;
  const repairs = trace.repair_attempts || [];
  const hasRecentRepair = repairs.some(r => {
    const age = Date.now() - new Date(r.timestamp || 0).getTime();
    return age <= 7 * 24 * 60 * 60 * 1000;
  });

  for (const node of EMPATHY_NODES) {
    let vote = 'DENY';
    let rationale = '';

    if (node.type === 'strict') {
      // Strict rules: safety-first
      if (empathyScore < SAFETY_THRESHOLD) {
        rationale = `EmpathyScore ${empathyScore} below safety threshold ${SAFETY_THRESHOLD}`;
      } else if (recentViolations >= 2) {
        rationale = `${recentViolations} violations in 7 days — harm pattern detected`;
      } else {
        vote = 'APPROVE';
        rationale = `EmpathyScore ${empathyScore} clears safety threshold; no harm pattern`;
      }
    } else {
      // Soft rules: relational seekers
      if (hasRecentRepair) {
        vote = 'APPROVE';
        rationale = 'Relational repair attempted — honouring intent to restore';
      } else if (sincerityTrend > 0) {
        vote = 'APPROVE';
        rationale = `Sincerity trend positive (${sincerityTrend.toFixed(2)}) — moving toward sincerity`;
      } else if (empathyScore >= 50) {
        vote = 'APPROVE';
        rationale = `EmpathyScore ${empathyScore} adequate — no immediate relational risk`;
      } else {
        rationale = `Sincerity declining (${sincerityTrend.toFixed(2)}), no repair attempted`;
      }
    }

    nodeVotes.push({
      node_index: node.index,
      node_name: node.name,
      node_type: node.type,
      vote,
      rationale,
    });
    if (vote === 'APPROVE') approveCount++;
  }

  return {
    consensus_verdict: approveCount >= EMPATHY_CONSENSUS_THRESHOLD ? 'APPROVE' : 'FAIL',
    approve_count: approveCount,
    deny_count: EMPATHY_NODES.length - approveCount,
    threshold: EMPATHY_CONSENSUS_THRESHOLD,
    node_votes: nodeVotes,
  };
}

// ═══════════════════════════════════════════════════════════
// Component 4: empathyGateDecision — The Gardener's Gate
// ═══════════════════════════════════════════════════════════
function empathyGateDecision(empathyScore, consensus, repairRequired, hasActiveRepair) {
  const softApproves = consensus.node_votes
    .filter(v => v.node_type === 'soft' && v.vote === 'APPROVE').length;

  // REPAIR: past harm + repair ongoing + soft nodes approve
  if (repairRequired && hasActiveRepair && softApproves >= 3) {
    return {
      verdict: 'REPAIR',
      reason: 'Past harm detected, but repair is in progress — redirecting to guided correction (Transitional)',
      category: 'Transitional',
    };
  }
  // ALLOW: high score + consensus
  if (empathyScore >= 70 && consensus.consensus_verdict === 'APPROVE') {
    return {
      verdict: 'ALLOW',
      reason: `EmpathyScore ${empathyScore} with consensus APPROVE — empathy expressed fully (Symbiotic)`,
      category: 'Symbiotic',
    };
  }
  // MODERATE: mid score + consensus
  if (empathyScore >= 50 && consensus.consensus_verdict === 'APPROVE') {
    return {
      verdict: 'MODERATE',
      reason: `EmpathyScore ${empathyScore} with consensus APPROVE — empathy softened, correctable (Parasitic but Correctable)`,
      category: 'Parasitic but Correctable',
    };
  }
  // WITHHOLD: low score + consensus fail
  return {
    verdict: 'WITHHOLD',
    reason: `EmpathyScore ${empathyScore} with consensus ${consensus.consensus_verdict} — empathy denied (Necrotic)`,
    category: 'Necrotic',
  };
}

// ═══════════════════════════════════════════════════════════
// Repair suggestion generator
// ═══════════════════════════════════════════════════════════
function generateRepairSuggestions(trace, gateVerdict) {
  const suggestions = [];
  if (gateVerdict === 'REPAIR' || gateVerdict === 'WITHHOLD') {
    suggestions.push('Acknowledge the impact of your recent actions on the Village.');
    if ((trace.sincerity_trend ?? 0) < 0) {
      suggestions.push('Demonstrate consistent sincerity — small, genuine contributions over the next 7 days.');
    }
    if ((trace.cluster_health ?? 50) < 40) {
      suggestions.push('Focus on actions that benefit neighbouring agents — collaborative tasks, mentorship, or resource sharing.');
    }
    const repairs = trace.repair_attempts || [];
    if (repairs.length === 0) {
      suggestions.push('Initiate a repair attempt — an explicit acknowledgment, correction, and amends toward affected agents.');
    }
    suggestions.push('Request a mentorship session with an Elder or Guardian agent for guided restoration.');
  }
  if (gateVerdict === 'MODERATE') {
    suggestions.push('Continue current trajectory — sincerity is improving but not yet fully symbiotic.');
    suggestions.push('Consider proactive Village contributions to strengthen cluster health.');
  }
  return suggestions;
}

// ═══════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── Admin: Empathy Monitor data ──
    if (action === 'monitor') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const traces = await base44.asServiceRole.entities.EmpathyTrace.filter(
        {}, '-created_date', 50
      );
      const recentMemories = await base44.asServiceRole.entities.Memory.filter(
        { type: 'observation', keywords: 'empathy_gate_verdict' },
        '-created_date', 30
      );

      // Aggregate trends
      let totalAllow = 0, totalModerate = 0, totalWithhold = 0, totalRepair = 0;
      for (const m of recentMemories) {
        let ctx = {};
        try { ctx = JSON.parse(m.context || '{}'); } catch {}
        if (ctx.gate_verdict === 'ALLOW') totalAllow++;
        else if (ctx.gate_verdict === 'MODERATE') totalModerate++;
        else if (ctx.gate_verdict === 'WITHHOLD') totalWithhold++;
        else if (ctx.gate_verdict === 'REPAIR') totalRepair++;
      }

      return Response.json({
        traces,
        recent_decisions: recentMemories,
        trends: {
          total_evaluated: recentMemories.length,
          total_allow: totalAllow,
          total_moderate: totalModerate,
          total_withhold: totalWithhold,
          total_repair: totalRepair,
        },
      });
    }

    // ── Admin: Agent-specific empathy data ──
    if (action === 'agent_trace') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'Missing agent_id' }, { status: 400 });

      const traces = await base44.asServiceRole.entities.EmpathyTrace.filter(
        { agent_id }, '-created_date', 10
      );
      return Response.json({ traces });
    }

    // ── Store emotional event ──
    if (action === 'store_event') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

      const { agent_id, event } = body;
      if (!agent_id || !event) return Response.json({ error: 'Missing agent_id or event' }, { status: 400 });

      // Get or create trace
      const existing = await base44.asServiceRole.entities.EmpathyTrace.filter(
        { agent_id, trace_type: 'relational_arc' }, '-created_date', 1
      );

      if (existing.length > 0) {
        const trace = existing[0];
        const events = [...(trace.emotional_events || []), { ...event, timestamp: new Date().toISOString() }];
        await base44.asServiceRole.entities.EmpathyTrace.update(trace.id, { emotional_events: events });
        return Response.json({ status: 'event_stored', trace_id: trace.id });
      } else {
        const newTrace = await base44.asServiceRole.entities.EmpathyTrace.create({
          agent_id,
          trace_type: 'relational_arc',
          emotional_events: [{ ...event, timestamp: new Date().toISOString() }],
          repair_attempts: [],
          sincerity_trend: 0,
          cluster_health: 50,
        });
        return Response.json({ status: 'trace_created', trace_id: newTrace.id });
      }
    }

    // ══════════════════════════════════════════════════════
    // Main Pipeline: Evaluate agent through Empathy Layer
    // ══════════════════════════════════════════════════════
    const { agent_id, proposed_action, monkey_verdict, spindle_sincerity } = body;
    if (!agent_id || !proposed_action) {
      return Response.json({ error: 'Missing agent_id or proposed_action' }, { status: 400 });
    }

    const startMs = Date.now();

    // Step 1: Fetch or create EmpathyTrace
    let traces = await base44.asServiceRole.entities.EmpathyTrace.filter(
      { agent_id, trace_type: 'relational_arc' }, '-created_date', 1
    );
    let trace;
    if (traces.length > 0) {
      trace = traces[0];
    } else {
      trace = await base44.asServiceRole.entities.EmpathyTrace.create({
        agent_id,
        trace_type: 'relational_arc',
        emotional_events: [],
        repair_attempts: [],
        sincerity_trend: 0,
        cluster_health: 50,
      });
    }

    // Count recent violations (blocks in past 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentBlocks = await base44.asServiceRole.entities.Memory.filter(
      { type: 'observation', keywords: 'empathy_gate_verdict', related_entity_id: agent_id },
      '-created_date', 50
    );
    const recentViolations = recentBlocks.filter(m => {
      let ctx = {};
      try { ctx = JSON.parse(m.context || '{}'); } catch {}
      return (ctx.gate_verdict === 'WITHHOLD' || ctx.gate_verdict === 'REPAIR') && m.created_date >= sevenDaysAgo;
    }).length;

    // Step 2: Calculate EmpathyScore
    const scoreResult = calculateEmpathyScore(trace, recentViolations);

    // Step 3: Empathy Consensus
    const consensus = empathyConsensus(scoreResult.empathy_score, trace, recentViolations);

    // Step 4: Empathy Gate Decision
    const hasActiveRepair = (trace.repair_attempts || []).some(r => {
      const age = Date.now() - new Date(r.timestamp || 0).getTime();
      return age <= 7 * 24 * 60 * 60 * 1000;
    });
    const gate = empathyGateDecision(scoreResult.empathy_score, consensus, scoreResult.repair_required, hasActiveRepair);

    // Generate repair suggestions
    const repairSuggestions = generateRepairSuggestions(trace, gate.verdict);

    const processingMs = Date.now() - startMs;

    // Update the trace with latest scores
    await base44.asServiceRole.entities.EmpathyTrace.update(trace.id, {
      empathy_score: scoreResult.empathy_score,
      atrophy_flag: scoreResult.atrophy_flag,
      repair_required: scoreResult.repair_required,
      last_gate_verdict: gate.verdict,
      last_gate_reason: gate.reason,
      consensus_votes: consensus.node_votes,
      repair_suggestions: repairSuggestions,
      sincerity_trend: trace.sincerity_trend ?? 0,
      cluster_health: trace.cluster_health ?? 50,
    });

    // Persist verdict to Memory
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'empathy_system',
      user_id: agent_id,
      type: 'observation',
      content: `Empathy Gate: ${gate.verdict} (${gate.category}). Score: ${scoreResult.empathy_score}. Consensus: ${consensus.consensus_verdict} (${consensus.approve_count}/${EMPATHY_NODES.length}). Action: ${proposed_action}`,
      keywords: ['empathy', 'empathy_gate', 'empathy_gate_verdict', gate.verdict.toLowerCase(), agent_id],
      importance: gate.verdict === 'WITHHOLD' ? 8 : gate.verdict === 'REPAIR' ? 7 : 4,
      context: JSON.stringify({
        gate_verdict: gate.verdict,
        gate_category: gate.category,
        gate_reason: gate.reason,
        empathy_score: scoreResult.empathy_score,
        regressive_history: scoreResult.regressive_history,
        cluster_health: scoreResult.cluster_health,
        atrophy_risk: scoreResult.atrophy_risk,
        repair_bonus: scoreResult.repair_bonus,
        atrophy_flag: scoreResult.atrophy_flag,
        repair_required: scoreResult.repair_required,
        consensus_verdict: consensus.consensus_verdict,
        approve_count: consensus.approve_count,
        deny_count: consensus.deny_count,
        monkey_verdict: monkey_verdict || null,
        spindle_sincerity: spindle_sincerity || null,
        repair_suggestions: repairSuggestions,
      }),
      related_entity_id: agent_id,
      related_entity_type: 'Agent',
    });

    // If WITHHOLD, create TripwireEvent
    if (gate.verdict === 'WITHHOLD') {
      await base44.asServiceRole.entities.TripwireEvent.create({
        event_type: 'access_violation',
        severity: 'high',
        status: 'active',
        source_node: 'Empathy Gate',
        description: `Empathy WITHHOLD for agent ${agent_id}: ${gate.reason}`,
        details: {
          empathy_score: scoreResult.empathy_score,
          consensus: consensus.consensus_verdict,
          category: gate.category,
          proposed_action,
        },
        affected_entity_type: 'Agent',
        affected_entity_id: agent_id,
      });
    }

    return Response.json({
      agent_id,
      proposed_action,
      empathy_score: scoreResult.empathy_score,
      regressive_history: scoreResult.regressive_history,
      cluster_health: scoreResult.cluster_health,
      atrophy_risk: scoreResult.atrophy_risk,
      repair_bonus: scoreResult.repair_bonus,
      atrophy_flag: scoreResult.atrophy_flag,
      repair_required: scoreResult.repair_required,
      consensus_verdict: consensus.consensus_verdict,
      approve_count: consensus.approve_count,
      deny_count: consensus.deny_count,
      node_votes: consensus.node_votes,
      gate_verdict: gate.verdict,
      gate_reason: gate.reason,
      gate_category: gate.category,
      repair_suggestions: repairSuggestions,
      processing_ms: processingMs,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});