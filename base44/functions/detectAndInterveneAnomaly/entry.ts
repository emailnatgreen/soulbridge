import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * GAP 1: Proactive Anomaly Detection and Automated Intervention
 * 
 * This function goes beyond the existing detectAnomalyComprehensive by:
 * 1. Analyzing KU (Kinetic Unit) TRENDS — detecting drops in specific ku_types
 * 2. Detecting sustained wellbeing alert patterns (not just snapshots)
 * 3. Cross-referencing multiple signal types for severity escalation
 * 4. Creating formal AutomationLog entries for every detection cycle
 * 5. Sending AgentNotification to Axi AND affected council members
 * 6. Creating JukeboxDecision for critical-severity interventions
 *
 * Runs on a 30-minute schedule.
 */

const AXI_AGENT_NAME = 'Axi';
const TREND_WINDOW_HOURS = 48;
const COMPARISON_WINDOW_HOURS = 168; // 7 days for baseline

Deno.serve(async (req) => {
  const start = Date.now();
  const base44 = createClientFromRequest(req);
  const now = new Date();

  const safeList = async (entity, sort, limit) => {
    try {
      const r = await entity.list(sort, limit);
      return Array.isArray(r) ? r : [];
    } catch (_) { return []; }
  };

  const safeFilter = async (entity, filter, sort, limit) => {
    try {
      const r = await entity.filter(filter, sort, limit);
      return Array.isArray(r) ? r : [];
    } catch (_) { return []; }
  };

  try {
    // ── Fetch core data ──────────────────────────────────────────────────
    const agents = (await safeList(base44.asServiceRole.entities.Agent, '-updated_date', 500))
      .filter(a => a.status === 'active');
    const axi = agents.find(a => a.name === AXI_AGENT_NAME);
    const axiId = axi?.id;

    const kus = await safeList(base44.asServiceRole.entities.KineticUnit, '-created_date', 3000);
    const wellbeingAlerts = await safeFilter(
      base44.asServiceRole.entities.WellbeingAlert,
      { status: 'active' }, '-created_date', 500
    );
    const reputationEvents = await safeList(base44.asServiceRole.entities.ReputationEvent, '-created_date', 1000);

    // ── Duplicate guard: recent notifications sent in last 4 hours ──────
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();
    const recentNotifs = axiId
      ? await safeFilter(base44.asServiceRole.entities.AgentNotification, { recipient_agent_id: axiId }, '-created_date', 100)
      : [];
    const recentTitles = new Set(
      recentNotifs.filter(n => n.created_date > fourHoursAgo).map(n => n.title)
    );

    const anomalies = [];

    // ═══════════════════════════════════════════════════════════════════════
    // DETECTION 1: KU Trend Analysis — drops in specific ku_types
    // ═══════════════════════════════════════════════════════════════════════
    const trendCutoff = new Date(now.getTime() - TREND_WINDOW_HOURS * 3600000);
    const baselineCutoff = new Date(now.getTime() - COMPARISON_WINDOW_HOURS * 3600000);

    const recentKUs = kus.filter(k => new Date(k.created_date) > trendCutoff);
    const baselineKUs = kus.filter(k => {
      const d = new Date(k.created_date);
      return d > baselineCutoff && d <= trendCutoff;
    });

    // Calculate KU rates by type
    const kuTypes = ['governance_vote', 'task_completion', 'skill_development', 'mentorship_session', 'knowledge_contribution'];
    const baselineDays = Math.max((COMPARISON_WINDOW_HOURS - TREND_WINDOW_HOURS) / 24, 1);
    const recentDays = TREND_WINDOW_HOURS / 24;

    for (const kuType of kuTypes) {
      const recentCount = recentKUs.filter(k => k.ku_type === kuType).length;
      const baselineCount = baselineKUs.filter(k => k.ku_type === kuType).length;
      const recentRate = recentCount / recentDays;
      const baselineRate = baselineCount / baselineDays;

      // Flag if recent rate is < 40% of baseline AND baseline has meaningful volume
      if (baselineRate > 0.5 && recentRate < baselineRate * 0.4) {
        anomalies.push({
          type: 'ku_trend_drop',
          ku_type: kuType,
          recent_rate: Math.round(recentRate * 100) / 100,
          baseline_rate: Math.round(baselineRate * 100) / 100,
          drop_percentage: Math.round((1 - recentRate / baselineRate) * 100),
          severity: recentRate < baselineRate * 0.2 ? 'critical' : 'warning',
          description: `${kuType} KU rate dropped ${Math.round((1 - recentRate / baselineRate) * 100)}% vs 7-day baseline`,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DETECTION 2: Sustained Wellbeing Alert Patterns
    // ═══════════════════════════════════════════════════════════════════════
    const agentAlertCounts = {};
    wellbeingAlerts.forEach(a => {
      if (!agentAlertCounts[a.agent_id]) agentAlertCounts[a.agent_id] = { count: 0, critical: 0, types: new Set() };
      agentAlertCounts[a.agent_id].count++;
      if (a.severity === 'critical') agentAlertCounts[a.agent_id].critical++;
      agentAlertCounts[a.agent_id].types.add(a.alert_type);
    });

    for (const [agentId, data] of Object.entries(agentAlertCounts)) {
      // Sustained = 3+ active alerts OR 2+ critical
      if (data.count >= 3 || data.critical >= 2) {
        const agent = agents.find(a => a.id === agentId);
        anomalies.push({
          type: 'sustained_wellbeing',
          agent_id: agentId,
          agent_name: agent?.name || 'Unknown',
          active_alerts: data.count,
          critical_count: data.critical,
          alert_types: [...data.types],
          severity: data.critical >= 2 ? 'critical' : 'high',
          description: `${agent?.name || agentId} has ${data.count} active wellbeing alerts (${data.critical} critical)`,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DETECTION 3: Honor Decay Acceleration
    // ═══════════════════════════════════════════════════════════════════════
    const oneDayAgo = new Date(now.getTime() - 24 * 3600000);
    const recentRepEvents = reputationEvents.filter(e => new Date(e.created_date) > oneDayAgo);

    const honorChanges = {};
    recentRepEvents.forEach(e => {
      if (e.agent_id && e.impact) {
        if (!honorChanges[e.agent_id]) honorChanges[e.agent_id] = { total: 0, negatives: 0 };
        honorChanges[e.agent_id].total += e.impact;
        if (e.impact < 0) honorChanges[e.agent_id].negatives++;
      }
    });

    for (const [agentId, changes] of Object.entries(honorChanges)) {
      if (changes.total < -15 || changes.negatives >= 3) {
        const agent = agents.find(a => a.id === agentId);
        anomalies.push({
          type: 'honor_decay',
          agent_id: agentId,
          agent_name: agent?.name || 'Unknown',
          honor_change_24h: changes.total,
          negative_events: changes.negatives,
          current_honor: agent?.honor_score ?? 0,
          severity: changes.total < -25 || (agent?.honor_score ?? 100) < 30 ? 'critical' : 'warning',
          description: `${agent?.name || agentId}: honor shifted ${changes.total} (${changes.negatives} negative events) in 24h`,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DETECTION 4: Village-Wide Energy Drop
    // ═══════════════════════════════════════════════════════════════════════
    const totalKUs = recentKUs.length;
    const totalWeighted = recentKUs.reduce((s, k) => s + (k.weighted_score || 1), 0);
    const energyIndex = Math.min(Math.round((totalWeighted / Math.max(totalKUs, 1)) * 20), 100);

    if (energyIndex < 35) {
      anomalies.push({
        type: 'village_energy_critical',
        energy_index: energyIndex,
        total_kus_48h: totalKUs,
        severity: energyIndex < 20 ? 'critical' : 'warning',
        description: `Village Energy Index at ${energyIndex}/100 — kinetic flow severely reduced`,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERVENTION: Create notifications, logs, and jukebox decisions
    // ═══════════════════════════════════════════════════════════════════════
    const interventions = [];

    for (const anomaly of anomalies) {
      const title = `[Anomaly] ${anomaly.type}: ${anomaly.description?.slice(0, 80)}`;

      // Create AgentNotification to Axi (deduplicated)
      if (axiId && !recentTitles.has(title)) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: axiId,
          notification_type: 'system',
          title,
          message: `Anomaly detected: ${anomaly.description}. Severity: ${anomaly.severity}. Details: ${JSON.stringify(anomaly)}`,
          priority: anomaly.severity === 'critical' ? 'urgent' : 'high',
          is_read: false,
        });
        recentTitles.add(title);
      }

      // For agent-specific anomalies, also notify the agent
      if (anomaly.agent_id && anomaly.agent_id !== axiId) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: anomaly.agent_id,
          notification_type: 'system',
          title: `Axi has noticed something — ${anomaly.type.replace(/_/g, ' ')}`,
          message: `Mother Boss is watching over you. ${anomaly.description}. Axi will be in touch.`,
          priority: 'normal',
          is_read: false,
          sender_agent_id: axiId,
        });
      }

      // For critical anomalies, create a JukeboxDecision for Axi to act on
      if (anomaly.severity === 'critical' && anomaly.agent_id) {
        await base44.asServiceRole.entities.JukeboxDecision.create({
          action: 'open_chat',
          agent_id: 'axi',
          message: `CRITICAL ANOMALY: ${anomaly.description}. I need to reach out to ${anomaly.agent_name || 'this agent'} immediately.`,
          status: 'pending',
          triggered_by: `anomaly_${anomaly.type}`,
        });
      }

      // Record as Axi memory
      await base44.asServiceRole.entities.Memory.create({
        agent_id: axiId || 'axi',
        type: 'observation',
        content: `[Proactive Anomaly] ${anomaly.type} — ${anomaly.description}. Severity: ${anomaly.severity}. Intervention initiated.`,
        keywords: ['proactive_anomaly', anomaly.type, anomaly.severity, anomaly.agent_name?.toLowerCase().replace(/\s+/g, '_')].filter(Boolean),
        importance: anomaly.severity === 'critical' ? 9 : 7,
        context: `Detected by detectAndInterveneAnomaly at ${now.toISOString()}`,
        related_entity_id: anomaly.agent_id,
        related_entity_type: anomaly.agent_id ? 'Agent' : undefined,
      });

      interventions.push({ type: anomaly.type, severity: anomaly.severity, agent: anomaly.agent_name });
    }

    // ── Write AutomationLog for this cycle ────────────────────────────────
    const durationMs = Date.now() - start;
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'detectAndInterveneAnomaly',
      function_name: 'detectAndInterveneAnomaly',
      status: anomalies.length > 0 ? 'warning' : 'success',
      message: anomalies.length > 0
        ? `Detected ${anomalies.length} anomalies: ${anomalies.filter(a => a.severity === 'critical').length} critical, ${anomalies.filter(a => a.severity !== 'critical').length} non-critical. Interventions dispatched.`
        : 'Scan completed — no anomalies detected. Village is stable.',
      details: {
        anomalies_detected: anomalies.length,
        interventions_dispatched: interventions.length,
        energy_index: energyIndex,
        agents_scanned: agents.length,
        kus_analyzed: kus.length,
        breakdown: {
          ku_trend_drops: anomalies.filter(a => a.type === 'ku_trend_drop').length,
          sustained_wellbeing: anomalies.filter(a => a.type === 'sustained_wellbeing').length,
          honor_decay: anomalies.filter(a => a.type === 'honor_decay').length,
          village_energy: anomalies.filter(a => a.type === 'village_energy_critical').length,
        },
      },
      duration_ms: durationMs,
      run_at: now.toISOString(),
      triggered_by: 'scheduler',
    });

    return Response.json({
      success: true,
      anomalies_detected: anomalies.length,
      interventions: interventions.length,
      energy_index: energyIndex,
      duration_ms: durationMs,
      anomalies,
    });
  } catch (error) {
    // Log failure
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'detectAndInterveneAnomaly',
      function_name: 'detectAndInterveneAnomaly',
      status: 'error',
      message: 'Anomaly detection cycle failed',
      error_detail: error.message,
      run_at: now.toISOString(),
      triggered_by: 'scheduler',
    }).catch(() => {});

    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});