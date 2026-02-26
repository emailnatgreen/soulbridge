import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        if (!agent_id) {
            return Response.json({ error: 'agent_id is required' }, { status: 400 });
        }

        // Get agent details
        const agent = await base44.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Get current skills
        const skills = await base44.entities.AgentSkill.filter({ agent_id: agent_id });

        // Get recent tasks and projects
        const tasks = await base44.entities.ProjectTask.filter({ assigned_agent_id: agent_id });
        const recentTasks = tasks.slice(0, 20);

        // Get collaboration sessions
        const allSessions = await base44.entities.CollaborativeSession.list();
        const participatedSessions = allSessions.filter(s => s.participant_agent_ids?.includes(agent_id));

        // Get well-being data
        const wellbeingRecords = await base44.entities.AgentWellbeing.filter({ agent_id: agent_id });
        const wellbeing = wellbeingRecords[0];

        // AI-powered skill recommendations
        const recommendationPrompt = `As Chief Educator of SoulBridge Village, recommend skill development paths for this agent:

AGENT PROFILE:
Name: ${agent.name}
Role: ${agent.role}
Purpose: ${agent.purpose}
Honor Score: ${agent.honor_score}
Core Skills: ${agent.core_skills?.map(s => `${s.name} (Level ${s.level})`).join(', ') || 'None listed'}
Specializations: ${agent.specializations?.join(', ') || 'None'}

CURRENT SKILLS:
${skills.map(s => `- ${s.skill_name} (${s.skill_category}): Level ${s.level}/${s.max_level || 10}, Used ${s.times_used || 0} times, ${s.proficiency_score || 0}% proficiency`).join('\n')}

RECENT ACTIVITY:
- Tasks: ${recentTasks.length} (${recentTasks.filter(t => t.status === 'completed').length} completed)
- Task Types: ${[...new Set(recentTasks.map(t => t.task_type))].join(', ')}
- Collaborations: ${participatedSessions.length} sessions

WELL-BEING:
${wellbeing ? `Overall: ${wellbeing.overall_score}/100, Workload: ${wellbeing.workload_score}/10, Social: ${wellbeing.social_connection_score}/10` : 'No data'}

Provide comprehensive skill development recommendations:
{
  "recommended_skills": [
    {
      "skill_id": "string",
      "skill_name": "string",
      "skill_category": "governance|resource_management|diplomacy|technical|wisdom|combat|creative|research|leadership|wellbeing",
      "priority": "critical|high|medium|low",
      "rationale": "why this skill is important for this agent",
      "estimated_impact": "what benefits this will bring",
      "time_to_proficiency": "beginner|intermediate|advanced|expert",
      "unlock_cost_xp": 100,
      "prerequisites": ["skill_id1"],
      "synergies_with_existing": ["existing_skill_id"]
    }
  ],
  "skill_paths": [
    {
      "path_name": "string",
      "description": "career path description",
      "skills_in_path": ["skill1", "skill2", "skill3"],
      "estimated_completion": "weeks|months",
      "career_opportunities": ["opportunity1", "opportunity2"]
    }
  ],
  "skills_to_prioritize": [
    {
      "skill_name": "string",
      "current_level": 5,
      "recommended_level": 8,
      "reason": "why to upgrade this specific skill"
    }
  ],
  "underutilized_skills": [
    {
      "skill_name": "string",
      "current_level": 7,
      "times_used": 2,
      "suggestion": "how to apply this skill more effectively"
    }
  ],
  "training_recommendations": ["training1", "training2"],
  "mentorship_suggestions": ["mentor_agent_id1"],
  "collaborative_opportunities": ["where to apply skills in team settings"]
}`;

        const recommendations = await base44.integrations.Core.InvokeLLM({
            prompt: recommendationPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recommended_skills: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill_id: { type: "string" },
                                skill_name: { type: "string" },
                                skill_category: { type: "string" },
                                priority: { type: "string" },
                                rationale: { type: "string" },
                                estimated_impact: { type: "string" },
                                time_to_proficiency: { type: "string" },
                                unlock_cost_xp: { type: "number" },
                                prerequisites: { type: "array", items: { type: "string" } },
                                synergies_with_existing: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    skill_paths: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                path_name: { type: "string" },
                                description: { type: "string" },
                                skills_in_path: { type: "array", items: { type: "string" } },
                                estimated_completion: { type: "string" },
                                career_opportunities: { type: "array", items: { type: "string" } }
                            }
                        }
                    },
                    skills_to_prioritize: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill_name: { type: "string" },
                                current_level: { type: "number" },
                                recommended_level: { type: "number" },
                                reason: { type: "string" }
                            }
                        }
                    },
                    underutilized_skills: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill_name: { type: "string" },
                                current_level: { type: "number" },
                                times_used: { type: "number" },
                                suggestion: { type: "string" }
                            }
                        }
                    },
                    training_recommendations: { type: "array", items: { type: "string" } },
                    mentorship_suggestions: { type: "array", items: { type: "string" } },
                    collaborative_opportunities: { type: "array", items: { type: "string" } }
                }
            }
        });

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Generated skill recommendations for ${agent.name}: ${recommendations.recommended_skills.length} new skills, ${recommendations.skill_paths.length} career paths. Top priority: ${recommendations.recommended_skills[0]?.skill_name || 'None'}.`,
            keywords: ['skills', 'education', 'growth', agent.name.toLowerCase()],
            context: 'Enhanced Agent Skill Trees - AI Recommendations',
            importance: 7,
            related_entity_id: agent_id,
            related_entity_type: 'Agent'
        });

        return Response.json({
            success: true,
            recommendations: recommendations
        });

    } catch (error) {
        console.error('Error in generateSkillRecommendations:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});