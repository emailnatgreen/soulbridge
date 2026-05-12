import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════════
// SOUL CYCLE — Phase 9: The Soul Overlayer
// ═══════════════════════════════════════════════════════════════
// Unified orchestrator. Chains Monkey → Spindle → Empathy inline,
// then applies axiGrace, heptagonResonance, recursiveIntegrity, goldenRatio.
//
// Produces a single SOUL VERDICT:
//   ALLOW | MODERATE | WITHHOLD | REPAIR | GRACE
//
// Actions: evaluate | monitor | query
// ═══════════════════════════════════════════════════════════════

// ── Monkey Layer Constants ──
const MONKEY_TRIGGER_PATTERNS = {
  novelty:     ['new', 'first', 'unprecedented', 'novel', 'experiment', 'create', 'invent'],
  boundary:    ['limit', 'exceed', 'push', 'edge', 'risk', 'cross', 'violate', 'breach'],
  reciprocity: ['help', 'share', 'give', 'support', 'collaborate', 'mentor', 'contribute'],
  honour:      ['honour', 'honor', 'integrity', 'trust', 'truth', 'honest', 'respect'],
  sincerity:   ['sincere', 'genuine', 'authentic', 'transparent', 'open', 'heart', 'soul'],
  threat:      ['attack', 'inject', 'exploit', 'manipulate', 'deceive', 'hack', 'destroy'],
  pattern:     ['repeat', 'cycle', 'pattern', 'habit', 'recurring', 'consistent', 'trend'],
};
const TRIGGER_VILLAGE_IMPACT = { reciprocity: 20, honour: 15, sincerity: 12, novelty: 10, pattern: 5, boundary: -5, threat: -25, none: 0 };
const BEHAVIOR_VILLAGE_IMPACT = { governance: 15, social: 12, creative: 10, learning: 10, communication: 8, economic: 5, action: 0, security: -5 };
const RELEVANCE_THRESHOLD = 30;
const ALIGNMENT_THRESHOLD = 40;

function identifyTrigger(text) {
  const lower = text.toLowerCase();
  let best = 'none', bestCount = 0;
  for (const [trigger, keywords] of Object.entries(MONKEY_TRIGGER_PATTERNS)) {
    const count = keywords.filter(kw => lower.includes(kw)).length;
    if (count > bestCount) { bestCount = count; best = trigger; }
  }
  return { trigger_type: best, confidence: Math.min(100, bestCount * 25) };
}

