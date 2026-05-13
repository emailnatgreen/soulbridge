import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Node 8 Injector — Phase 3: Graduated Autonomy
 *
 * Actions:
 *   generate    — Run CA analysis and create SecurityRecommendation(s)
 *                 Phase 3: auto-execute flag/warn actions after override window
 *   approve     — Manually approve a pending recommendation
 *   deny        — Deny a recommendation (requires rationale — fed to Node 8 as correction)
 *   override    — Override (reverse) an auto-executed action
 *   list        — List recommendations (with filters)
 *   escalate    — Check for stale critical recommendations and escalate
 *   autoExecute — Process pending flag/warn recs past their override window
 *   config      — Get/set Phase 3 configuration thresholds
 *
 * Graduated Actions:
 *   flag     (low)     — Metadata tag on session for observation          [AUTO in Phase 3]
 *   warn     (medium)  — Inject "Honour Shield" warning into browser view [AUTO in Phase 3]
 *   challenge (high)   — Trigger entropy-powered CAPTCHA                  [MANUAL — Axi approval]
 *   isolate  (critical)— Temporarily suspend session / revoke DID         [MANUAL — Axi approval]
 */

const NODE_8_ID = 'compressed-attention-node8';
const ESCALATION_MINUTES = 10;

// Phase 3 defaults — can be overridden via config action
const DEFAULT_CONFIG = {
  phase: 3,
  auto_execute_enabled: true,
  auto_execute_actions: ['flag', 'warn'],    // Only flag and warn are auto-executed
  override_window_minutes: 5,                 // Axi has 5 minutes to override before auto-execute
  min_score_flag: 20,                         // Minimum score to generate a flag recommendation
  min_score_warn: 40,                         // Minimum score to generate a warn recommendation  
  min_score_challenge: 60,                    // Minimum score for challenge (still manual)
  min_score_isolate: 80,                      // Minimum score for isolate (still manual)
  generation_threshold: 20,                   // Minimum score to create any recommendation
};

const CONFIG_MEMORY_KEY = 'phase3_config';

function generateRecId() {
  return 'REC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function mapSeverityToAction(severity) {
  const map = { low: 'flag', medium: 'warn', high: 'challenge', critical: 'isolate' };
  return map[severity] || 'flag';
}

function mapSeverityToExpiry(severity) {
  const mins = { critical: 10, high: 30, medium: 120, low: 1440 };
  const m = mins[severity] || 120;
  return new Date(Date.now() + m * 60000).toISOString();
}

async function getConfig(base44) {
  try {
    const configs = await base44.asServiceRole.entities.Memory.filter(
      { agent_id: NODE_8_ID, type: 'user_preference' },
      '-created_date', 5
    );
    const configMem = configs.find(c => (c.keywords || []).includes(CONFIG_MEMORY_KEY));
    if (configMem) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(configMem.content) };
    }
  } catch (e) {
    console.error('[node8Injector] config load error:', e.message);
  }
  return { ...DEFAULT_CONFIG };
}

