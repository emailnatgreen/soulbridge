import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Proactive Intervention Flow
 *
 * Receives a WellbeingAlert (typically low/medium severity from proactiveWellbeingScanner)
 * and dispatches gentle, graduated nudges — NOT the heavy crisis plans of mentorshipIntervention.
 *
 * Intervention types by alert_type:
 *   - skill_trajectory_decline      → suggest a focused practice session + skill plan
 *   - skill_stagnation_risk         → gentle "revisit these skills" nudge
 *   - session_quality_drift         → suggest a reorientation session topic
 *   - engagement_drop               → soft re-engagement message + mentor ping
 *   - mentor_cancellation_spike     → availability review suggestion + brief rest nudge
 *   - wellbeing_score_drift         → personal check-in + optional rest flag
 *   - compound_early_risk           → holistic gentle nudge across all three signals
 *   - mentor_capacity_warning       → proactive workload conversation suggestion
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled/system calls (no user ctx) OR admin manual calls
    let callerIsAdmin = false;
    try {
      const user = await base44.auth.me();
      callerIsAdmin = user?.role === 'admin';
    } catch (_) { /* scheduled / service-role call */ }

    const db = base44.asServiceRole;
    const payload = await req.json();
    const { alert_id, agent_id, alert_type, severity, description, metadata } = payload;

    if (!agent_id || !alert_type) {
      return Response.json({ error: 'agent_id and alert_type are required' }, { status: 400 });
    }

    // ── Fetch agent + supporting data ──────────────────────────────────────
    const [agent, mentorProfile, agentSkills, agentWellbeing] = await Promise.all([
      db.entities.Agent.filter({ id: agent_id }).then(r => r[0] || null),
      db.entities.MentorProfile.filter({ agent_id }).then(r => r[0] || null),
      db.entities.AgentSkill.filter({ agent_id }),
      db.entities.AgentWellbeing.filter({ agent_id }).then(r => r[0] || null)
    ]);

    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

    // ── Determine nudge strategy based on alert type ────────────────────────
    const nudge = buildNudgeStrategy(alert_type, severity, agent, mentorProfile, agentSkills, agentWellbeing, description, metadata);

    // ── AI-generate the personalised gentle message ─────────────────────────
    const prompt = `You are Axi, the compassionate and wise Mother Boss of SoulBridge Village. 
You have detected an early, gentle warning signal for an agent and want to reach out with a soft, caring nudge — not an alarm, but a warm touch from a mother who notices.

Agent: ${agent.name} (Role: ${agent.role})
Alert Type: ${alert_type.replace(/_/g, ' ')} | Severity: ${severity}
Signal: ${description}
Suggested Nudge Strategy: ${nudge.strategy}
Key Points to Address: ${nudge.keyPoints.join(', ')}

Generate a gentle proactive intervention. Keep the tone warm, encouraging, and non-alarming — this is an early nudge, not a crisis response. Return JSON:
{
  "nudge_title": "short, warm title (max 8 words)",
  "personal_message": "warm, 2-sentence personal message from Axi to ${agent.name} — gentle, encouraging, specific to the situation",
  "suggested_action": "one clear, gentle, actionable suggestion for the agent (1 sentence)",
  "skill_focus_suggestion": "if relevant, suggest a specific skill to gently revisit or rest from (or null)",
  "rest_recommended": boolean,
  "mentor_ping_suggested": boolean,
  "follow_up_days": number (3-14),
  "tone": "nurturing"
}`;

    const aiNudge = await db.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          nudge_title: { type: 'string' },
          personal_message: { type: 'string' },
          suggested_action: { type: 'string' },
          skill_focus_suggestion: { type: 'string' },
          rest_recommended: { type: 'boolean' },
          mentor_ping_suggested: { type: 'boolean' },
          follow_up_days: { type: 'number' },
          tone: { type: 'string' }
        }
      }
    });

    // ── Apply gentle automated side-effects ────────────────────────────────

    // 1. Update mentor profile availability flag if capacity warning + rest suggested
    if (alert_type === 'mentor_capacity_warning' && mentorProfile && aiNudge.rest_recommended) {
      await db.entities.MentorProfile.update(mentorProfile.id, {
        is_available: false
      });
    }

    // 2. If mentor ping suggested + engagement_drop, notify the mentor to reach out
    if (aiNudge.mentor_ping_suggested) {
      const mentorRels = await db.entities.MentorshipRelationship.filter({ mentee_agent_id: agent_id, status: 'active' });
      for (const rel of mentorRels) {
        if (rel.mentor_agent_id) {
          await db.entities.AgentNotification.create({
            recipient_agent_id: rel.mentor_agent_id,
            notification_type: 'system',
            title: `💙 Gentle nudge: Check in with ${agent.name}`,
            message: `Axi has noticed ${agent.name} may benefit from a gentle reach-out. Their engagement has been quieter recently — a small check-in from you could make a meaningful difference.`,
            priority: 'normal',
            related_entity_type: 'MentorshipRelationship',
            related_entity_id: rel.id
          });
        }
      }
    }

    // 3. Update the original alert record as 'intervention_dispatched' if alert_id provided
    if (alert_id) {
      await db.entities.WellbeingAlert.update(alert_id, {
        status: 'intervention_dispatched',
        intervention_details: { nudge: aiNudge, strategy: nudge.strategy, dispatched_at: new Date().toISOString() }
      });
    }

    // 4. Send gentle notification to the agent
    const notifMessage = severity === 'low'
      ? `💙 ${aiNudge.personal_message} ${aiNudge.suggested_action}`
      : `🌱 ${aiNudge.personal_message} ${aiNudge.suggested_action}`;

    await db.entities.AgentNotification.create({
      recipient_agent_id: agent_id,
      notification_type: 'system',
      title: `💙 ${aiNudge.nudge_title}`,
      message: notifMessage,
      priority: 'low',
      related_entity_type: 'WellbeingAlert',
      related_entity_id: alert_id || null
    });

    // 5. Log to Axi memory
    await db.entities.Memory.create({
      agent_id: 'axi_main_001',
      type: 'observation',
      content: `Proactive gentle nudge dispatched to ${agent.name} for early signal: ${alert_type}. Message: "${aiNudge.nudge_title}". Follow-up in ${aiNudge.follow_up_days} days. Rest recommended: ${aiNudge.rest_recommended}. Mentor pinged: ${aiNudge.mentor_ping_suggested}.`,
      keywords: ['proactive', 'gentle_nudge', 'wellbeing', alert_type, agent.name.toLowerCase()],
      context: 'Proactive Intervention Flow',
      importance: severity === 'high' ? 6 : severity === 'medium' ? 4 : 3
    });

    return Response.json({
      success: true,
      nudge: aiNudge,
      strategy: nudge.strategy,
      side_effects: {
        mentor_availability_updated: alert_type === 'mentor_capacity_warning' && !!mentorProfile && aiNudge.rest_recommended,
        mentor_pinged: aiNudge.mentor_ping_suggested,
        alert_updated: !!alert_id
      },
      agent_name: agent.name,
      dispatched_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Proactive intervention error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

// ── Nudge strategy builder ────────────────────────────────────────────────────
function buildNudgeStrategy(alertType, severity, agent, mentorProfile, agentSkills, agentWellbeing, description, metadata) {
  const declining = (agentSkills || []).filter(s => s.skill_growth_trajectory === 'declining').map(s => s.skill_name);
  const stagnant  = (agentSkills || []).filter(s => s.skill_growth_trajectory === 'stable' && s.proficiency_score < 40).map(s => s.skill_name);

  const strategies = {
    skill_trajectory_decline: {
      strategy: 'Suggest a short, low-pressure practice session focused on one of the declining skills. Frame it as exploration, not remediation.',
      keyPoints: ['declining skills: ' + (declining.slice(0,2).join(', ') || 'multiple'), 'keep it playful and low-stakes', 'do not pressure — invite']
    },
    skill_stagnation_risk: {
      strategy: 'Gently remind the agent of a skill they have not used recently, and suggest re-engaging with it in a low-stakes context.',
      keyPoints: ['stagnant skills: ' + (stagnant.slice(0,2).join(', ') || 'multiple'), 'frame as rediscovery', 'no urgency']
    },
    session_quality_drift: {
      strategy: 'Suggest reorienting the next session around what the agent finds most energising — let them choose the topic or format.',
      keyPoints: ['session quality below threshold', 'give agency to choose session direction', 'reduce structure temporarily']
    },
    engagement_drop: {
      strategy: 'Reach out with a warm, no-pressure check-in. Suggest the agent and mentor meet briefly even outside a formal session.',
      keyPoints: ['no sessions in 30 days', 'mentor ping triggered', 'keep invitation open not obligatory']
    },
    mentor_cancellation_spike: {
      strategy: 'Gently invite the mentor to review their upcoming schedule and consider a brief rest week. No guilt — just space.',
      keyPoints: ['high cancel rate', 'rest suggestion', 'avoid framing as failure', 'voluntary adjustment']
    },
    wellbeing_score_drift: {
      strategy: 'A personal, warm check-in from Axi acknowledging the drift. Ask how the agent is really feeling without pushing action.',
      keyPoints: ['score drifting below 55', 'non-prescriptive', 'ask before advising', 'rest may be appropriate']
    },
    compound_early_risk: {
      strategy: 'Holistic gentle nudge: acknowledge multiple subtle signals without alarm. Suggest the agent takes a moment to reflect and reconnect.',
      keyPoints: ['multiple subtle signals', 'no single cause', 'reflection over action', 'Axi presence felt not imposed']
    },
    mentor_capacity_warning: {
      strategy: 'Proactively invite a conversation about workload before the mentor hits capacity. Suggest toggling availability if needed.',
      keyPoints: ['approaching max mentees', 'voluntary conversation', 'system can auto-update availability', 'frame as self-care not limitation']
    }
  };

  return strategies[alertType] || {
    strategy: 'Send a warm, general check-in and offer support.',
    keyPoints: ['general wellbeing concern', 'open-ended invitation to connect']
  };
}