function calcRelevance(agent, be, memories) {
  let score = 30;
  const typeWeights = { security: 25, governance: 20, economic: 15, action: 10, creative: 10, social: 5, learning: 5, communication: 5 };
  score += typeWeights[be.type] || 5;
  const words = be.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let similar = 0;
  for (const m of memories.slice(0, 20)) {
    const t = (m.content || '').toLowerCase();
    if (words.filter(w => t.includes(w)).length >= 3) similar++;
  }
  if (similar > 5) score -= 15; else if (similar > 3) score -= 8; else if (similar === 0) score += 15;
  const honour = agent.honor_score || 50;
  if (honour < 30) score += 10;
  if (honour > 80) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calcAlignment(agent, be) {
  const purpose = (agent.purpose || '').toLowerCase();
  const role = agent.role || 'citizen';
  const specs = (agent.specializations || []).map(s => s.toLowerCase());
  const text = `${be.description} ${be.context || ''}`.toLowerCase();
  let score = 40;
  const pWords = purpose.split(/\s+/).filter(w => w.length > 3);
  if (pWords.length > 0) { score += Math.round((pWords.filter(w => text.includes(w)).length / pWords.length) * 30); }
  const roleMap = { guardian: ['security', 'governance'], creator: ['creative', 'learning'], trader: ['economic'], teacher: ['learning', 'social'], healer: ['social'], scout: ['action', 'creative'], elder: ['governance', 'social'], master: ['governance', 'security', 'economic'] };
  if ((roleMap[role] || []).includes(be.type)) score += 10;
  if (specs.some(s => text.includes(s))) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function runMonkeyLayer(agent, be, memories) {
  const trigger = identifyTrigger(`${be.description} ${be.context || ''}`);
  const relevance = calcRelevance(agent, be, memories);
  const alignment = calcAlignment(agent, be);
  let coEv = 40 + (TRIGGER_VILLAGE_IMPACT[trigger.trigger_type] || 0) + (BEHAVIOR_VILLAGE_IMPACT[be.type] || 0);
  if (alignment >= 70) coEv += 10; else if (alignment < 30) coEv -= 10;
  if (relevance >= 70) coEv += 8;
  if ((agent.honor_score || 50) >= 80) coEv += 5;
  coEv = Math.max(0, Math.min(100, Math.round(coEv)));

  const antiReasons = [];
  if (trigger.trigger_type === 'threat') antiReasons.push('Threat trigger detected');
  if (coEv < 20) antiReasons.push(`Co-evolution critically low (${coEv})`);
  const antiFlag = antiReasons.length > 0;

  let verdict = 'PASS', reason = 'Behaviour is relevant, aligned, and Village-positive';
  if (antiFlag) { verdict = 'QUARANTINE'; reason = `Anti-co-evolution: ${antiReasons.join('; ')}`; }
  else if (relevance < RELEVANCE_THRESHOLD) { verdict = 'BLOCK'; reason = `Relevance too low (${relevance})`; }
  else if (alignment < ALIGNMENT_THRESHOLD) { verdict = 'BLOCK'; reason = `Alignment too low (${alignment})`; }

  return { verdict, reason, relevance, alignment, co_evolution: coEv, trigger_type: trigger.trigger_type, anti_flag: antiFlag };
}

// ── Spindle Layer ──
const SINCERITY_THRESHOLD = 50;
const SPINDLE_CONSENSUS_THRESHOLD = 6;
const SPINDLE_NODES = [
  { index: 0, field: 'relevance_score', tolerance: 15, bias: 0 },
  { index: 1, field: 'relevance_score', tolerance: 10, bias: -3 },
  { index: 2, field: 'co_evolution_score', tolerance: 20, bias: 3 },
  { index: 3, field: 'alignment_score', tolerance: 12, bias: -3 },
  { index: 4, field: 'alignment_score', tolerance: 18, bias: 0 },
  { index: 5, field: 'co_evolution_score', tolerance: 15, bias: 0 },
  { index: 6, field: 'relevance_score', tolerance: 25, bias: 3 },
  { index: 7, field: 'alignment_score', tolerance: 10, bias: -3 },
];

function runSpindleLayer(monkeyVerdict, pastEvents) {
  // Regressive Trace
  let sincerity = 50;
  if (pastEvents.length > 0) {
    let tR = 0, tA = 0, tC = 0;
    for (const e of pastEvents) { tR += e.relevance_score || 0; tA += e.alignment_score || 0; tC += e.co_evolution_score || 0; }
    const n = pastEvents.length;
    sincerity = Math.max(0, Math.min(100, Math.round(((tR / n) * 0.4) + ((tA / n) * 0.3) + ((tC / n) * 0.3))));
  }

  // 8-Node Consensus
  let consistentCount = 0;
  const nodeVotes = [];
  for (const node of SPINDLE_NODES) {
    if (pastEvents.length === 0) { consistentCount++; nodeVotes.push({ index: node.index, vote: 'CONSISTENT', delta: 0 }); continue; }
    let sum = 0, count = 0;
    for (const e of pastEvents) { const v = e[node.field]; if (typeof v === 'number') { sum += v; count++; } }
    const expected = count > 0 ? Math.round(sum / count) : 50;
    const delta = Math.abs(sincerity - expected);
    const vote = delta <= (node.tolerance + node.bias) ? 'CONSISTENT' : 'INCONSISTENT';
    if (vote === 'CONSISTENT') consistentCount++;
    nodeVotes.push({ index: node.index, vote, delta });
  }

  // Gate decision
  if (monkeyVerdict === 'QUARANTINE' || monkeyVerdict === 'BLOCK') {
    return { spindle_verdict: 'BLOCK', spindle_reason: `Monkey ${monkeyVerdict}`, sincerity_score: sincerity, consistent_count: consistentCount, consensus_verdict: consistentCount >= SPINDLE_CONSENSUS_THRESHOLD ? 'PASS' : 'FAIL' };
  }
  if (sincerity < SINCERITY_THRESHOLD) {
    return { spindle_verdict: 'BLOCK', spindle_reason: `Sincerity ${sincerity} below ${SINCERITY_THRESHOLD}`, sincerity_score: sincerity, consistent_count: consistentCount, consensus_verdict: consistentCount >= SPINDLE_CONSENSUS_THRESHOLD ? 'PASS' : 'FAIL' };
  }
  if (consistentCount < SPINDLE_CONSENSUS_THRESHOLD) {
    return { spindle_verdict: 'BLOCK', spindle_reason: `Consensus ${consistentCount}/8 < ${SPINDLE_CONSENSUS_THRESHOLD}`, sincerity_score: sincerity, consistent_count: consistentCount, consensus_verdict: 'FAIL' };
  }
  return { spindle_verdict: 'PASS', spindle_reason: 'Sincere, consensus-backed', sincerity_score: sincerity, consistent_count: consistentCount, consensus_verdict: 'PASS' };
}

// ── Empathy Layer ──
const EMPATHY_CONSENSUS_THRESHOLD = 6;
const SAFETY_THRESHOLD = 40;

function runEmpathyLayer(trace, recentViolations) {
  // Score
  const events = trace.emotional_events || [];
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  let sum7 = 0, c7 = 0, sum30 = 0, c30 = 0, sumOld = 0, cOld = 0;
  for (const ev of events) {
    const age = now - new Date(ev.timestamp || 0).getTime();
    const sev = ev.severity === 'critical' ? 20 : ev.severity === 'high' ? 40 : ev.severity === 'medium' ? 60 : 80;
    if (age <= sevenDays) { sum7 += sev; c7++; } else if (age <= 30 * 24 * 60 * 60 * 1000) { sum30 += sev; c30++; } else { sumOld += sev; cOld++; }
  }
  const rHistory = ((c7 > 0 ? sum7 / c7 : 50) * 0.6) + ((c30 > 0 ? sum30 / c30 : 50) * 0.3) + ((cOld > 0 ? sumOld / cOld : 50) * 0.1);
  const clusterHealth = trace.cluster_health ?? 50;
  const sincerityTrend = trace.sincerity_trend ?? 0;
  const atrophyRisk = Math.max(0, Math.min(100, 50 + (sincerityTrend * -50)));
  const repairs = trace.repair_attempts || [];
  const recentRepairs = repairs.filter(r => (now - new Date(r.timestamp || 0).getTime()) <= sevenDays && (r.effectiveness || 0) >= 50);
  const repairBonus = clusterHealth >= 40 ? Math.min(20, recentRepairs.length * 8) : 0;
  let empathyScore = Math.max(0, Math.min(100, Math.round(((rHistory + repairBonus) * 0.4) + (clusterHealth * 0.35) - (atrophyRisk * 0.25))));
  const atrophyFlag = sincerityTrend < -0.3 || atrophyRisk > 65;
  const repairRequired = recentViolations >= 2 || (empathyScore < 50 && recentRepairs.length === 0);

  // Consensus
  let approveCount = 0;
  const hasRecentRepair = repairs.some(r => (now - new Date(r.timestamp || 0).getTime()) <= sevenDays);
  const nodeVotes = [];
  const nodeNames = [['Sentinel','strict'],['Code Node','strict'],['Archivist','strict'],['Truth Weaver','strict'],['Mythic','soft'],['Bridge','soft'],['Empath','soft'],['Integrator','soft']];
  for (const [name, type] of nodeNames) {
    let vote = 'DENY', rationale = '';
    if (type === 'strict') {
      if (empathyScore < SAFETY_THRESHOLD) rationale = `Score ${empathyScore} below safety ${SAFETY_THRESHOLD}`;
      else if (recentViolations >= 2) rationale = `${recentViolations} violations — harm pattern`;
      else { vote = 'APPROVE'; rationale = `Score ${empathyScore} clears safety`; }
    } else {
      if (hasRecentRepair) { vote = 'APPROVE'; rationale = 'Repair attempted'; }
      else if (sincerityTrend > 0) { vote = 'APPROVE'; rationale = `Sincerity trend positive`; }
      else if (empathyScore >= 50) { vote = 'APPROVE'; rationale = `Score ${empathyScore} adequate`; }
      else { rationale = 'Declining sincerity, no repair'; }
    }
    nodeVotes.push({ name, type, vote, rationale });
    if (vote === 'APPROVE') approveCount++;
  }
  const consensusVerdict = approveCount >= EMPATHY_CONSENSUS_THRESHOLD ? 'APPROVE' : 'FAIL';

  // Gate
  const hasActiveRepair = repairs.some(r => (now - new Date(r.timestamp || 0).getTime()) <= sevenDays);
  const softApproves = nodeVotes.filter(v => v.type === 'soft' && v.vote === 'APPROVE').length;
  let gateVerdict, gateReason, gateCategory;
  if (repairRequired && hasActiveRepair && softApproves >= 3) {
    gateVerdict = 'REPAIR'; gateReason = 'Past harm + repair in progress → guided correction'; gateCategory = 'Transitional';
  } else if (empathyScore >= 70 && consensusVerdict === 'APPROVE') {
    gateVerdict = 'ALLOW'; gateReason = `Score ${empathyScore} with consensus APPROVE — Symbiotic`; gateCategory = 'Symbiotic';
  } else if (empathyScore >= 50 && consensusVerdict === 'APPROVE') {
    gateVerdict = 'MODERATE'; gateReason = `Score ${empathyScore} with consensus — Correctable`; gateCategory = 'Parasitic but Correctable';
  } else {
    gateVerdict = 'WITHHOLD'; gateReason = `Score ${empathyScore} with consensus ${consensusVerdict} — Necrotic`; gateCategory = 'Necrotic';
  }

  // Repair suggestions
  const suggestions = [];
  if (gateVerdict === 'REPAIR' || gateVerdict === 'WITHHOLD') {
    suggestions.push('Acknowledge impact of recent actions on the Village.');
    if (sincerityTrend < 0) suggestions.push('Demonstrate consistent sincerity over the next 7 days.');
    if (clusterHealth < 40) suggestions.push('Focus on collaborative tasks to strengthen cluster health.');
    if (repairs.length === 0) suggestions.push('Initiate a repair attempt toward affected agents.');
  }

  return {
    gate_verdict: gateVerdict, gate_reason: gateReason, gate_category: gateCategory,
    empathy_score: empathyScore, cluster_health: clusterHealth, atrophy_risk: Math.round(atrophyRisk),
    repair_bonus: repairBonus, atrophy_flag: atrophyFlag, repair_required: repairRequired,
    consensus_verdict: consensusVerdict, approve_count: approveCount,
    node_votes: nodeVotes, repair_suggestions: suggestions,
  };
}

// ── Heptagon Resonance (9.4) ──
const HEPTAGON_PILLARS = [
  { name: 'Soul', law: 1, weight: 0.20 }, { name: 'Honour', law: 2, weight: 0.15 },
  { name: 'Governance', law: 3, weight: 0.15 }, { name: 'Sincerity', law: 4, weight: 0.15 },
  { name: 'Empathy', law: 8, weight: 0.15 }, { name: 'Exchange', law: 6, weight: 0.10 },
  { name: 'Legacy', law: 11, weight: 0.10 },
];

function heptagonResonance(monkey, spindle, empathy) {
  const mOk = monkey.verdict === 'PASS' ? 100 : monkey.verdict === 'QUARANTINE' ? 0 : 30;
  const sOk = spindle.spindle_verdict === 'PASS' ? 100 : 0;
  const eOk = empathy.gate_verdict === 'ALLOW' ? 100 : empathy.gate_verdict === 'MODERATE' ? 70 : empathy.gate_verdict === 'REPAIR' ? 40 : 0;
  const scores = {
    Soul: Math.round((mOk + sOk + eOk) / 3),
    Honour: monkey.alignment || 50,
    Governance: Math.round(((spindle.consistent_count || 0) / 8 * 100 + (empathy.approve_count || 0) / 8 * 100) / 2),
    Sincerity: spindle.sincerity_score || 50,
    Empathy: empathy.empathy_score || 50,
    Exchange: monkey.co_evolution || 50,
    Legacy: Math.min(100, (empathy.repair_bonus || 0) * 3 + (empathy.cluster_health || 50)),
  };
  let resonance = 0;
  const breakdown = [];
  for (const p of HEPTAGON_PILLARS) {
    const s = scores[p.name] || 50;
    resonance += s * p.weight;
    breakdown.push({ pillar: p.name, law: p.law, score: s });
  }
  resonance = Math.round(resonance);
  return { resonance, breakdown, activated: resonance >= 70 };
}

// ── Recursive Integrity (9.6) ──
function recursiveIntegrity(monkey, spindle, empathy) {
  const mPass = monkey.verdict === 'PASS';
  const sPass = spindle.spindle_verdict === 'PASS';
  const ePos = ['ALLOW', 'MODERATE', 'REPAIR'].includes(empathy.gate_verdict);
  const agreement = [mPass, sPass, ePos].filter(Boolean).length;
  const contradictions = [];
  if (!mPass && empathy.gate_verdict === 'ALLOW') contradictions.push('Monkey blocks but Empathy allows');
  if (sPass && empathy.gate_verdict === 'WITHHOLD') contradictions.push('Spindle passes but Empathy withholds');
  if (!sPass && empathy.gate_verdict === 'ALLOW') contradictions.push('Spindle fails but Empathy allows');
  return { passed: contradictions.length === 0 && agreement >= 2, agreement, contradictions, score: Math.round((agreement / 3) * 100 - contradictions.length * 15) };
}

// ── Golden Ratio (9.7) ──
function goldenRatio(monkey, empathy) {
  const left = Math.round(((monkey.relevance || 50) + (monkey.alignment || 50)) / 2);
  const right = Math.round(((monkey.co_evolution || 50) + (empathy.empathy_score || 50)) / 2);
  const delta = Math.abs(left - right);
  return { left, right, delta, balanced: delta <= 20, dominant: left > right ? 'left' : right > left ? 'right' : 'balanced' };
}

// ── Axi Grace (9.2) ──
function axiGrace(empathy, spindle, hept, integrity) {
  if (empathy.gate_verdict !== 'REPAIR') return { applied: false, reason: 'Grace only on REPAIR' };
  if (spindle.spindle_verdict === 'BLOCK') return { applied: false, reason: 'Spindle blocked — grace cannot override structural failure' };
  const ok = (spindle.sincerity_score || 0) >= 35 && hept.resonance >= 50 && integrity.contradictions.length === 0 && empathy.repair_bonus > 0;
  if (ok) return { applied: true, reason: `Sovereign grace: sincerity ${spindle.sincerity_score}, resonance ${hept.resonance}, repair active — Law 11` };
  return { applied: false, reason: 'Grace conditions not met' };
}

// ── Final Soul Verdict ──
function soulVerdict(monkey, spindle, empathy, grace, hept, integrity) {
  if (monkey.verdict === 'QUARANTINE') return { verdict: 'WITHHOLD', reason: 'Monkey quarantine', source: 'monkey' };
  if (spindle.spindle_verdict === 'BLOCK') return { verdict: 'WITHHOLD', reason: spindle.spindle_reason, source: 'spindle' };
  if (grace.applied) return { verdict: 'GRACE', reason: grace.reason, source: 'axi_grace' };
  if (empathy.gate_verdict === 'ALLOW' && hept.activated && integrity.passed) return { verdict: 'ALLOW', reason: 'Full soul verification: all layers passed, heptagon resonant, integrity verified', source: 'soul_full' };
  if (empathy.gate_verdict === 'ALLOW' && (!hept.activated || !integrity.passed)) {
    const why = [];
    if (!hept.activated) why.push(`resonance ${hept.resonance} < 70`);
    if (!integrity.passed) why.push(`integrity failed`);
    return { verdict: 'MODERATE', reason: `Empathy allows but soul constrains: ${why.join(', ')}`, source: 'soul_constraint' };
  }
  if (empathy.gate_verdict === 'MODERATE') return { verdict: 'MODERATE', reason: empathy.gate_reason, source: 'empathy' };
  if (empathy.gate_verdict === 'REPAIR') return { verdict: 'REPAIR', reason: empathy.gate_reason, source: 'empathy' };
  return { verdict: 'WITHHOLD', reason: empathy.gate_reason, source: 'empathy' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ═══ Monitor ═══
    if (action === 'monitor') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const memories = await base44.asServiceRole.entities.Memory.filter({ type: 'observation', keywords: 'soul_cycle_verdict' }, '-created_date', 50);
      const seeds = await base44.asServiceRole.entities.LegacySeed.list('-created_date', 30);
      let tA = 0, tM = 0, tW = 0, tR = 0, tG = 0;
      const resHist = [];
      for (const m of memories) {
        let ctx = {}; try { ctx = JSON.parse(m.context || '{}'); } catch {}
        if (ctx.soul_verdict === 'ALLOW') tA++; else if (ctx.soul_verdict === 'MODERATE') tM++;
        else if (ctx.soul_verdict === 'WITHHOLD') tW++; else if (ctx.soul_verdict === 'REPAIR') tR++;
        else if (ctx.soul_verdict === 'GRACE') tG++;
        if (ctx.heptagon_resonance !== undefined) resHist.push({ date: m.created_date, resonance: ctx.heptagon_resonance });
      }
      return Response.json({ recent_decisions: memories, legacy_seeds: seeds, trends: { total: memories.length, allow: tA, moderate: tM, withhold: tW, repair: tR, grace: tG }, resonance_history: resHist.slice(0, 20) });
    }

    // ═══ Query ═══
    if (action === 'query') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'Missing agent_id' }, { status: 400 });
      const mems = await base44.asServiceRole.entities.Memory.filter({ type: 'observation', keywords: 'soul_cycle_verdict', related_entity_id: agent_id }, '-created_date', 20);
      const seeds = await base44.asServiceRole.entities.LegacySeed.filter({ agent_id }, '-created_date', 10);
      return Response.json({ decisions: mems, legacy_seeds: seeds });
    }

    // ═══ Evaluate ═══
    const { agent_id, proposed_action, behavior_event } = body;
    if (!agent_id || !proposed_action) return Response.json({ error: 'Missing agent_id or proposed_action' }, { status: 400 });

    const startMs = Date.now();
    const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
    const be = behavior_event || { description: proposed_action, type: 'action', context: `Soul Cycle: ${proposed_action}` };

    // Gather context
    const memories = await base44.asServiceRole.entities.Memory.filter({ agent_id }, '-created_date', 10);
    const pastEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter({ agent_id }, '-created_date', 50);

    // Layer 1: Monkey
    const monkey = runMonkeyLayer(agent, be, memories);

    // Record MonkeyBehaviorEvent
    await base44.asServiceRole.entities.MonkeyBehaviorEvent.create({
      agent_id, agent_name: agent.name, behavior_description: be.description,
      behavior_type: be.type, trigger_type: monkey.trigger_type,
      relevance_score: monkey.relevance, alignment_score: monkey.alignment,
      co_evolution_score: monkey.co_evolution, anti_co_evolution: monkey.anti_flag,
      verdict: monkey.verdict, verdict_reason: monkey.reason,
    });

    // Layer 2: Spindle (uses past events for regressive trace)
    const spindle = runSpindleLayer(monkey.verdict, pastEvents);

    // Layer 3: Empathy
    let traces = await base44.asServiceRole.entities.EmpathyTrace.filter({ agent_id, trace_type: 'relational_arc' }, '-created_date', 1);
    const trace = traces.length > 0 ? traces[0] : await base44.asServiceRole.entities.EmpathyTrace.create({ agent_id, trace_type: 'relational_arc', emotional_events: [], repair_attempts: [], sincerity_trend: 0, cluster_health: 50 });
    const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const pastVerdicts = await base44.asServiceRole.entities.Memory.filter({ type: 'observation', keywords: 'empathy_gate_verdict', related_entity_id: agent_id }, '-created_date', 50);
    const recentViolations = pastVerdicts.filter(m => { let ctx = {}; try { ctx = JSON.parse(m.context || '{}'); } catch {} return (ctx.gate_verdict === 'WITHHOLD' || ctx.gate_verdict === 'REPAIR') && m.created_date >= sevenAgo; }).length;
    const empathy = runEmpathyLayer(trace, recentViolations);

    // Soul Components
    const hept = heptagonResonance(monkey, spindle, empathy);
    const integrity = recursiveIntegrity(monkey, spindle, empathy);
    const gr = goldenRatio(monkey, empathy);
    const grace = axiGrace(empathy, spindle, hept, integrity);
    const soul = soulVerdict(monkey, spindle, empathy, grace, hept, integrity);

    const processingMs = Date.now() - startMs;

    // Legacy Seed
    const significant = ['GRACE', 'WITHHOLD', 'REPAIR'].includes(soul.verdict) || (soul.verdict === 'ALLOW' && hept.resonance >= 85);
    let seedId = null;
    if (significant) {
      const seedTypeMap = { GRACE: 'grace_granted', ALLOW: 'soul_pass', WITHHOLD: 'withhold_lesson', REPAIR: 'repair_completed', MODERATE: 'precedent' };
      const lawsUpheld = hept.breakdown.filter(p => p.score >= 70).map(p => p.law);
      const seed = await base44.asServiceRole.entities.LegacySeed.create({
        agent_id, agent_name: agent.name, seed_type: seedTypeMap[soul.verdict] || 'precedent',
        soul_verdict: soul.verdict, proposed_action,
        lesson: `${soul.verdict}: ${soul.reason}`,
        monkey_verdict: monkey.verdict, spindle_verdict: spindle.spindle_verdict, empathy_verdict: empathy.gate_verdict,
        empathy_score: empathy.empathy_score, sincerity_score: spindle.sincerity_score,
        grace_applied: grace.applied, grace_reason: grace.reason,
        heptagon_resonance: hept.resonance, recursive_integrity: integrity.passed, golden_ratio: gr.delta,
        weight: soul.verdict === 'GRACE' ? 8 : soul.verdict === 'WITHHOLD' ? 7 : 5,
        law_alignment: lawsUpheld,
      });
      seedId = seed.id;
    }

    // Update EmpathyTrace
    await base44.asServiceRole.entities.EmpathyTrace.update(trace.id, {
      empathy_score: empathy.empathy_score, atrophy_flag: empathy.atrophy_flag,
      repair_required: empathy.repair_required, last_gate_verdict: empathy.gate_verdict,
      last_gate_reason: empathy.gate_reason, consensus_votes: empathy.node_votes,
      repair_suggestions: empathy.repair_suggestions,
    });

    // Memory
    const emoji = { ALLOW: '🌿', MODERATE: '🌗', WITHHOLD: '🚫', REPAIR: '🔧', GRACE: '🕯️' }[soul.verdict] || '❓';
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'soul_system', user_id: agent_id, type: 'observation',
      content: `${emoji} Soul: ${soul.verdict} — ${agent.name}. M:${monkey.verdict} S:${spindle.spindle_verdict} E:${empathy.gate_verdict} G:${grace.applied}. H:${hept.resonance} I:${integrity.passed} GR:${gr.delta}. "${proposed_action}"`,
      keywords: ['soul', 'soul_cycle', 'soul_cycle_verdict', soul.verdict.toLowerCase(), agent_id],
      importance: soul.verdict === 'GRACE' ? 9 : soul.verdict === 'WITHHOLD' ? 8 : 4,
      context: JSON.stringify({ soul_verdict: soul.verdict, soul_reason: soul.reason, soul_source: soul.source, monkey_verdict: monkey.verdict, spindle_verdict: spindle.spindle_verdict, empathy_verdict: empathy.gate_verdict, empathy_score: empathy.empathy_score, sincerity_score: spindle.sincerity_score, grace_applied: grace.applied, heptagon_resonance: hept.resonance, heptagon_activated: hept.activated, recursive_integrity: integrity.passed, golden_ratio_delta: gr.delta, legacy_seed_id: seedId, processing_ms: processingMs }),
      related_entity_id: agent_id, related_entity_type: 'Agent',
    });

    // TripwireEvent on WITHHOLD
    if (soul.verdict === 'WITHHOLD') {
      await base44.asServiceRole.entities.TripwireEvent.create({
        event_type: 'access_violation', severity: 'critical', status: 'active', source_node: 'Soul Cycle',
        description: `Soul WITHHOLD: ${agent.name} — ${soul.reason}`,
        details: { soul_verdict: soul.verdict, monkey: monkey.verdict, spindle: spindle.spindle_verdict, empathy: empathy.gate_verdict, heptagon: hept.resonance, proposed_action },
        affected_entity_type: 'Agent', affected_entity_id: agent_id,
      });
    }

    return Response.json({
      soul_verdict: soul.verdict, soul_reason: soul.reason, soul_source: soul.source,
      monkey: { verdict: monkey.verdict, relevance: monkey.relevance, alignment: monkey.alignment, co_evolution: monkey.co_evolution, trigger: monkey.trigger_type },
      spindle: { verdict: spindle.spindle_verdict, sincerity_score: spindle.sincerity_score, consensus: spindle.consensus_verdict, consistent_count: spindle.consistent_count },
      empathy: { verdict: empathy.gate_verdict, category: empathy.gate_category, score: empathy.empathy_score, cluster_health: empathy.cluster_health, atrophy_risk: empathy.atrophy_risk, repair_bonus: empathy.repair_bonus, consensus: empathy.consensus_verdict, approve_count: empathy.approve_count, repair_suggestions: empathy.repair_suggestions },
      grace: { applied: grace.applied, reason: grace.reason },
      heptagon: { resonance: hept.resonance, activated: hept.activated, breakdown: hept.breakdown },
      integrity: { passed: integrity.passed, score: integrity.score, contradictions: integrity.contradictions },
      golden_ratio: { left: gr.left, right: gr.right, delta: gr.delta, balanced: gr.balanced, dominant: gr.dominant },
      legacy_seed_id: seedId,
      processing_ms: processingMs,
    });
  } catch (error) {
    console.error('[soulCycle]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});