import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Proactive mentorship well-being intervention.
 * Takes a detected signal (alert_type, severity, agent_id, role, description)
 * and generates a targeted, compassionate action plan, then dispatches it.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { agent_id, alert_type, severity, role, description, relationship_id } = payload;

    if (!agent_id || !alert_type) {
      return Response.json({ error: 'agent_id and alert_type are required' }, { status: 400 });
    }

    // Fetch core data in parallel
    const [agent, relationships, sessions, mentorProfile] = await Promise.all([
      base44.entities.Agent.read(agent_id),
      base44.entities.MentorshipRelationship.list(),
      base44.entities.MentorshipSession.list(),
      base44.entities.MentorProfile.filter({ agent_id }).then(r => r[0] || null)
    ]);

    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

    // Build context relevant to the alert type
    const agentRelationships = relationships.filter(
      r => r.mentor_agent_id === agent_id || r.mentee_agent_id === agent_id
    );
    const agentSessions = sessions.filter(
      s => s.mentor_agent_id === agent_id || s.mentee_agent_id === agent_id
    );
    const completedSessions = agentSessions.filter(s => s.status === 'completed');
    const cancelledSessions = agentSessions.filter(s => s.status === 'cancelled');

    const avgSessionSatisfaction = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.session_quality || 5), 0) / completedSessions.length
      : null;

    const activeRelCount = agentRelationships.filter(
      r => r.status === 'active' && r.mentor_agent_id === agent_id
    ).length;

    const contextBlock = `
Agent: ${agent.name} (${agent.role})
Alert Type: ${alert_type.replace(/_/g, ' ')} | Severity: ${severity} | Role: ${role}
Signal Description: ${description}

Mentorship Stats:
- Active relationships as ${role}: ${activeRelCount}
- Total sessions: ${agentSessions.length} (${completedSessions.length} completed, ${cancelledSessions.length} cancelled)
- Avg session quality: ${avgSessionSatisfaction != null ? avgSessionSatisfaction.toFixed(1) + '/10' : 'N/A'}
- Max mentees allowed: ${mentorProfile?.max_mentees || 'N/A'}
- Current mentee count: ${mentorProfile?.current_mentee_count || activeRelCount}
    `.trim();

    // AI-powered targeted intervention
    const prompt = `You are Axi, the compassionate Mother Boss of SoulBridge Village. 
A mentorship well-being signal requires a targeted, proactive intervention.

${contextBlock}

Design a specific, actionable intervention plan. Return JSON:
{
  "intervention_title": "short empathetic title",
  "empathy_message": "warm personal message from Axi to ${agent.name}, acknowledging the situation and expressing genuine care (2-3 sentences)",
  "root_cause": "brief analysis of underlying cause",
  "recommended_actions": [
    { "action": "specific step", "type": "immediate|short_term|ongoing", "executor": "axi|mentor|mentee|system" }
  ],
  "relationship_adjustment": {
    "suggest_pause": boolean,
    "reduce_session_frequency": boolean,
    "recommend_mediation": boolean,
    "adjust_max_mentees": boolean,
    "new_max_mentees": number or null
  },
  "check_in_message": "a brief, specific check-in message Axi would send to ${agent.name} right now",
  "follow_up_days": number,
  "expected_improvement": "what improvement we expect to see and when"
}`;

    const intervention = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          intervention_title: { type: 'string' },
          empathy_message: { type: 'string' },
          root_cause: { type: 'string' },
          recommended_actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                type: { type: 'string' },
                executor: { type: 'string' }
              }
            }
          },
          relationship_adjustment: {
            type: 'object',
            properties: {
              suggest_pause: { type: 'boolean' },
              reduce_session_frequency: { type: 'boolean' },
              recommend_mediation: { type: 'boolean' },
              adjust_max_mentees: { type: 'boolean' },
              new_max_mentees: { type: 'number' }
            }
          },
          check_in_message: { type: 'string' },
          follow_up_days: { type: 'number' },
          expected_improvement: { type: 'string' }
        }
      }
    });

    // Apply relationship adjustment if suggested and relationship_id provided
    if (relationship_id && intervention.relationship_adjustment?.suggest_pause) {
      await base44.asServiceRole.entities.MentorshipRelationship.update(relationship_id, {
        status: 'paused'
      });
    }

    // Update mentor profile max_mentees if suggested
    if (mentorProfile && intervention.relationship_adjustment?.adjust_max_mentees && intervention.relationship_adjustment?.new_max_mentees) {
      await base44.asServiceRole.entities.MentorProfile.update(mentorProfile.id, {
        max_mentees: intervention.relationship_adjustment.new_max_mentees,
        is_available: intervention.relationship_adjustment.new_max_mentees > activeRelCount
      });
    }

    // Create WellbeingAlert record
    const alertRecord = await base44.asServiceRole.entities.WellbeingAlert.create({
      agent_id,
      alert_type: 'intervention_plan',
      severity,
      description: intervention.root_cause,
      recommended_actions: intervention.recommended_actions.map(a => a.action),
      status: 'active',
      intervention_details: intervention,
      created_by_system: true
    });

    // Send check-in notification to agent
    await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: agent_id,
      notification_type: 'system',
      title: `💙 ${intervention.intervention_title}`,
      message: intervention.check_in_message,
      priority: severity === 'critical' || severity === 'high' ? 'urgent' : 'high',
      related_entity_type: 'WellbeingAlert',
      related_entity_id: alertRecord.id
    });

    // Log to Axi memory
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'axi_main_001',
      type: 'observation',
      content: `Mentorship intervention for ${agent.name} (${role}): ${intervention.intervention_title}. Alert: ${alert_type}. Actions: ${intervention.recommended_actions.length}. Follow-up in ${intervention.follow_up_days} days.`,
      keywords: ['mentorship', 'wellbeing', 'intervention', alert_type, agent.name.toLowerCase()],
      context: 'Mentorship Well-being Monitor',
      importance: severity === 'critical' ? 10 : severity === 'high' ? 8 : 6,
      related_entity_id: alertRecord.id,
      related_entity_type: 'WellbeingAlert'
    });

    return Response.json({
      success: true,
      intervention,
      alert_record_id: alertRecord.id,
      relationship_paused: relationship_id && intervention.relationship_adjustment?.suggest_pause,
      mentor_profile_updated: !!(mentorProfile && intervention.relationship_adjustment?.adjust_max_mentees)
    });

  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});