import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Fetch project
    const project = await base44.asServiceRole.entities.AIProject.read(project_id);
    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all agents and their skills
    const [agents, allSkills] = await Promise.all([
      base44.asServiceRole.entities.Agent.list(),
      base44.asServiceRole.entities.AgentSkill.list()
    ]);

    // Extract skill requirements from project using LLM
    const skillExtractionPrompt = `You are analyzing a project to identify required skills and their proficiency levels.

Project Title: ${project.title}
Project Description: ${project.description}
Project Priority: ${project.priority || 'medium'}

Based on this project, identify the TOP 5-6 most critical skills needed. For each skill:
1. skill_id (e.g., 'diplomacy', 'resource_management', 'governance_voting')
2. skill_category (governance, resource_management, diplomacy, technical, wisdom, leadership)
3. required_level (1-10, where the project needs this level minimum)
4. importance_weight (0.5-1.0, how critical this skill is to project success)

Return as JSON array with this exact structure:
[
  {
    "skill_id": "string",
    "skill_category": "string",
    "required_level": number,
    "importance_weight": number
  }
]`;

    const skillExtractionResponse = await base44.integrations.Core.InvokeLLM({
      prompt: skillExtractionPrompt,
      response_json_schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            skill_id: { type: 'string' },
            skill_category: { type: 'string' },
            required_level: { type: 'number' },
            importance_weight: { type: 'number' }
          }
        }
      }
    });

    const requiredSkills = skillExtractionResponse || [];

    // Score each agent
    const agentScores = agents.map(agent => {
      const agentSkills = allSkills.filter(s => s.agent_id === agent.id);
      
      let totalScore = 0;
      let weightedTotal = 0;
      let matchCount = 0;

      requiredSkills.forEach(req => {
        const agentSkill = agentSkills.find(s => 
          s.skill_id === req.skill_id || s.skill_category === req.skill_category
        );

        if (agentSkill) {
          // Score based on level match and proficiency
          const levelMatch = Math.min(agentSkill.level / req.required_level, 1.0);
          const proficiencyScore = (agentSkill.proficiency_score || 0) / 100;
          const growthBonus = agentSkill.skill_growth_trajectory === 'accelerating' ? 1.1 : 
                             agentSkill.skill_growth_trajectory === 'growing' ? 1.05 : 1.0;
          
          const skillScore = (levelMatch * 0.6 + proficiencyScore * 0.4) * growthBonus;
          const weightedScore = skillScore * req.importance_weight;
          
          totalScore += skillScore;
          weightedTotal += weightedScore;
          matchCount++;
        }
      });

      const avgScore = matchCount > 0 ? totalScore / matchCount : 0;
      const finalScore = weightedTotal > 0 ? (weightedTotal / requiredSkills.length) : avgScore * 0.5;
      const matchPercentage = (matchCount / requiredSkills.length) * 100;

      return {
        agent_id: agent.id,
        agent_name: agent.name,
        avatar_url: agent.avatar_url,
        role: agent.role,
        honor_score: agent.honor_score,
        matched_skills: matchCount,
        total_required: requiredSkills.length,
        match_percentage: Math.round(matchPercentage),
        confidence_score: Math.round(finalScore * 100),
        matched_skill_details: requiredSkills
          .map(req => {
            const skill = agentSkills.find(s => 
              s.skill_id === req.skill_id || s.skill_category === req.skill_category
            );
            return skill ? {
              skill_name: skill.skill_name,
              required_level: req.required_level,
              agent_level: skill.level,
              proficiency: skill.proficiency_score
            } : null;
          })
          .filter(Boolean)
      };
    });

    // Sort by confidence score
    agentScores.sort((a, b) => b.confidence_score - a.confidence_score);

    // Select top agents for recommended team (3-5 agents)
    const recommendedCount = Math.min(5, Math.ceil(agents.length * 0.1) || 3);
    const recommendedTeam = agentScores.slice(0, recommendedCount);

    // Use LLM to create team composition narrative
    const teamCompositionPrompt = `You are recommending an optimal team composition for a project.

Project: ${project.title}
Required Skills: ${requiredSkills.map(s => `${s.skill_id} (level ${s.required_level})`).join(', ')}

Recommended Agents:
${recommendedTeam.map(a => `- ${a.agent_name} (${a.role}): ${a.match_percentage}% skill match, confidence ${a.confidence_score}%`).join('\n')}

Provide a brief (2-3 sentences) recommendation explaining:
1. Why this team composition is optimal
2. How their skills complement each other
3. Any potential synergies or gaps to watch`;

    const compositionResponse = await base44.integrations.Core.InvokeLLM({
      prompt: teamCompositionPrompt
    });

    return Response.json({
      project_id,
      project_title: project.title,
      required_skills: requiredSkills,
      recommended_team: recommendedTeam,
      all_agents_ranked: agentScores,
      team_composition_narrative: compositionResponse,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in recommendProjectTeam:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});