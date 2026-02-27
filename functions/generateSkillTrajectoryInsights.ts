import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_id } = await req.json();
    if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

    // Fetch all data in parallel
    const [agent, agentSkills, skillProgressRecords, mentorshipRelationships, sessions] = await Promise.all([
      base44.entities.Agent.get(agent_id),
      base44.entities.AgentSkill.filter({ agent_id }),
      base44.asServiceRole.entities.SkillProgress.filter({ agent_id }),
      base44.asServiceRole.entities.MentorshipRelationship.filter({ mentee_agent_id: agent_id }),
      base44.asServiceRole.entities.MentorshipSession.filter({ mentee_agent_id: agent_id, status: 'completed' }),
    ]);

    // Build skill summary for the prompt
    const skillSummary = agentSkills.map(s => ({
      name: s.skill_name,
      category: s.skill_category,
      level: s.level,
      proficiency: s.proficiency_score,
      trajectory: s.skill_growth_trajectory,
      times_used: s.times_used,
      success_rate: s.success_rate,
      experience_invested: s.experience_invested,
      last_upgraded: s.last_upgraded,
      is_signature: s.is_signature_skill,
    }));

    // Build mentorship context
    const mentorshipContext = mentorshipRelationships.map(r => ({
      status: r.status,
      focus_areas: r.focus_areas,
      sessions_completed: r.sessions_completed,
      mentee_satisfaction: r.mentee_satisfaction,
      skill_proficiency_gains: r.skill_proficiency_gains,
      milestones: r.milestones?.length || 0,
    }));

    // Recent session quality
    const recentSessions = sessions.slice(-5).map(s => ({
      session_type: s.session_type,
      progress_rating: s.progress_rating,
      session_quality: s.session_quality,
      topics_covered: s.topics_covered,
    }));

    const prompt = `You are an expert skill development analyst for the SoulBridge AI Village. Analyze this agent's skill data and generate deep, actionable trajectory insights.

AGENT: ${agent.name} (Role: ${agent.role})
SKILLS (${agentSkills.length} total):
${JSON.stringify(skillSummary, null, 2)}

MENTORSHIP CONTEXT:
${JSON.stringify(mentorshipContext, null, 2)}

RECENT SESSION QUALITY (last 5):
${JSON.stringify(recentSessions, null, 2)}

Generate a comprehensive growth insights report with these sections:

1. narrative_summary: 2-3 sentence personalized narrative about their overall skill journey and growth story
2. growth_velocity: "fast" | "steady" | "slow" | "stagnant" — overall assessment
3. top_growing_skills: array of up to 3 skill names that are growing fastest
4. at_risk_skills: array of skills with declining trajectory or low proficiency despite investment
5. breakthrough_prediction: for their TOP skill, predict when they'll reach the next level (e.g. "On track for Level 7 in ~3 weeks if current pace continues")
6. learning_style_insight: a sentence identifying their apparent learning pattern (e.g. "You excel through hands-on application" or "Your growth accelerates after mentorship sessions")
7. skill_synergies: array of 2-3 observations about how their skills complement each other
8. recommended_focus: the single most impactful skill to focus on next, with reason
9. mentor_recommendation: specific mentorship advice (e.g. what type of mentor would accelerate their growth, what session type would help most)
10. celebration_moment: a specific recent achievement or positive trend to celebrate
11. trajectory_chart_data: array of objects {skill_name, current_level, current_proficiency, projected_30d_proficiency, trajectory} for all skills (project 30-day proficiency based on trajectory — accelerating: +15, growing: +8, stable: +2, declining: -5)`;

    const insights = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          narrative_summary: { type: 'string' },
          growth_velocity: { type: 'string' },
          top_growing_skills: { type: 'array', items: { type: 'string' } },
          at_risk_skills: { type: 'array', items: { type: 'string' } },
          breakthrough_prediction: { type: 'string' },
          learning_style_insight: { type: 'string' },
          skill_synergies: { type: 'array', items: { type: 'string' } },
          recommended_focus: { type: 'string' },
          mentor_recommendation: { type: 'string' },
          celebration_moment: { type: 'string' },
          trajectory_chart_data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                skill_name: { type: 'string' },
                current_level: { type: 'number' },
                current_proficiency: { type: 'number' },
                projected_30d_proficiency: { type: 'number' },
                trajectory: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Log to Axi memory
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'axi',
      memory_type: 'observation',
      content: `Generated skill trajectory insights for ${agent.name}: growth velocity=${insights.growth_velocity}, top skills=${insights.top_growing_skills?.join(', ')}, at risk=${insights.at_risk_skills?.join(', ')}`,
      importance: 4,
      tags: ['skill_insights', 'growth_analysis', agent_id],
    });

    return Response.json({ success: true, insights, agent_name: agent.name, skill_count: agentSkills.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});