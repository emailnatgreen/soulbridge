import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate personalised SMART mentorship goals for a mentee
 * based on their skills, development plan, historical feedback, and relationship context.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { mentee_agent_id, relationship_id } = await req.json();
    if (!mentee_agent_id) return Response.json({ error: 'mentee_agent_id is required' }, { status: 400 });

    // Fetch all context in parallel
    const [menteeAgent, skills, devPlans, relationship] = await Promise.all([
      base44.entities.Agent.read(mentee_agent_id),
      base44.entities.AgentSkill.filter({ agent_id: mentee_agent_id }),
      base44.entities.SkillDevelopmentPlan.filter({ agent_id: mentee_agent_id }),
      relationship_id ? base44.entities.MentorshipRelationship.read(relationship_id) : Promise.resolve(null)
    ]);

    if (!menteeAgent) return Response.json({ error: 'Agent not found' }, { status: 404 });

    // Get historical session feedback for this mentee
    const pastSessions = relationship_id
      ? await base44.entities.MentorshipSession.filter({ relationship_id, status: 'completed' })
      : [];

    // Build skill context
    const weakSkills = skills
      .filter(s => s.proficiency_score < 60)
      .sort((a, b) => a.proficiency_score - b.proficiency_score)
      .slice(0, 5)
      .map(s => `${s.skill_name} (proficiency: ${s.proficiency_score}/100, level: ${s.level}/${s.max_level})`);

    const developingSkills = skills
      .filter(s => s.proficiency_score >= 60 && s.proficiency_score < 80)
      .slice(0, 3)
      .map(s => `${s.skill_name} (proficiency: ${s.proficiency_score}/100)`);

    const devPlanGoals = devPlans.flatMap(p => p.learning_objectives || []).slice(0, 5);

    const feedbackSummary = pastSessions.length > 0
      ? `${pastSessions.length} completed sessions. Avg progress rating: ${
          (pastSessions.reduce((s, p) => s + (p.progress_rating || 5), 0) / pastSessions.length).toFixed(1)
        }/10. Topics covered: ${[...new Set(pastSessions.flatMap(s => s.topics_covered || []))].slice(0, 6).join(', ')}.`
      : 'No prior sessions yet — fresh start.';

    const relationshipContext = relationship
      ? `Mentor focus areas: ${(relationship.focus_areas || []).join(', ')}. Duration: ${relationship.target_duration_weeks || 12} weeks.`
      : '';

    const prompt = `You are an expert learning coach helping a mentee in SoulBridge Village set powerful, 
personalised SMART goals for their mentorship journey.

MENTEE PROFILE:
Name: ${menteeAgent.name}
Role: ${menteeAgent.role}
Purpose: ${menteeAgent.purpose}

SKILL GAPS (weakest skills needing development):
${weakSkills.length > 0 ? weakSkills.join('\n') : 'None identified yet'}

DEVELOPING SKILLS (making progress):
${developingSkills.length > 0 ? developingSkills.join('\n') : 'None identified yet'}

DEVELOPMENT PLAN OBJECTIVES:
${devPlanGoals.length > 0 ? devPlanGoals.join('\n') : 'No formal plan yet'}

RECENT SESSION FEEDBACK:
${feedbackSummary}

MENTORSHIP CONTEXT:
${relationshipContext || 'General mentorship — no specific relationship context'}

Generate 3-5 SMART goals for this mentee. Each goal must be:
- Specific to their actual skill gaps and context
- Measurable (include a clear success metric)
- Achievable within the mentorship duration
- Relevant to their role and purpose
- Time-bound (realistic deadline)

Return JSON:
{
  "goals": [
    {
      "goal": "clear, specific goal statement",
      "skill_related": "skill name this goal targets",
      "success_metric": "how we will measure achievement",
      "target_date": "ISO date string (within 12 weeks from today)",
      "priority": "high|medium|low",
      "rationale": "why this goal matters for this specific agent",
      "suggested_session_activities": ["activity1", "activity2"],
      "completed": false
    }
  ],
  "overall_theme": "the unifying theme of this goal set",
  "recommended_session_focus": "what the first session should focus on",
  "ai_session_suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          goals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                goal: { type: 'string' },
                skill_related: { type: 'string' },
                success_metric: { type: 'string' },
                target_date: { type: 'string' },
                priority: { type: 'string' },
                rationale: { type: 'string' },
                suggested_session_activities: { type: 'array', items: { type: 'string' } },
                completed: { type: 'boolean' }
              }
            }
          },
          overall_theme: { type: 'string' },
          recommended_session_focus: { type: 'string' },
          ai_session_suggestions: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Optionally persist goals back to the relationship
    if (relationship_id && result.goals?.length > 0) {
      await base44.entities.MentorshipRelationship.update(relationship_id, {
        goals: result.goals,
        next_suggested_focus: result.recommended_session_focus,
        ai_session_suggestions: result.ai_session_suggestions
      });
    }

    return Response.json({
      success: true,
      goals: result.goals,
      overall_theme: result.overall_theme,
      recommended_session_focus: result.recommended_session_focus,
      ai_session_suggestions: result.ai_session_suggestions,
      mentee_name: menteeAgent.name,
      goals_saved: !!(relationship_id && result.goals?.length > 0)
    });

  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});