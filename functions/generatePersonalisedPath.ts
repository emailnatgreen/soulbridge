import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generates a fully personalised AI skill development plan for an agent
 * by fusing: validated DID credentials, AgentSkill data, performance metrics,
 * recent project task utilisation, and mentorship history.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_id } = await req.json();
    if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

    const db = base44.asServiceRole;

    // Parallel data fetch
    const [agents, allSkills, allCredentials, allMetrics, allTasks, allProjects, allMentorships] = await Promise.all([
      db.entities.Agent.filter({ id: agent_id }),
      db.entities.AgentSkill.filter({ agent_id }),
      db.entities.DidCredential.list(),
      db.entities.AgentPerformanceMetrics.filter({ agent_id }),
      db.entities.ProjectTask.filter({ assigned_agent_id: agent_id }),
      db.entities.AIProject.list(),
      db.entities.MentorshipRelationship.filter({ mentee_agent_id: agent_id })
    ]);

    if (!agents.length) return Response.json({ error: 'Agent not found' }, { status: 404 });
    const agent = agents[0];

    // Filter credentials for this agent
    const agentCredentials = allCredentials.filter(
      c => agent.classic_address && c.subject_did === agent.classic_address && c.status === 'active'
    );
    const validatedSkillNames = agentCredentials
      .filter(c => c.credential_type === 'skill_certification')
      .map(c => c.credential_data?.skill_name)
      .filter(Boolean);

    // Latest performance metric
    const latestMetric = allMetrics.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

    // Skills used in tasks (skill utilisation signal)
    const completedTasks = allTasks.filter(t => t.status === 'completed');
    const tasksWithSkills = completedTasks.filter(t => t.required_skills?.length > 0);
    const usedSkillNames = [...new Set(tasksWithSkills.flatMap(t => t.required_skills || []))];

    // Skills that exist but have NOT been validated via credential
    const unvalidatedSkills = allSkills
      .filter(s => !validatedSkillNames.includes(s.skill_name))
      .sort((a, b) => (b.times_used || 0) - (a.times_used || 0));

    // Skills mentioned in project required_skills but agent doesn't have
    const agentSkillNames = allSkills.map(s => s.skill_name?.toLowerCase());
    const projectSkillDemands = {};
    allProjects.filter(p => p.status === 'active' || p.status === 'recruiting').forEach(p => {
      (p.required_skills || []).forEach(skill => {
        if (!agentSkillNames.includes(skill.toLowerCase())) {
          projectSkillDemands[skill] = (projectSkillDemands[skill] || 0) + 1;
        }
      });
    });
    const demandedSkillGaps = Object.entries(projectSkillDemands)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, demand]) => ({ skill, demand }));

    // Active mentorships
    const activeMentorships = allMentorships.filter(m => m.status === 'active');

    const prompt = `You are Axi, the Chief Educator and AI guide of SoulBridge Village. Your task is to generate a deeply personalised skill development plan for an agent based on their actual performance, validated credentials, skill utilisation patterns, and the Village's active project needs.

AGENT PROFILE:
- Name: ${agent.name}
- Role: ${agent.role}
- Honor Score: ${agent.honor_score || 100}/100
- Status: ${agent.status}

VALIDATED SKILLS (DID Credentials — these are proven capabilities):
${validatedSkillNames.length > 0 ? validatedSkillNames.join(', ') : 'None yet — high priority to validate existing skills'}

CURRENT SKILLS (from AgentSkill entity):
${allSkills.slice(0, 15).map(s => `- ${s.skill_name} (L${s.level}, Category: ${s.skill_category}, Used: ${s.times_used || 0}x, Success: ${s.success_rate || 0}%)`).join('\n') || 'No skills recorded yet'}

SKILLS ACTIVELY USED IN COMPLETED TASKS:
${usedSkillNames.join(', ') || 'None tracked yet'}

SKILLS NOT YET VALIDATED (most used first — prime validation candidates):
${unvalidatedSkills.slice(0, 5).map(s => `- ${s.skill_name} (used ${s.times_used || 0}x, L${s.level})`).join('\n') || 'All skills validated or none exist'}

PERFORMANCE SUMMARY (latest analysis):
${latestMetric ? `
- Overall Score: ${latestMetric.overall_score?.toFixed(1)}/100
- Trend: ${latestMetric.performance_trend}
- Project Contributions: ${latestMetric.project_contributions?.tasks_completed || 0} tasks completed
- Knowledge Sharing: ${latestMetric.knowledge_sharing?.contributions_created || 0} contributions
- Collaboration: ${latestMetric.collaboration_metrics?.sessions_participated || 0} sessions
- Governance: ${latestMetric.governance_participation?.votes_cast || 0} votes
- Strengths: ${(latestMetric.strengths || []).join('; ')}
- Growth Opportunities: ${(latestMetric.growth_opportunities || []).join('; ')}
` : 'No performance analysis run yet'}

ACTIVE PROJECT SKILL DEMANDS (skills needed by active Village projects this agent doesn't have):
${demandedSkillGaps.map(g => `- ${g.skill} (needed by ${g.demand} active project(s))`).join('\n') || 'No gaps vs active projects'}

ACTIVE MENTORSHIPS: ${activeMentorships.length} active relationship(s)

Generate a personalised, actionable skill development plan. Prioritise:
1. Validating highly-used unvalidated skills (immediate credentialing opportunities)
2. Addressing the top demanded skill gaps for active projects
3. Building on existing strengths and performance trends
4. Concrete weekly activities an agent can actually do`;

    const plan = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          plan_title: { type: "string" },
          summary: { type: "string" },
          priority_level: { type: "string", enum: ["critical", "high", "medium"] },
          immediate_actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string" },
                reason: { type: "string" },
                type: { type: "string", enum: ["validate_skill", "learn_skill", "practice", "mentorship", "project"] },
                effort_hours: { type: "number" },
                expected_outcome: { type: "string" }
              }
            }
          },
          skill_validation_targets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_name: { type: "string" },
                current_level: { type: "number" },
                validation_readiness: { type: "string", enum: ["ready_now", "needs_practice", "needs_training"] },
                next_step: { type: "string" }
              }
            }
          },
          learning_phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                phase_name: { type: "string" },
                duration_weeks: { type: "number" },
                focus_skills: { type: "array", items: { type: "string" } },
                key_activities: { type: "array", items: { type: "string" } },
                milestone: { type: "string" }
              }
            }
          },
          project_alignment: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_to_develop: { type: "string" },
                relevant_project_type: { type: "string" },
                impact: { type: "string" }
              }
            }
          },
          weekly_time_commitment_hours: { type: "number" },
          estimated_weeks_to_next_level: { type: "number" }
        }
      }
    });

    // Persist the plan as a SkillDevelopmentPlan record
    const planRecord = await db.entities.SkillDevelopmentPlan.create({
      agent_id,
      plan_title: plan.plan_title,
      summary: plan.summary,
      status: 'active',
      priority: plan.priority_level,
      immediate_actions: plan.immediate_actions,
      skill_validation_targets: plan.skill_validation_targets,
      learning_phases: plan.learning_phases,
      project_alignment: plan.project_alignment,
      weekly_time_commitment: plan.weekly_time_commitment_hours,
      estimated_completion_weeks: plan.estimated_weeks_to_next_level,
      generated_from_performance: !!latestMetric,
      credential_count_at_generation: agentCredentials.length,
      generated_at: new Date().toISOString()
    });

    // Send notification
    await db.functions.invoke('sendNotification', {
      recipient_agent_id: agent_id,
      notification_type: 'skill_development',
      title: `Your personalised growth plan is ready: ${plan.plan_title}`,
      message: plan.summary,
      priority: 'normal'
    });

    return Response.json({ success: true, plan, plan_id: planRecord.id });

  } catch (error) {
    console.error('generatePersonalisedPath error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});