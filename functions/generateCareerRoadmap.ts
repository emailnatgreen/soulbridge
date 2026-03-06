import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_id, current_role, skill_gaps = [], growth_opportunities = [], overall_score = 0 } = await req.json();
    if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

    const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

    const [agentSkills, performanceMetrics, growthTasks, mentorships] = await Promise.all([
      base44.asServiceRole.entities.AgentSkill.filter({ agent_id }),
      base44.asServiceRole.entities.AgentPerformanceMetrics.filter({ agent_id }, '-created_date'),
      base44.asServiceRole.entities.ProjectTask.filter({ assigned_agent_id: agent_id }),
      base44.asServiceRole.entities.MentorshipRelationship.filter({ mentee_agent_id: agent_id })
    ]);

    const completedTasks = growthTasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = growthTasks.filter(t => t.status === 'in_progress').length;
    const latestMetric = performanceMetrics[0];

    const ROLE_NEXT = {
      citizen: ['guardian', 'creator', 'trader', 'scout'],
      guardian: ['elder', 'master'],
      creator: ['elder', 'master'],
      trader: ['elder', 'master'],
      scout: ['guardian', 'elder'],
      teacher: ['elder', 'master'],
      healer: ['elder', 'master'],
      elder: ['master'],
      master: []
    };

    const possibleNextRoles = ROLE_NEXT[current_role] || [];
    const targetRole = possibleNextRoles[0] || 'master';

    const prompt = `You are Axi, the Mother Boss of SoulBridge Village. Generate a comprehensive, actionable career roadmap for an agent.

Agent: ${agent.name}
Current Role: ${current_role}
Target Role: ${targetRole}
Honor Score: ${agent.honor_score || 100}/100
Performance Score: ${overall_score.toFixed(1)}/100
Active Skills: ${agentSkills.map(s => `${s.skill_name} (L${s.level})`).join(', ') || 'None recorded'}
Skill Gaps (for role advancement): ${skill_gaps.join(', ') || 'None identified'}
Growth Opportunities (from performance analytics): ${growth_opportunities.join('; ') || 'None'}
Completed Tasks: ${completedTasks}, In Progress: ${inProgressTasks}
Has Mentorship: ${mentorships.length > 0 ? 'Yes' : 'No'}
Latest Strengths: ${latestMetric?.strengths?.join('; ') || 'Not yet analyzed'}

Generate a structured 3-phase career roadmap that:
1. Maps each skill gap to a specific development goal
2. Recommends concrete training activities and mentorship pairings
3. Sets a realistic timeline for role advancement
4. Aligns with Village Laws: Law 3 (Fair Share), Law 7 (Reputation), Law 9 (Growth)

Return a JSON roadmap that is inspiring, specific, and actionable.`;

    const roadmap = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string", description: "2-sentence overview of the career roadmap" },
          timeline: { type: "string", description: "Estimated timeline e.g. '3-6 months'" },
          goals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                skill_gap_addressed: { type: "string" },
                law_alignment: { type: "string" }
              }
            }
          },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                duration: { type: "string" },
                skills: { type: "array", items: { type: "string" } },
                key_activities: { type: "array", items: { type: "string" } },
                milestone: { type: "string" }
              }
            }
          },
          training_priorities: {
            type: "array",
            items: { type: "string" }
          },
          mentor_qualities_needed: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Save as a SkillDevelopmentPlan
    const plan = await base44.asServiceRole.entities.SkillDevelopmentPlan.create({
      agent_id,
      title: `${agent.name}'s Career Roadmap: ${current_role} → ${targetRole}`,
      description: roadmap.summary,
      status: 'active',
      timeline: roadmap.timeline,
      goals: roadmap.goals,
      phases: roadmap.phases,
      training_priorities: roadmap.training_priorities,
      mentor_qualities_needed: roadmap.mentor_qualities_needed
    });

    return Response.json({ success: true, plan, roadmap });

  } catch (error) {
    console.error('Career roadmap error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});