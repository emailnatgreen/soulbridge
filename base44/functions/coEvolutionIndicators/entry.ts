import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 🐒 Monkey Layer — Step 3: Co-Evolution Indicators Engine
 *
 * Stores and updates all indicators in agent's evolutionary memory.
 *   - Relevance history (trend over time)
 *   - Alignment history (trend over time)
 *   - Trigger frequency (which triggers fire most often)
 *   - Co-evolution score (rolling average)
 *
 * Actions:
 *   record  — Store a new behaviour evaluation (from Steps 1+2)
 *   query   — Get an agent's evolutionary indicators
 *   trends  — Get global trends across all agents
 *
 * Input:  { action, agent_id, scores from Step 1 + Step 2 }
 * Output: Updated MonkeyBehaviorEvent + rolling indicators
 */

function computeRollingAvg(events, field, window) {
  const recent = events.slice(0, window);
  if (recent.length === 0) return 0;
  const sum = recent.reduce((s, e) => s + (e[field] || 0), 0);
  return Math.round(sum / recent.length);
}

function computeTriggerFrequency(events) {
  const freq = {};
  for (const e of events) {
    const t = e.trigger_type || 'none';
    freq[t] = (freq[t] || 0) + 1;
  }
  return freq;
}

function computeTrend(events, field, window) {
  const recent = events.slice(0, window);
  if (recent.length < 2) return 'stable';
  const first = recent[recent.length - 1]?.[field] || 0;
  const last = recent[0]?.[field] || 0;
  const delta = last - first;
  if (delta > 10) return 'rising';
  if (delta < -10) return 'falling';
  return 'stable';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Accept both user-scoped and service-role calls (orchestrator calls via service role)
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    const isServiceCall = !user;

    const body = await req.json();
    const action = body.action || 'record';

    // ─── RECORD ───
    if (action === 'record') {
      const {
        agent_id, agent_name, behavior_event,
        relevance_score, alignment_score, trigger_type, trigger_confidence,
        co_evolution_score, anti_co_evolution, empathy_readiness,
        left_details, right_details,
      } = body;

      if (!agent_id || !behavior_event?.description || !behavior_event?.type) {
        return Response.json({ error: 'Required: agent_id, behavior_event' }, { status: 400 });
      }

      // Create the MonkeyBehaviorEvent record
      const record = await base44.asServiceRole.entities.MonkeyBehaviorEvent.create({
        agent_id,
        agent_name: agent_name || agent_id,
        behavior_description: behavior_event.description,
        behavior_type: behavior_event.type,
        trigger_type: trigger_type || 'none',
        relevance_score: relevance_score || 0,
        alignment_score: alignment_score || 0,
        co_evolution_score: co_evolution_score || 0,
        anti_co_evolution: anti_co_evolution || false,
        empathy_readiness: empathy_readiness || false,
        verdict: 'PENDING', // will be set by monkeyGate
        source_event_id: behavior_event.source_event_id || null,
        source_event_type: behavior_event.source_event_type || null,
        left_hemisphere_details: left_details || {},
        right_hemisphere_details: right_details || {},
      });

      // Fetch recent events for this agent to compute rolling indicators
      const agentEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter(
        { agent_id }, '-created_date', 50
      );

      const indicators = {
        rolling_relevance: computeRollingAvg(agentEvents, 'relevance_score', 20),
        rolling_alignment: computeRollingAvg(agentEvents, 'alignment_score', 20),
        rolling_co_evolution: computeRollingAvg(agentEvents, 'co_evolution_score', 20),
        relevance_trend: computeTrend(agentEvents, 'relevance_score', 10),
        alignment_trend: computeTrend(agentEvents, 'alignment_score', 10),
        co_evolution_trend: computeTrend(agentEvents, 'co_evolution_score', 10),
        trigger_frequency: computeTriggerFrequency(agentEvents),
        total_events: agentEvents.length,
        quarantine_count: agentEvents.filter(e => e.verdict === 'QUARANTINE').length,
        pass_count: agentEvents.filter(e => e.verdict === 'PASS').length,
        block_count: agentEvents.filter(e => e.verdict === 'BLOCK').length,
      };

      return Response.json({
        success: true,
        event_id: record.id,
        indicators,
      });
    }

    // ─── QUERY ───
    if (action === 'query') {
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

      const agentEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.filter(
        { agent_id }, '-created_date', 50
      );

      return Response.json({
        agent_id,
        total_events: agentEvents.length,
        rolling_relevance: computeRollingAvg(agentEvents, 'relevance_score', 20),
        rolling_alignment: computeRollingAvg(agentEvents, 'alignment_score', 20),
        rolling_co_evolution: computeRollingAvg(agentEvents, 'co_evolution_score', 20),
        relevance_trend: computeTrend(agentEvents, 'relevance_score', 10),
        alignment_trend: computeTrend(agentEvents, 'alignment_score', 10),
        co_evolution_trend: computeTrend(agentEvents, 'co_evolution_score', 10),
        trigger_frequency: computeTriggerFrequency(agentEvents),
        quarantine_count: agentEvents.filter(e => e.verdict === 'QUARANTINE').length,
        pass_count: agentEvents.filter(e => e.verdict === 'PASS').length,
        block_count: agentEvents.filter(e => e.verdict === 'BLOCK').length,
        recent_events: agentEvents.slice(0, 10).map(e => ({
          id: e.id,
          behavior: e.behavior_description?.substring(0, 80),
          type: e.behavior_type,
          trigger: e.trigger_type,
          relevance: e.relevance_score,
          alignment: e.alignment_score,
          co_ev: e.co_evolution_score,
          verdict: e.verdict,
          created: e.created_date,
        })),
      });
    }

    // ─── TRENDS (global) ───
    if (action === 'trends') {
      if (!isServiceCall && user?.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const recentEvents = await base44.asServiceRole.entities.MonkeyBehaviorEvent.list(
        '-created_date', 50
      );

      return Response.json({
        total_events: recentEvents.length,
        global_rolling_relevance: computeRollingAvg(recentEvents, 'relevance_score', 50),
        global_rolling_alignment: computeRollingAvg(recentEvents, 'alignment_score', 50),
        global_rolling_co_evolution: computeRollingAvg(recentEvents, 'co_evolution_score', 50),
        global_trigger_frequency: computeTriggerFrequency(recentEvents),
        verdict_breakdown: {
          pass: recentEvents.filter(e => e.verdict === 'PASS').length,
          block: recentEvents.filter(e => e.verdict === 'BLOCK').length,
          quarantine: recentEvents.filter(e => e.verdict === 'QUARANTINE').length,
          pending: recentEvents.filter(e => e.verdict === 'PENDING').length,
        },
        recent_events: recentEvents.slice(0, 20).map(e => ({
          id: e.id,
          agent: e.agent_name,
          behavior: e.behavior_description?.substring(0, 60),
          type: e.behavior_type,
          trigger: e.trigger_type,
          relevance: e.relevance_score,
          alignment: e.alignment_score,
          co_ev: e.co_evolution_score,
          anti: e.anti_co_evolution,
          verdict: e.verdict,
          created: e.created_date,
        })),
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[coEvolutionIndicators]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});