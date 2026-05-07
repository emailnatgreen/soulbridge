import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Node 8 Injector — Phase 2: Recommendations Only
 *
 * Actions:
 *   generate   — Run CA analysis and create SecurityRecommendation(s)
 *   approve    — Approve a pending recommendation (immediate execution)
 *   deny       — Deny a recommendation (requires rationale — fed to Node 8 as correction)
 *   list       — List recommendations (with filters)
 *   escalate   — Check for stale critical recommendations and escalate
 *
 * Graduated Actions:
 *   flag     (low)     — Metadata tag on session for observation
 *   warn     (medium)  — Inject "Honour Shield" warning into browser view
 *   challenge (high)   — Trigger entropy-powered CAPTCHA
 *   isolate  (critical)— Temporarily suspend session / revoke DID pending audit
 */

const NODE_8_ID = 'compressed-attention-node8';
const ESCALATION_MINUTES = 10; // Critical recs escalate after 10 mins

function generateRecId() {
  return 'REC-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function mapSeverityToAction(severity) {
  const map = { low: 'flag', medium: 'warn', high: 'challenge', critical: 'isolate' };
  return map[severity] || 'flag';
}

function mapSeverityToExpiry(severity) {
  // Critical: 10 min, High: 30 min, Medium: 2 hours, Low: 24 hours
  const mins = { critical: 10, high: 30, medium: 120, low: 1440 };
  const m = mins[severity] || 120;
  return new Date(Date.now() + m * 60000).toISOString();
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
      return Response.json({ recommendations: recs });
    }

    // Admin gate for all other actions
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ─── GENERATE ───
    if (action === 'generate') {
      // 1. Run CA analysis via the compressedAttention function
      const caResult = await base44.asServiceRole.functions.invoke('compressedAttention', {
        action: 'analyze',
        include_resolved: false,
      });

      const analysis = caResult.data || caResult;
      const topThreats = analysis.top_threats || [];
      const anomalies = analysis.anomalies || [];
      const threatLevel = analysis.threat_level || 'NOMINAL';

      if (threatLevel === 'NOMINAL' && topThreats.length === 0) {
        return Response.json({
          success: true,
          message: 'No actionable threats detected. System nominal.',
          recommendations_created: 0,
        });
      }

      // 2. Create SecurityRecommendation for each significant threat
      const threshold = 20; // Minimum score to generate a recommendation
      const significantThreats = topThreats.filter(t => t.score >= threshold);
      const created = [];

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

        const rec = await base44.asServiceRole.entities.SecurityRecommendation.create({
          recommendation_id: recId,
          status: 'pending',
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
          },
          expires_at: mapSeverityToExpiry(severity),
        });

        created.push(rec);
      }

      // 3. Log to Memory
      await base44.asServiceRole.entities.Memory.create({
        agent_id: NODE_8_ID,
        type: 'observation',
        content: `🛡️ Node 8 Injector — Phase 2 Recommendations Generated\nThreat Level: ${threatLevel}\nRecommendations: ${created.length}\nActions: ${created.map(r => `${r.action_type}(${r.severity})`).join(', ')}`,
        keywords: ['node8_injector', 'recommendation', 'phase_2', 'axi_oversight'],
        context: `Node 8 Injector generation — ${new Date().toISOString()}`,
        importance: threatLevel === 'CRITICAL' ? 9 : threatLevel === 'ELEVATED' ? 7 : 5,
      });

      return Response.json({
        success: true,
        threat_level: threatLevel,
        recommendations_created: created.length,
        recommendations: created.map(r => ({
          id: r.id,
          recommendation_id: r.recommendation_id,
          action_type: r.action_type,
          severity: r.severity,
          threat_score: r.threat_score,
          summary: r.summary,
          expires_at: r.expires_at,
        })),
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

      // Execute the action (Phase 2: log the execution, prepare for Browser Guard)
      const executionResult = {
        action_type: rec.action_type,
        executed_by: user.email,
        executed_at: now,
        mode: 'phase_2_recommendation',
        browser_guard_command: {
          action: rec.action_type,
          severity: rec.severity,
          threat_score: rec.threat_score,
        },
      };

      // Update recommendation
      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        status: 'approved',
        approved_by: user.email,
        approved_at: now,
        executed_at: now,
        execution_result: executionResult,
      });

      // Log to Memory — Validation Signal for Node 8
      const memoryRecord = await base44.asServiceRole.entities.Memory.create({
        agent_id: NODE_8_ID,
        type: 'observation',
        content: `✅ Recommendation APPROVED: ${rec.recommendation_id}\nAction: ${rec.action_type} (${rec.severity})\nApproved by: ${user.email}\nScore: ${rec.threat_score}/100\nSummary: ${rec.summary}`,
        keywords: ['axi_oversight_action', 'approved', 'node8_injector', 'validation_signal', rec.action_type],
        context: `Axi approved Node 8 recommendation — ${now}`,
        importance: 8,
      });

      // Update memory reference
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
      if (rec.status !== 'pending') {
        return Response.json({ error: `Cannot deny: status is ${rec.status}` }, { status: 400 });
      }

      const now = new Date().toISOString();

      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        status: 'denied',
        denied_by: user.email,
        denied_at: now,
        denial_rationale: denial_rationale.trim(),
      });

      // Log to Memory — Correction Data for Node 8
      const memoryRecord = await base44.asServiceRole.entities.Memory.create({
        agent_id: NODE_8_ID,
        type: 'observation',
        content: `❌ Recommendation DENIED: ${rec.recommendation_id}\nAction: ${rec.action_type} (${rec.severity})\nDenied by: ${user.email}\nRationale: ${denial_rationale.trim()}\nOriginal Score: ${rec.threat_score}/100\nThis is CORRECTION DATA — Node 8 should reduce weight for similar signals.`,
        keywords: ['axi_oversight_action', 'denied', 'node8_injector', 'correction_data', rec.action_type, 'false_positive_feedback'],
        context: `Axi denied Node 8 recommendation — ${now}`,
        importance: 7,
      });

      await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
        memory_id: memoryRecord.id,
      });

      return Response.json({
        success: true,
        recommendation_id: rec.recommendation_id,
        status: 'denied',
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

        // Escalate
        await base44.asServiceRole.entities.SecurityRecommendation.update(rec.id, {
          escalated: true,
          escalated_at: new Date().toISOString(),
        });

        // Send email to Governor
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'nathangreen760@gmail.com',
          subject: `🚨 ESCALATION: Node 8 ${rec.severity.toUpperCase()} recommendation awaiting action`,
          body: `<h2>⚠️ Node 8 Security Escalation</h2>
<p>A <strong>${rec.severity}</strong> security recommendation has been pending for ${Math.round(ageMinutes)} minutes without action.</p>
<p><strong>ID:</strong> ${rec.recommendation_id}</p>
<p><strong>Action:</strong> ${rec.action_type}</p>
<p><strong>Score:</strong> ${rec.threat_score}/100</p>
<p><strong>Summary:</strong> ${rec.summary}</p>
<p>Please review in the Axi Command Dashboard → Node 8 Oversight tab.</p>`,
        });

        // Create notification
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