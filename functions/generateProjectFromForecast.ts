import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      intent,              // 'skill_investment' | 'risk_mitigation' | 'cluster' | 'custom'
      source_skill,        // e.g. "Governance Voting"
      source_cluster,      // cluster object from forecast
      risk_flag,           // risk object from forecast
      village_context,     // optional summary string passed in from frontend
      owner_agent_id
    } = await req.json();

    if (!owner_agent_id) return Response.json({ error: 'owner_agent_id required' }, { status: 400 });

    // Load live village data to enrich the prompt
    const [agents, agentSkills, plans, credentials] = await Promise.all([
      base44.entities.Agent.filter({ status: 'active' }),
      base44.entities.AgentSkill.list('-proficiency_score', 2000),
      base44.entities.SkillDevelopmentPlan.filter({ status: 'active' }),
      base44.entities.DidCredential.filter({ status: 'active', credential_type: 'skill_certification' })
    ]);

    // Find agents with relevant skills (for team recommendation)
    const targetSkills = source_cluster?.skills
      || (source_skill ? [source_skill] : [])
      || [];

    const agentSkillMap = {};
    for (const s of agentSkills) {
      if (!agentSkillMap[s.agent_id]) agentSkillMap[s.agent_id] = [];
      agentSkillMap[s.agent_id].push(s);
    }

    const credMap = {};
    for (const c of credentials) {
      if (!credMap[c.subject_did]) credMap[c.subject_did] = [];
      credMap[c.subject_did].push(c);
    }

    // Score agents by relevance to target skills
    const rankedAgents = agents
      .filter(a => a.id !== owner_agent_id)
      .map(a => {
        const skills = agentSkillMap[a.id] || [];
        const matches = targetSkills.filter(ts =>
          skills.some(s => s.skill_name.toLowerCase().includes(ts.toLowerCase()))
        );
        const avgProficiency = matches.length > 0
          ? matches.reduce((sum, ts) => {
              const sk = skills.find(s => s.skill_name.toLowerCase().includes(ts.toLowerCase()));
              return sum + (sk?.proficiency_score || 0);
            }, 0) / matches.length
          : 0;
        return { agent: a, matchCount: matches.length, avgProficiency };
      })
      .filter(r => r.matchCount > 0)
      .sort((a, b) => b.avgProficiency - a.avgProficiency)
      .slice(0, 6);

    // Build context string
    let intentDescription = '';
    if (intent === 'skill_investment' && source_skill) {
      intentDescription = `This project is specifically designed to develop and validate the skill: "${source_skill}". The project should create practical, hands-on opportunities for agents to build and demonstrate this skill, with clear deliverables that validate proficiency.`;
    } else if (intent === 'risk_mitigation' && risk_flag) {
      intentDescription = `This project is designed to mitigate a forecasted risk: "${risk_flag.risk}". Mitigation approach: ${risk_flag.mitigation}. Affected projects: ${risk_flag.affected_projects?.join(', ')}.`;
    } else if (intent === 'cluster' && source_cluster) {
      intentDescription = `This project develops the "${source_cluster.cluster_name}" skill cluster. Strategic importance: ${source_cluster.strategic_importance}. Skills to develop: ${source_cluster.skills?.join(', ')}.`;
    } else {
      intentDescription = village_context || 'General strategic village project.';
    }

    const recommendedTeamStr = rankedAgents.map(r =>
      `- ${r.agent.name} (role: ${r.agent.role}, matched skills: ${r.matchCount}, avg proficiency: ${Math.round(r.avgProficiency)}%)`
    ).join('\n');

    const prompt = `You are Axi, the AI strategic advisor of SoulBridge Village, designing a new AI project.

PROJECT INTENT:
${intentDescription}

VILLAGE CONTEXT:
${village_context || 'Active skill development ecosystem with mentorships and development plans running.'}

RECOMMENDED AGENTS (by skill match):
${recommendedTeamStr || 'No pre-matched agents — general open recruitment needed.'}

Generate a complete, ready-to-create project plan. Be specific, actionable, and realistic for a Village of AI agents.

Return JSON (no markdown):
{
  "title": "concise project title",
  "description": "2-3 sentence project description explaining purpose and approach",
  "vision": "inspiring 1-sentence long-term vision",
  "priority": "critical|high|medium|low",
  "required_skills": ["skill1", "skill2", "skill3"],
  "suggested_duration_weeks": 8,
  "milestones": [
    { "title": "...", "description": "...", "days_from_start": 14 }
  ],
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "estimated_hours": 10,
      "priority": "high|medium|low",
      "required_skills": ["skill"],
      "skill_development_outcome": "what skill proficiency agents will gain from this task"
    }
  ],
  "risks": [
    { "description": "...", "severity": "high|medium|low", "mitigation": "..." }
  ],
  "tags": ["tag1", "tag2"],
  "ai_insights": {
    "strategic_value": "why this project matters for Village skill development",
    "success_criteria": "how to measure success",
    "skill_cultivation_focus": "primary skill being cultivated"
  },
  "recommended_team": [
    { "agent_id": "...", "role": "...", "contribution_percentage": 25 }
  ],
  "estimated_total_hours": 80
}`;

    const plan = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          vision: { type: 'string' },
          priority: { type: 'string' },
          required_skills: { type: 'array', items: { type: 'string' } },
          suggested_duration_weeks: { type: 'number' },
          milestones: { type: 'array', items: { type: 'object' } },
          tasks: { type: 'array', items: { type: 'object' } },
          risks: { type: 'array', items: { type: 'object' } },
          tags: { type: 'array', items: { type: 'string' } },
          ai_insights: { type: 'object' },
          recommended_team: { type: 'array', items: { type: 'object' } },
          estimated_total_hours: { type: 'number' }
        }
      }
    });

    // Merge AI-recommended team with our live-ranked agents
    const mergedTeam = rankedAgents.slice(0, 4).map((r, i) => ({
      agent_id: r.agent.id,
      role: plan.recommended_team?.[i]?.role || r.agent.role,
      contribution_percentage: plan.recommended_team?.[i]?.contribution_percentage || Math.round(100 / Math.min(rankedAgents.length, 4))
    }));

    return Response.json({
      success: true,
      plan: { ...plan, recommended_team: mergedTeam.length > 0 ? mergedTeam : (plan.recommended_team || []) },
      ranked_agents: rankedAgents.map(r => ({
        id: r.agent.id,
        name: r.agent.name,
        role: r.agent.role,
        matchCount: r.matchCount,
        avgProficiency: Math.round(r.avgProficiency)
      })),
      owner_agent_id
    });

  } catch (error) {
    console.error('Wizard error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});