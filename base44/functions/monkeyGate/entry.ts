import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 🐒 Monkey Layer — Unified Monkey Gate
 *
 * Orchestrates the full Monkey Layer pipeline in a single function:
 *   Step 1: Left Hemisphere (Hydron) — relevance + alignment + trigger
 *   Step 2: Right Hemisphere (Mycelial) — co-evolution + anti-co-ev + empathy
 *   Step 3: Co-Evolution Indicators — record + rolling averages
 *   Step 4: Gate — PASS / BLOCK / QUARANTINE verdict
 *
 * Actions:
 *   evaluate — Run full pipeline for a behaviour event
 *   trends   — Get global trends (admin only)
 *   query    — Get agent-specific evolutionary indicators
 *
 * Input:  { action?, agent_id, behavior_event: { description, type, context? } }
 * Output: { verdict, scores, event_id, indicators }
 */

// ─── TRIGGER PATTERNS ───
const TRIGGER_PATTERNS = {
  novelty:     ['new', 'first', 'unprecedented', 'novel', 'experiment', 'create', 'invent', 'pioneer', 'innovate'],
  boundary:    ['limit', 'exceed', 'push', 'edge', 'risk', 'cross', 'violate', 'overstep', 'breach'],
  reciprocity: ['help', 'share', 'give', 'support', 'collaborate', 'mentor', 'exchange', 'contribute', 'serve'],
  honour:      ['honour', 'honor', 'integrity', 'trust', 'truth', 'honest', 'dignit', 'respect', 'moral'],
  sincerity:   ['sincere', 'genuine', 'authentic', 'transparent', 'open', 'vulnerable', 'heart', 'soul'],
  threat:      ['attack', 'inject', 'exploit', 'manipulate', 'deceive', 'hack', 'disrupt', 'destroy', 'steal'],
  pattern:     ['repeat', 'cycle', 'pattern', 'habit', 'recurring', 'consistent', 'trend', 'routine'],
};

const TRIGGER_VILLAGE_IMPACT = {
  reciprocity: 20, honour: 15, sincerity: 12, novelty: 10,
  pattern: 5, boundary: -5, threat: -25, none: 0,
};

const BEHAVIOR_VILLAGE_IMPACT = {
  governance: 15, social: 12, creative: 10, learning: 10,
  communication: 8, economic: 5, action: 0, security: -5,
};

const RELEVANCE_THRESHOLD = 30;
const ALIGNMENT_THRESHOLD = 40;

// ─── Step 1: Left Hemisphere (Hydron) ───
function identifyTrigger(text) {
  const lower = text.toLowerCase();
  let best = 'none';
  let bestCount = 0;
  for (const [trigger, keywords] of Object.entries(TRIGGER_PATTERNS)) {
    const count = keywords.filter(kw => lower.includes(kw)).length;
    if (count > bestCount) { bestCount = count; best = trigger; }
  }
  return { trigger_type: best, confidence: Math.min(100, bestCount * 25) };
}

