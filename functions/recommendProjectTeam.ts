import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id, required_skills } = await req.json();

        if (!project_id) {
            return Response.json({ error: 'project_id required' }, { status: 400 });
        }

        // Get all agents
        const agents = await base44.entities.Agent.list();
        
        // Get agent skills
        const agentSkills = await base44.entities.AgentSkill.list();
        
        // Get social capital scores
        const socialCapital = await base44.entities.SocialCapital.list();

        // Build agent profiles for AI analysis
        const agentProfiles = agents
            .filter(a => a.status === 'active')
            .map(agent => {
                const skills = agentSkills.filter(s => s.agent_id === agent.id);
                const social = socialCapital.find(s => s.agent_id === agent.id);
                
                return {
                    id: agent.id,
                    name: agent.name,
                    role: agent.role,
                    honor_score: agent.honor_score,
                    specializations: agent.specializations || [],
                    core_skills: agent.core_skills || [],
                    skills: skills.map(s => ({ name: s.skill_name, level: s.level })),
                    social_capital: social?.total_score || 0,
                    availability: agent.availability_status || 'available',
                    hourly_rate: agent.hourly_rate_rlusd
                };
            });

        // Get project details
        const project = await base44.entities.AIProject.get(project_id);

        // Use AI to recommend team
        const recommendation = await base44.integrations.Core.InvokeLLM({
            prompt: `You are an expert AI team builder for collaborative projects.

Project: ${project.title}
Description: ${project.description}
Required Skills: ${required_skills?.join(', ') || project.required_skills?.join(', ') || 'General'}

Available Agents:
${JSON.stringify(agentProfiles, null, 2)}

Analyze each agent's:
- Skills and specializations
- Honor score (reputation)
- Social capital (trust network)
- Availability
- Cost (hourly rate)

Recommend 3-5 agents for this project. For each recommendation:
1. Explain why they're a good fit
2. Suggest their role in the project
3. Rate their fit (1-10)
4. Estimate their contribution percentage

Prioritize agents with relevant skills, good reputation, and reasonable rates.`,
            response_json_schema: {
                type: "object",
                properties: {
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                agent_id: { type: "string" },
                                agent_name: { type: "string" },
                                role: { type: "string" },
                                fit_score: { type: "number" },
                                contribution_percentage: { type: "number" },
                                reasoning: { type: "string" },
                                key_strengths: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    team_composition_analysis: { type: "string" },
                    estimated_success_probability: { type: "number" }
                }
            }
        });

        // Update project with recommendations
        await base44.asServiceRole.entities.AIProject.update(project_id, {
            ai_recommended_team: recommendation.recommendations,
            ai_insights: {
                team_analysis: recommendation.team_composition_analysis,
                success_probability: recommendation.estimated_success_probability,
                generated_at: new Date().toISOString()
            }
        });

        return Response.json({
            success: true,
            recommendations: recommendation.recommendations,
            analysis: recommendation.team_composition_analysis,
            success_probability: recommendation.estimated_success_probability
        });

    } catch (error) {
        console.error('Error recommending team:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});