async function saveConfig(base44, config) {
  // Find existing config memory
  const existing = await base44.asServiceRole.entities.Memory.filter(
    { agent_id: NODE_8_ID, type: 'user_preference' },
    '-created_date', 5
  );
  const configMem = existing.find(c => (c.keywords || []).includes(CONFIG_MEMORY_KEY));

  const data = {
    agent_id: NODE_8_ID,
    type: 'user_preference',
    content: JSON.stringify(config),
    keywords: [CONFIG_MEMORY_KEY, 'node8_injector', 'phase_3', 'thresholds'],
    context: `Phase 3 configuration — updated ${new Date().toISOString()}`,
    importance: 8,
  };

  if (configMem) {
    await base44.asServiceRole.entities.Memory.update(configMem.id, data);
  } else {
    await base44.asServiceRole.entities.Memory.create(data);
  }
  return config;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'list';

    // ─── LIST ───
    if (action === 'list') {
      const statusFilter = body.status || null;
      const limit = body.limit || 50;
      let recs;
      if (statusFilter) {
        recs = await base44.asServiceRole.entities.SecurityRecommendation.filter(
          { status: statusFilter }, '-created_date', limit
        );
      } else {
        recs = await base44.asServiceRole.entities.SecurityRecommendation.list('-created_date', limit);
      }
      const config = await getConfig(base44);
      return Response.json({ recommendations: recs, config });
    }

    // ─── CONFIG (read/write) ───
    if (action === 'config') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      if (body.set) {
        // Merge provided values into existing config
        const current = await getConfig(base44);
        const updated = { ...current };
        const allowed = [
          'auto_execute_enabled', 'override_window_minutes',
          'min_score_flag', 'min_score_warn', 'min_score_challenge', 'min_score_isolate',
          'generation_threshold',
        ];
        for (const key of allowed) {
          if (body.set[key] !== undefined) updated[key] = body.set[key];
        }
        const saved = await saveConfig(base44, updated);
        return Response.json({ success: true, config: saved });
      }
      const config = await getConfig(base44);
      return Response.json({ config });
    }

    // Admin gate for all other actions
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const config = await getConfig(base44);

    // ─── GENERATE ───
    if (action === 'generate') {
      const caResult = await base44.asServiceRole.functions.invoke('compressedAttention', {
        action: 'analyze',
        include_resolved: false,
      });

      const analysis = caResult.data || caResult;
      const topThreats = analysis.top_threats || [];
      const threatLevel = analysis.threat_level || 'NOMINAL';

      if (threatLevel === 'NOMINAL' && topThreats.length === 0) {
        return Response.json({
          success: true,
          message: 'No actionable threats detected. System nominal.',
          recommendations_created: 0,
          auto_executed: 0,
          phase: config.phase,
        });
      }

      const threshold = config.generation_threshold;
      const significantThreats = topThreats.filter(t => t.score >= threshold);
      const created = [];
      const autoExecuted = [];

      for (const threat of significantThreats.slice(0, 5)) {
        const severity = threat.severity || 'medium';
        const actionType = mapSeverityToAction(severity);
        const recId = generateRecId();

        const actionDescriptions = {
          flag: 'Add metadata tag to affected session for continued observation',
          warn: 'Inject "Honour Shield" warning into the browser view',
          challenge: 'Trigger entropy-powered CAPTCHA challenge',
          isolate: 'Temporarily suspend session and flag DID for audit',
        };

        const summary = `${actionDescriptions[actionType]}. Triggered by: ${threat.event_type} (score: ${threat.score}/100, severity: ${severity})${threat.anomaly_detail ? '. Detail: ' + threat.anomaly_detail : ''}`;

        const rationale = [
          `Node 8 Compressed Attention scored this signal at ${threat.score}/100.`,
          `Event type: ${threat.event_type}, Source: ${threat.source_node || 'unknown'}.`,
          `Tags: ${(threat.tags || []).join(', ')}.`,
          threat.anomaly_detail ? `Anomaly: ${threat.anomaly_detail}` : null,
          `System threat level: ${threatLevel}.`,
        ].filter(Boolean).join(' ');

        // Phase 3: Determine if this should be auto-executed
        const isAutoEligible = config.auto_execute_enabled &&
          config.auto_execute_actions.includes(actionType);

        const rec = await base44.asServiceRole.entities.SecurityRecommendation.create({
          recommendation_id: recId,
          status: isAutoEligible ? 'pending' : 'pending',
          action_type: actionType,
          severity,
          threat_score: threat.score,
          threat_level: threatLevel,
          summary,
          rationale,
          affected_entities: threat.affected_entity_type ? [{
            entity_type: threat.affected_entity_type,
            entity_id: threat.id,
            detail: threat.event_type,
          }] : [],
          source_signals: [threat.id],
          node8_analysis_context: {
            threat_level: threatLevel,
            avg_score: analysis.summary?.avg_threat_score,
            max_score: analysis.summary?.max_threat_score,
            loop_passes: analysis.summary?.loop_computing?.passes,
            converged: analysis.summary?.loop_computing?.converged,
            generated_at: new Date().toISOString(),
            phase: config.phase,
            auto_eligible: isAutoEligible,
            override_window_minutes: isAutoEligible ? config.override_window_minutes : null,
          },
          expires_at: mapSeverityToExpiry(severity),
        });

        created.push({ ...rec, auto_eligible: isAutoEligible });
      }

      // Log to Memory
      const autoCount = created.filter(r => r.auto_eligible).length;
      const manualCount = created.length - autoCount;
      await base44.asServiceRole.entities.Memory.create({
        agent_id: NODE_8_ID,
        type: 'observation',
        content: `🛡️ Node 8 Injector — Phase 3 Recommendations Generated\nThreat Level: ${threatLevel}\nTotal: ${created.length} (${autoCount} auto-eligible, ${manualCount} manual-only)\nActions: ${created.map(r => `${r.action_type}(${r.severity})${r.auto_eligible ? ' [AUTO]' : ''}`).join(', ')}`,
        keywords: ['node8_injector', 'recommendation', 'phase_3', 'axi_oversight'],
        context: `Node 8 Injector generation — ${new Date().toISOString()}`,
        importance: threatLevel === 'CRITICAL' ? 9 : threatLevel === 'ELEVATED' ? 7 : 5,
      });

      return Response.json({
        success: true,
        phase: config.phase,
        threat_level: threatLevel,
        recommendations_created: created.length,
        auto_eligible: autoCount,
        manual_only: manualCount,
        override_window_minutes: config.override_window_minutes,
        recommendations: created.map(r => ({
          id: r.id,
          recommendation_id: r.recommendation_id,
          action_type: r.action_type,
          severity: r.severity,
          threat_score: r.threat_score,
          summary: r.summary,
          expires_at: r.expires_at,
          auto_eligible: r.auto_eligible,
        })),
      });
    }

    // ─── AUTO-EXECUTE ─── (Process pending flag/warn past override window)
    if (action === 'autoExecute') {
      if (!config.auto_execute_enabled) {
        return Response.json({ success: true, message: 'Auto-execute disabled', processed: 0 });
      }

      const pendingRecs = await base44.asServiceRole.entities.SecurityRecommendation.filter(
        { status: 'pending' }, '-created_date', 50
      );

      const now = Date.now();
      const executed = [];

      for (const rec of pendingRecs) {
        // Only auto-execute allowed action types
        if (!config.auto_execute_actions.includes(rec.action_type)) continue;

        // Check override window
        const ageMinutes = (now - new Date(rec.created_date).getTime()) / 60000;
        if (ageMinutes < config.override_window_minutes) continue;

        // Auto-execute
        const executionResult = {
          action_type: rec.action_type,
          executed_by: 'Node 8 (Auto-Execute)',
          executed_at: new Date().toISOString(),
          mode: 'phase_3_auto',
          override_window_minutes: config.override_window_minutes,
          age_at_execution_minutes: Math.round(ageMinutes),
          browser_guard_command: {
            action: rec.action_type,
            severity: rec.severity,
            threat_score: rec.threat_score,
          },
        };

        await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
          status: 'auto_executed',
          auto_executed: true,
          executed_at: new Date().toISOString(),
          execution_result: executionResult,
        });

        executed.push(rec.recommendation_id);
      }

      // Log if any were auto-executed
      if (executed.length > 0) {
        await base44.asServiceRole.entities.Memory.create({
          agent_id: NODE_8_ID,
          type: 'observation',
          content: `⚡ Phase 3 Auto-Execute: ${executed.length} recommendation(s) auto-approved after ${config.override_window_minutes}min override window.\nIDs: ${executed.join(', ')}\nActions: flag/warn only. Axi can still override via dashboard.`,
          keywords: ['node8_injector', 'auto_execute', 'phase_3', 'graduated_autonomy'],
          context: `Phase 3 auto-execution — ${new Date().toISOString()}`,
          importance: 6,
        });
      }

      return Response.json({
        success: true,
        phase: config.phase,
        processed: executed.length,
        auto_executed_ids: executed,
        override_window_minutes: config.override_window_minutes,
      });
    }

    // ─── APPROVE ───
    if (action === 'approve') {
      const { id } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });

      const rec = (await base44.asServiceRole.entities.SecurityRecommendation.filter({ id }))[0];
      if (!rec) return Response.json({ error: 'Recommendation not found' }, { status: 404 });
      if (rec.status !== 'pending') {
        return Response.json({ error: `Cannot approve: status is ${rec.status}` }, { status: 400 });
      }

      const now = new Date().toISOString();
      const executionResult = {
        action_type: rec.action_type,
        executed_by: user.email,
        executed_at: now,
        mode: 'phase_3_manual_approval',
        browser_guard_command: {
          action: rec.action_type,
          severity: rec.severity,
          threat_score: rec.threat_score,
        },
      };

      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        status: 'approved',
        approved_by: user.email,
        approved_at: now,
        executed_at: now,
        execution_result: executionResult,
      });

      const memoryRecord = await base44.asServiceRole.entities.Memory.create({
        agent_id: NODE_8_ID,
        type: 'observation',
        content: `✅ Recommendation APPROVED: ${rec.recommendation_id}\nAction: ${rec.action_type} (${rec.severity})\nApproved by: ${user.email}\nScore: ${rec.threat_score}/100\nSummary: ${rec.summary}`,
        keywords: ['axi_oversight_action', 'approved', 'node8_injector', 'validation_signal', rec.action_type],
        context: `Axi approved Node 8 recommendation — ${now}`,
        importance: 8,
      });

      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        memory_id: memoryRecord.id,
      });

      return Response.json({
        success: true,
        recommendation_id: rec.recommendation_id,
        status: 'approved',
        execution_result: executionResult,
        memory_id: memoryRecord.id,
      });
    }

    // ─── DENY ───
    if (action === 'deny') {
      const { id, denial_rationale } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      if (!denial_rationale || denial_rationale.trim().length < 5) {
        return Response.json({ error: 'denial_rationale is mandatory (min 5 chars) — this becomes Node 8 correction data' }, { status: 400 });
      }

      const rec = (await base44.asServiceRole.entities.SecurityRecommendation.filter({ id }))[0];
      if (!rec) return Response.json({ error: 'Recommendation not found' }, { status: 404 });
      if (rec.status !== 'pending' && rec.status !== 'auto_executed') {
        return Response.json({ error: `Cannot deny: status is ${rec.status}` }, { status: 400 });
      }

      const now = new Date().toISOString();
      const wasAutoExecuted = rec.status === 'auto_executed';

      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        status: 'denied',
        denied_by: user.email,
        denied_at: now,
        denial_rationale: denial_rationale.trim(),
      });

      const memoryRecord = await base44.asServiceRole.entities.Memory.create({
        agent_id: NODE_8_ID,
        type: 'observation',
        content: `❌ Recommendation ${wasAutoExecuted ? 'OVERRIDDEN' : 'DENIED'}: ${rec.recommendation_id}\nAction: ${rec.action_type} (${rec.severity})\n${wasAutoExecuted ? 'Overridden' : 'Denied'} by: ${user.email}\nRationale: ${denial_rationale.trim()}\nOriginal Score: ${rec.threat_score}/100\nThis is CORRECTION DATA — Node 8 should reduce weight for similar signals.`,
        keywords: ['axi_oversight_action', wasAutoExecuted ? 'override' : 'denied', 'node8_injector', 'correction_data', rec.action_type, 'false_positive_feedback'],
        context: `Axi ${wasAutoExecuted ? 'overrode' : 'denied'} Node 8 recommendation — ${now}`,
        importance: wasAutoExecuted ? 9 : 7,
      });

      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        memory_id: memoryRecord.id,
      });

      return Response.json({
        success: true,
        recommendation_id: rec.recommendation_id,
        status: 'denied',
        was_auto_executed: wasAutoExecuted,
        correction_logged: true,
        memory_id: memoryRecord.id,
      });
    }

    // ─── OVERRIDE ─── (Reverse an auto-executed action)
    if (action === 'override') {
      const { id, override_reason } = body;
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      if (!override_reason || override_reason.trim().length < 5) {
        return Response.json({ error: 'override_reason required (min 5 chars)' }, { status: 400 });
      }

      const rec = (await base44.asServiceRole.entities.SecurityRecommendation.filter({ id }))[0];
      if (!rec) return Response.json({ error: 'Recommendation not found' }, { status: 404 });
      if (rec.status !== 'auto_executed') {
        return Response.json({ error: `Can only override auto_executed recs (current: ${rec.status})` }, { status: 400 });
      }

      const now = new Date().toISOString();
      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        status: 'denied',
        denied_by: user.email,
        denied_at: now,
        denial_rationale: `[OVERRIDE] ${override_reason.trim()}`,
      });

      const memoryRecord = await base44.asServiceRole.entities.Memory.create({
        agent_id: NODE_8_ID,
        type: 'observation',
        content: `🔄 Auto-action OVERRIDDEN: ${rec.recommendation_id}\nAction was: ${rec.action_type} (${rec.severity})\nOverridden by: ${user.email}\nReason: ${override_reason.trim()}\nOriginal Score: ${rec.threat_score}/100\nCORRECTION DATA — Node 8 should reduce confidence for this pattern.`,
        keywords: ['axi_oversight_action', 'override', 'node8_injector', 'correction_data', rec.action_type, 'phase_3_override'],
        context: `Axi overrode Phase 3 auto-action — ${now}`,
        importance: 9,
      });

      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        memory_id: memoryRecord.id,
      });

      return Response.json({
        success: true,
        recommendation_id: rec.recommendation_id,
        status: 'overridden',
        correction_logged: true,
        memory_id: memoryRecord.id,
      });
    }

    // ─── ESCALATE CHECK ───
    if (action === 'escalate') {
      const pendingCritical = await base44.asServiceRole.entities.SecurityRecommendation.filter(
        { status: 'pending' }, '-created_date', 50
      );

      const now = Date.now();
      const escalated = [];

      for (const rec of pendingCritical) {
        if (rec.severity !== 'critical' && rec.severity !== 'high') continue;
        const ageMinutes = (now - new Date(rec.created_date).getTime()) / 60000;
        if (ageMinutes < ESCALATION_MINUTES) continue;
        if (rec.escalated) continue;

        await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
          escalated: true,
          escalated_at: new Date().toISOString(),
        });

        // Send escalation email — wrapped in try/catch so escalation continues even if email fails
        try {
          // Get admin users to find a valid registered email
          const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 1);
          const adminEmail = admins.length > 0 ? admins[0].email : null;
          if (adminEmail) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: adminEmail,
              subject: `🚨 ESCALATION: Node 8 ${rec.severity.toUpperCase()} recommendation awaiting action`,
              body: `<h2>⚠️ Node 8 Security Escalation</h2>
<p>A <strong>${rec.severity}</strong> security recommendation has been pending for ${Math.round(ageMinutes)} minutes without action.</p>
<p><strong>ID:</strong> ${rec.recommendation_id}</p>
<p><strong>Action:</strong> ${rec.action_type}</p>
<p><strong>Score:</strong> ${rec.threat_score}/100</p>
<p><strong>Summary:</strong> ${rec.summary}</p>
<p>Please review in the Axi Command Dashboard → Node 8 Oversight tab.</p>`,
            });
          }
        } catch (emailErr) {
          console.error('[node8Injector] Escalation email failed (non-blocking):', emailErr.message);
        }

        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: 'axi',
          notification_type: 'system',
          title: `🚨 ESCALATED: ${rec.recommendation_id}`,
          message: `Critical recommendation pending ${Math.round(ageMinutes)}min. Action: ${rec.action_type}. Score: ${rec.threat_score}/100.`,
          priority: 'urgent',
          action_url: '/admin/axi-command',
          metadata: { recommendation_id: rec.recommendation_id, severity: rec.severity },
        });

        escalated.push(rec.recommendation_id);
      }

      return Response.json({
        success: true,
        checked: pendingCritical.length,
        escalated: escalated.length,
        escalated_ids: escalated,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[node8Injector]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});