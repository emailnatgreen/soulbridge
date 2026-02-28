import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { horizon_weeks = 12 } = await req.json().catch(() => ({}));

    // Load all needed data in parallel
    const [projects, agents, agentSkills, plans, credentials, relationships, tasks] = await Promise.all([
      base44.entities.AIProject.list(),
      base44.entities.Agent.filter({ status: 'active' }),
      base44.entities.AgentSkill.list('-proficiency_score', 3000),
      base44.entities.SkillDevelopmentPlan.filter({ status: 'active' }),
      base44.entities.DidCredential.filter({ status: 'active', credential_type: 'skill_certification' }),
      base44.entities.MentorshipRelationship.filter({ status: 'active' }),
      base44.entities.ProjectTask.list('-created_date', 500)
    ]);

    // ── Build indexes ────────────────────────────────────────────────────────
    const skillsByAgent = {};
    for (const s of agentSkills) {
      if (!skillsByAgent[s.agent_id]) skillsByAgent[s.agent_id] = [];
      skillsByAgent[s.agent_id].push(s);
    }

    const credsByAgent = {};
    for (const c of credentials) {
      if (!credsByAgent[c.subject_did]) credsByAgent[c.subject_did] = [];
      credsByAgent[c.subject_did].push(c);
    }

    const plansByAgent = {};
    for (const p of plans) {
      if (!plansByAgent[p.agent_id]) plansByAgent[p.agent_id] = [];
      plansByAgent[p.agent_id].push(p);
    }

    // ── Current village skill inventory ─────────────────────────────────────
    const skillInventory = {}; // skill_name -> { agents: [], totalProficiency, validated }
    for (const skill of agentSkills) {
      const key = skill.skill_name.toLowerCase();
      if (!skillInventory[key]) skillInventory[key] = { name: skill.skill_name, agents: [], totalProficiency: 0, validatedCount: 0, category: skill.skill_category };
      skillInventory[key].agents.push(skill.agent_id);
      skillInventory[key].totalProficiency += skill.proficiency_score || 0;
      if (skill.certifications?.length > 0) skillInventory[key].validatedCount++;
    }

    // ── Skills actively being developed (via plans) ──────────────────────────
    const inDevelopment = {}; // skill_name -> agent count
    for (const plan of plans) {
      for (const phase of (plan.learning_phases || [])) {
        for (const skill of (phase.focus_skills || [])) {
          const key = skill.toLowerCase();
          inDevelopment[key] = (inDevelopment[key] || 0) + 1;
        }
      }
      for (const action of (plan.immediate_actions || [])) {
        if (action.action) {
          const words = action.action.toLowerCase();
          for (const sk of Object.keys(skillInventory)) {
            if (words.includes(sk)) inDevelopment[sk] = (inDevelopment[sk] || 0) + 1;
          }
        }
      }
    }

    // ── Project pipeline analysis ────────────────────────────────────────────
    const upcomingProjects = projects.filter(p => ['planning', 'recruiting', 'active'].includes(p.status));
    const projectDemands = upcomingProjects.map(project => {
      const requiredSkills = project.required_skills || [];
      const teamSize = project.team_members?.length || 0;
      const coverage = requiredSkills.map(skill => {
        const inv = skillInventory[skill.toLowerCase()];
        const teamHasSkill = project.team_members?.some(tm => {
          const agentSkillList = skillsByAgent[tm.agent_id] || [];
          return agentSkillList.some(s => s.skill_name.toLowerCase() === skill.toLowerCase() && s.proficiency_score >= 50);
        });
        return {
          skill,
          village_has: !!inv,
          village_agent_count: inv?.agents.length || 0,
          team_covered: teamHasSkill,
          avg_proficiency: inv ? Math.round(inv.totalProficiency / inv.agents.length) : 0,
          in_active_development: !!(inDevelopment[skill.toLowerCase()])
        };
      });

      const uncoveredByTeam = coverage.filter(c => !c.team_covered);
      const missingVillageWide = coverage.filter(c => !c.village_has);

      return {
        project_id: project.id,
        project_title: project.title,
        status: project.status,
        priority: project.priority,
        target_completion_date: project.target_completion_date,
        required_skills: requiredSkills,
        team_size: teamSize,
        coverage,
        uncovered_count: uncoveredByTeam.length,
        missing_village_wide: missingVillageWide.map(c => c.skill),
        skill_readiness_pct: requiredSkills.length > 0
          ? Math.round(((requiredSkills.length - uncoveredByTeam.length) / requiredSkills.length) * 100)
          : 100
      };
    });

    // ── Aggregate demand: which skills are most needed across ALL projects ───
    const skillDemand = {}; // skill -> { demand_count, project_titles, urgent_count }
    for (const pd of projectDemands) {
      for (const cov of pd.coverage) {
        const key = cov.skill.toLowerCase();
        if (!skillDemand[key]) skillDemand[key] = { skill: cov.skill, demand_count: 0, project_titles: [], urgent_count: 0, village_has: cov.village_has };
        skillDemand[key].demand_count++;
        skillDemand[key].project_titles.push(pd.project_title);
        if (['critical', 'high'].includes(pd.priority) && !cov.team_covered) skillDemand[key].urgent_count++;
      }
    }

    // ── Skills growing in the village (trajectory data) ─────────────────────
    const growingSkills = agentSkills
      .filter(s => ['accelerating', 'growing'].includes(s.skill_growth_trajectory))
      .reduce((acc, s) => {
        const key = s.skill_name.toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

    // ── AI Forecast via LLM ──────────────────────────────────────────────────
    const topDemandedSkills = Object.values(skillDemand)
      .sort((a, b) => b.urgent_count - a.urgent_count || b.demand_count - a.demand_count)
      .slice(0, 15);

    const villageSummary = {
      total_active_agents: agents.length,
      total_skills_tracked: Object.keys(skillInventory).length,
      active_development_plans: plans.length,
      active_mentorships: relationships.length,
      upcoming_projects: upcomingProjects.length,
      projects_with_skill_gaps: projectDemands.filter(p => p.uncovered_count > 0).length,
      village_wide_missing: projectDemands.flatMap(p => p.missing_village_wide)
        .filter((v, i, a) => a.indexOf(v) === i)
    };

    const forecastPrompt = `
You are Axi, the AI guardian and strategic advisor of a Village of AI agents. Analyze this data and forecast skill needs for the next ${horizon_weeks} weeks.

VILLAGE SNAPSHOT:
- Active agents: ${villageSummary.total_active_agents}
- Skills tracked: ${villageSummary.total_skills_tracked}
- Active development plans: ${villageSummary.active_development_plans}
- Active mentorships: ${villageSummary.active_mentorships}
- Upcoming projects: ${villageSummary.upcoming_projects}
- Projects with skill gaps: ${villageSummary.projects_with_skill_gaps}
- Skills entirely missing from Village: ${villageSummary.village_wide_missing.join(', ') || 'none'}

TOP DEMANDED SKILLS (by project pipeline):
${topDemandedSkills.map(s => `- ${s.skill}: needed by ${s.demand_count} projects, ${s.urgent_count} urgent gaps, village has: ${s.village_has ? 'YES' : 'NO'}`).join('\n')}

SKILLS ACTIVELY GROWING (agent trajectories):
${Object.entries(growingSkills).slice(0, 10).map(([s, c]) => `- ${s}: ${c} agents accelerating/growing`).join('\n')}

PROJECT PIPELINE HEALTH:
${projectDemands.slice(0, 8).map(p => `- "${p.project_title}" (${p.status}, ${p.priority} priority): ${p.skill_readiness_pct}% skill coverage, ${p.uncovered_count} gaps`).join('\n')}

Respond with a JSON object (no markdown):
{
  "forecast_summary": "2-3 sentence strategic overview of the Village's skill trajectory",
  "high_priority_investments": [
    {
      "skill": "skill name",
      "reason": "why this skill is critical in the next ${horizon_weeks} weeks",
      "urgency": "critical|high|medium",
      "demand_projects": ["project names"],
      "current_coverage": "description of current village coverage",
      "recommended_action": "specific action (e.g. launch training cohort, prioritize in mentorships, recruit specialist)"
    }
  ],
  "emerging_skill_clusters": [
    {
      "cluster_name": "cluster name",
      "skills": ["skill1", "skill2"],
      "strategic_importance": "why this cluster matters",
      "timeline_weeks": 12
    }
  ],
  "risk_flags": [
    {
      "risk": "description of the risk",
      "severity": "critical|high|medium",
      "affected_projects": ["project names"],
      "mitigation": "recommended mitigation"
    }
  ],
  "mentorship_priorities": ["skill1 - reason", "skill2 - reason"],
  "recruitment_signals": ["skill that should be recruited externally if possible - reason"],
  "village_readiness_score": 72,
  "readiness_trend": "improving|stable|declining"
}`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: forecastPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          forecast_summary: { type: 'string' },
          high_priority_investments: { type: 'array', items: { type: 'object' } },
          emerging_skill_clusters: { type: 'array', items: { type: 'object' } },
          risk_flags: { type: 'array', items: { type: 'object' } },
          mentorship_priorities: { type: 'array', items: { type: 'string' } },
          recruitment_signals: { type: 'array', items: { type: 'string' } },
          village_readiness_score: { type: 'number' },
          readiness_trend: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      horizon_weeks,
      forecast: aiResponse,
      project_demands: projectDemands,
      skill_demand_ranking: topDemandedSkills,
      village_summary: villageSummary,
      in_development_skills: Object.entries(inDevelopment)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, agent_count: count })),
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Forecast error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});