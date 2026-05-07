import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Security Guard Bridge — Node 8 → Browser Guard Sensor
 *
 * A lightweight read-only bridge that provides threat intelligence
 * from Compressed Attention to the Security Browser Guard.
 *
 * Actions:
 *   assess  — Returns current risk level based on latest CA analysis + live tripwire state
 *   log     — Logs a guard event (CAPTCHA trigger, phishing flag, etc.) back to Memory for Axi audit
 *
 * Design:
 *   - Read-only sensor: does NOT run a full CA analysis (that's expensive)
 *   - Reads latest CA Memory + live active tripwire counts
 *   - Returns a simple risk_signal object the Browser Guard can consume
 *   - Logging-only mode: no automatic actions, just intelligence + audit trail
 */

const NODE_8_ID = 'compressed-attention-node8';
const THREAT_SCORE_THRESHOLD = 70; // heightened risk boundary

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'assess';

    // ─── ASSESS ───
    if (action === 'assess') {
      // 1. Get latest CA analysis from Memory
      const caMemories = await base44.asServiceRole.entities.Memory.filter(
        { agent_id: NODE_8_ID, type: 'observation' },
        '-created_date', 1
      );

      // 2. Get live active tripwire counts (lightweight query)
      const activeEvents = await base44.asServiceRole.entities.TripwireEvent.filter(
        { status: 'active' }, '-created_date', 50
      );

      // Parse last CA analysis for threat level + scores
      const lastAnalysis = caMemories[0];
      let lastThreatLevel = 'UNKNOWN';
      let lastMaxScore = 0;
      let lastAvgScore = 0;
      let lastAnalysisAge = null;

      if (lastAnalysis) {
        const content = lastAnalysis.content || '';
        const threatMatch = content.match(/Threat Level:\s*(\w+)/);
        const maxMatch = content.match(/Max:\s*(\d+)\/100/);
        const avgMatch = content.match(/Avg Score:\s*(\d+)\/100/);

        if (threatMatch) lastThreatLevel = threatMatch[1];
        if (maxMatch) lastMaxScore = parseInt(maxMatch[1], 10);
        if (avgMatch) lastAvgScore = parseInt(avgMatch[1], 10);

        lastAnalysisAge = Date.now() - new Date(lastAnalysis.created_date).getTime();
      }

      // 3. Live severity breakdown
      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      for (const e of activeEvents) {
        if (severityCounts[e.severity] !== undefined) severityCounts[e.severity]++;
      }

      // 4. Compute live risk signal
      // Combines last CA score with real-time active event pressure
      const livePressure = (severityCounts.critical * 30) + (severityCounts.high * 15) + (severityCounts.medium * 5) + (severityCounts.low * 1);
      const liveScore = Math.min(100, Math.max(lastMaxScore, livePressure));
      const isHeightened = liveScore >= THREAT_SCORE_THRESHOLD;

      // Staleness check: if last analysis > 1 hour old, flag it
      const isStale = !lastAnalysis || (lastAnalysisAge > 3600_000);

      const riskSignal = {
        risk_level: isHeightened ? 'HEIGHTENED' : 'NORMAL',
        threat_score: liveScore,
        threshold: THREAT_SCORE_THRESHOLD,
        heightened: isHeightened,
        stale: isStale,

        // Last CA analysis context
        last_analysis: {
          threat_level: lastThreatLevel,
          max_score: lastMaxScore,
          avg_score: lastAvgScore,
          age_minutes: lastAnalysisAge ? Math.round(lastAnalysisAge / 60000) : null,
          recorded_at: lastAnalysis?.created_date || null,
        },

        // Live tripwire pressure
        live_tripwire: {
          active_count: activeEvents.length,
          severity_breakdown: severityCounts,
          live_pressure_score: livePressure,
        },

        // Recommendations for Browser Guard (logging only — no auto-action)
        guard_recommendations: {
          captcha_difficulty: isHeightened ? 'elevated' : 'standard',
          phishing_sensitivity: isHeightened ? 'high' : 'normal',
          behavioral_trust_modifier: isHeightened ? -0.2 : 0,
          action_mode: 'log_only', // Phase 1: observe and log
        },

        timestamp: new Date().toISOString(),
      };

      return Response.json(riskSignal);
    }

    // ─── LOG ───
    if (action === 'log') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { event_type, details, guard_action } = body;
      if (!event_type) {
        return Response.json({ error: 'event_type required' }, { status: 400 });
      }

      const memory = await base44.asServiceRole.entities.Memory.create({
        agent_id: 'security-browser-guard',
        type: 'observation',
        content: `🛡️ Guard Event: ${event_type}\nAction: ${guard_action || 'logged'}\nDetails: ${JSON.stringify(details || {})}`,
        keywords: ['security_guard', 'browser_guard', event_type, 'node_8_bridge'],
        context: `Security Browser Guard — ${new Date().toISOString()}`,
        importance: guard_action === 'captcha_elevated' ? 7 : 5,
      });

      return Response.json({ success: true, memory_id: memory.id });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[securityGuardBridge]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});