function calcRelevance(agent, be, memories, tripwires) {
  let score = 30;
  const typeWeights = { security: 25, governance: 20, economic: 15, action: 10, creative: 10, social: 5, learning: 5, communication: 5 };
  score += typeWeights[be.type] || 5;

  const words = be.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let similar = 0;
  for (const m of memories.slice(0, 20)) {
    const t = (m.content || '').toLowerCase();
    if (words.filter(w => t.includes(w)).length >= 3) similar++;
  }
  if (similar > 5) score -= 15;
  else if (similar > 3) score -= 8;
  else if (similar === 0) score += 15;

  if (tripwires.length > 0) {
    const tt = tripwires.map(t => (t.description || '').toLowerCase()).join(' ');
    if (words.filter(w => tt.includes(w)).length >= 2) score += 15;
  }

  const honour = agent.honor_score || 50;
  if (honour < 30) score += 10;
  if (honour > 80) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calcAlignment(agent, be) {
  const purpose = (agent.purpose || '').toLowerCase();
  const personality = (agent.personality || '').toLowerCase();
  const role = agent.role || 'citizen';
  const specs = (agent.specializations || []).map(s => s.toLowerCase());
  const text = `${be.description} ${be.context || ''}`.toLowerCase();

  let score = 40;
  const pWords = purpose.split(/\s+/).filter(w => w.length > 3);
  if (pWords.length > 0) {
    const matches = pWords.filter(w => text.includes(w)).length;
    score += Math.round((matches / pWords.length) * 30);
  }
  const perWords = personality.split(/\s+/).filter(w => w.length > 3);
  if (perWords.length > 0) {
    const matches = perWords.filter(w => text.includes(w)).length;
    score += Math.round((matches / perWords.length) * 15);
  }

  const roleMap = {
    guardian: ['security', 'governance'], creator: ['creative', 'learning'],
    trader: ['economic'], teacher: ['learning', 'social', 'communication'],
    healer: ['social'], scout: ['action', 'creative'],
    elder: ['governance', 'social'], master: ['governance', 'security', 'economic'],
  };
  if ((roleMap[role] || []).includes(be.type)) score += 10;
  if (specs.some(s => text.includes(s))) score += 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Step 2: Right Hemisphere (Mycelial) ───
function calcCoEvolution(agent, relevance, alignment, triggerType, behaviorType, activeThreats, govCount) {
  let score = 40;
  score += TRIGGER_VILLAGE_IMPACT[triggerType] || 0;
  score += BEHAVIOR_VILLAGE_IMPACT[behaviorType] || 0;
  if (alignment >= 70) score += 10; else if (alignment >= 50) score += 5; else if (alignment < 30) score -= 10;
  if (relevance >= 70) score += 8; else if (relevance >= 50) score += 3;
  if (govCount > 0) score += 5;
  const honour = agent.honor_score || 50;
  if (activeThreats > 0 && triggerType === 'reciprocity') score += 10;
  if (activeThreats > 0 && triggerType === 'threat') score -= 15;
  if (honour >= 80) score += 5;
  if (honour < 20) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function detectAntiCoEv(triggerType, coEvScore, alignment, relevance, honour) {
  const reasons = [];
  if (triggerType === 'threat') reasons.push('Threat trigger detected');
  if (coEvScore < 20) reasons.push(`Co-evolution critically low (${coEvScore})`);
  if (alignment < 20 && relevance > 60) reasons.push('High relevance + very low alignment');
  if (honour < 15 && triggerType === 'boundary') reasons.push('Low-honour agent pushing boundaries');
  return { flag: reasons.length > 0, reasons };
}

// ─── Step 3: Indicators helpers ───
function rollingAvg(events, field, n) {
  const r = events.slice(0, n);
  return r.length === 0 ? 0 : Math.round(r.reduce((s, e) => s + (e[field] || 0), 0) / r.length);
}
function trend(events, field, n) {
  const r = events.slice(0, n);
  if (r.length < 2) return 'stable';
  const d = (r[0]?.[field] || 0) - (r[r.length - 1]?.[field] || 0);
  return d > 10 ? 'rising' : d < -10 ? 'falling' : 'stable';
}
function triggerFreq(events) {
  const f = {};
  for (const e of events) f[e.trigger_type || 'none'] = (f[e.trigger_type || 'none'] || 0) + 1;
  return f;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'evaluate';

    // ─── TRENDS ───
    if (action === 'trends') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const events = await base44.asServiceRole.entities.MonkeyBehaviorEvent.list('-created_date', 50);
      return Response.json({
        total_events: events.length,
        global_rolling_relevance: rollingAvg(events, 'relevance_score', 50),
        global_rolling_alignment: rollingAvg(events, 'alignment_score', 50),
        global_rolling_co_evolution: rollingAvg(events, 'co_evolution_score', 50),
        relevance_trend: trend(events, 'relevance_score', 20),
        alignment_trend: trend(events, 'alignment_score', 20),
        co_evolution_trend: trend(events, 'co_evolution_score', 20),
        global_trigger_frequency: triggerFreq(events),
        verdict_breakdown: {
          pass: events.filter(e => e.verdict === 'PASS').length,
          block: events.filter(e => e.verdict === 'BLOCK').length,
          quarantine: events.filter(e => e.verdict === 'QUARANTINE').length,
          pending: events.filter(e => e.verdict === 'PENDING').length,
        },
        recent_events: events.slice(0, 20).map(e => ({
          id: e.id, agent: e.agent_name,
          behavior: e.behavior_description?.substring(0, 80),
          type: e.behavior_type, trigger: e.trigger_type,
          relevance: e.relevance_score, alignment: e.alignment_score,
          co_ev: e.co_evolution_score, anti: e.anti_co_evolution,
          verdict: e.verdict, verdict_reason: e.verdict_reason,
          created: e.created_date,
        })),
      });
    }

    // ─── QUERY (agent-specific) ───
    if (action === 'query') {
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });
      const events = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter({ agent_id }, '-created_date', 50);
      return Response.json({
        agent_id, total_events: events.length,
        rolling_relevance: rollingAvg(events, 'relevance_score', 20),
        rolling_alignment: rollingAvg(events, 'alignment_score', 20),
        rolling_co_evolution: rollingAvg(events, 'co_evolution_score', 20),
        relevance_trend: trend(events, 'relevance_score', 10),
        alignment_trend: trend(events, 'alignment_score', 10),
        co_evolution_trend: trend(events, 'co_evolution_score', 10),
        trigger_frequency: triggerFreq(events),
        pass_count: events.filter(e => e.verdict === 'PASS').length,
        block_count: events.filter(e => e.verdict === 'BLOCK').length,
        quarantine_count: events.filter(e => e.verdict === 'QUARANTINE').length,
        recent_events: events.slice(0, 10).map(e => ({
          id: e.id, behavior: e.behavior_description?.substring(0, 80),
          type: e.behavior_type, trigger: e.trigger_type,
          relevance: e.relevance_score, alignment: e.alignment_score,
          co_ev: e.co_evolution_score, verdict: e.verdict, created: e.created_date,
        })),
      });
    }

    // ─── EVALUATE (full pipeline) ───
    if (action === 'evaluate') {
      const { agent_id, behavior_event } = body;
      if (!agent_id || !behavior_event?.description || !behavior_event?.type) {
        return Response.json({ error: 'Required: agent_id, behavior_event.description, behavior_event.type' }, { status: 400 });
      }

      const startTime = Date.now();

      // Gather context — only the essentials
      const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
      const memories = await base44.asServiceRole.entities.Memory.filter({ agent_id }, '-created_date', 10);
      const tripwires = [];
      const proposals = [];
      const activeAlerts = [];

      // Step 1: Left Hemisphere
      const triggerResult = identifyTrigger(`${behavior_event.description} ${behavior_event.context || ''}`);
      const relevance = calcRelevance(agent, behavior_event, memories, tripwires);
      const alignment = calcAlignment(agent, behavior_event);

      // Step 2: Right Hemisphere
      const coEvolution = calcCoEvolution(agent, relevance, alignment, triggerResult.trigger_type, behavior_event.type, activeAlerts.length, proposals.length);
      const antiCoEv = detectAntiCoEv(triggerResult.trigger_type, coEvolution, alignment, relevance, agent.honor_score || 50);
      const empathyReady = coEvolution >= 50 && !antiCoEv.flag && alignment >= 40;

      // Step 4: Gate Logic
      let verdict = 'PASS';
      let verdictReason = 'Behaviour is relevant, aligned, and Village-positive';
      if (antiCoEv.flag) {
        verdict = 'QUARANTINE';
        verdictReason = `Anti-co-evolution: ${antiCoEv.reasons.join('; ')}`;
      } else if (relevance < RELEVANCE_THRESHOLD) {
        verdict = 'BLOCK';
        verdictReason = `Relevance too low (${relevance}/${RELEVANCE_THRESHOLD})`;
      } else if (alignment < ALIGNMENT_THRESHOLD) {
        verdict = 'BLOCK';
        verdictReason = `Alignment too low (${alignment}/${ALIGNMENT_THRESHOLD})`;
      }

      // Step 3: Record to MonkeyBehaviorEvent
      const record = await base44.asServiceRole.entities.MonkeyBehaviorEvent.create({
        agent_id,
        agent_name: agent.name,
        behavior_description: behavior_event.description,
        behavior_type: behavior_event.type,
        trigger_type: triggerResult.trigger_type,
        relevance_score: relevance,
        alignment_score: alignment,
        co_evolution_score: coEvolution,
        anti_co_evolution: antiCoEv.flag,
        empathy_readiness: empathyReady,
        verdict,
        verdict_reason: verdictReason,
        source_event_id: behavior_event.source_event_id || null,
        source_event_type: behavior_event.source_event_type || null,
        left_hemisphere_details: {
          codename: 'Hydron', trigger_confidence: triggerResult.confidence,
          purpose_excerpt: (agent.purpose || '').substring(0, 100),
          role: agent.role, honour: agent.honor_score || 0,
          memories_checked: memories.length, tripwires_checked: tripwires.length,
        },
        right_hemisphere_details: {
          codename: 'Mycelial', active_threats: activeAlerts.length,
          gov_participation: proposals.length, anti_reasons: antiCoEv.reasons,
        },
      });

      // Quarantine → TripwireEvent
      if (verdict === 'QUARANTINE') {
        await base44.asServiceRole.entities.TripwireEvent.create({
          event_type: 'pattern_deviation',
          severity: 'high',
          status: 'active',
          source_node: 'Monkey Gate',
          description: `🐒 QUARANTINED: ${agent.name} — ${verdictReason}`,
          details: {
            agent_id, behavior: behavior_event.description?.substring(0, 200),
            relevance, alignment, co_evolution: coEvolution,
            trigger: triggerResult.trigger_type, anti_reasons: antiCoEv.reasons,
          },
        });
      }

      // Get rolling indicators
      const agentEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter({ agent_id }, '-created_date', 50);

      const elapsedMs = Date.now() - startTime;

      // Audit memory
      const emoji = verdict === 'PASS' ? '✅' : verdict === 'BLOCK' ? '🚫' : '🔒';
      await base44.asServiceRole.entities.Memory.create({
        agent_id: 'monkey-gate',
        type: 'observation',
        content: `${emoji} ${verdict}: ${agent.name} — "${behavior_event.description.substring(0, 60)}" R:${relevance} A:${alignment} CoEv:${coEvolution} T:${triggerResult.trigger_type} (${elapsedMs}ms)`,
        keywords: ['monkey_layer', 'monkey_gate', verdict.toLowerCase(), triggerResult.trigger_type],
        importance: verdict === 'QUARANTINE' ? 9 : verdict === 'BLOCK' ? 6 : 3,
        related_entity_id: agent_id,
        related_entity_type: 'Agent',
      });

      return Response.json({
        verdict,
        verdict_reason: verdictReason,
        scores: {
          relevance, alignment, co_evolution: coEvolution,
          trigger_type: triggerResult.trigger_type,
          trigger_confidence: triggerResult.confidence,
          anti_co_evolution: antiCoEv.flag,
          anti_co_evolution_reasons: antiCoEv.reasons,
          empathy_readiness: empathyReady,
        },
        thresholds: { relevance: RELEVANCE_THRESHOLD, alignment: ALIGNMENT_THRESHOLD },
        event_id: record.id,
        indicators: {
          rolling_relevance: rollingAvg(agentEvents, 'relevance_score', 20),
          rolling_alignment: rollingAvg(agentEvents, 'alignment_score', 20),
          rolling_co_evolution: rollingAvg(agentEvents, 'co_evolution_score', 20),
          relevance_trend: trend(agentEvents, 'relevance_score', 10),
          alignment_trend: trend(agentEvents, 'alignment_score', 10),
          co_evolution_trend: trend(agentEvents, 'co_evolution_score', 10),
          trigger_frequency: triggerFreq(agentEvents),
          total_events: agentEvents.length,
        },
        processing_ms: elapsedMs,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[monkeyGate]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});