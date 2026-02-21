import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        const [agent, developmentPlans, skillProgress, completedModules, endorsements] = await Promise.all([
            base44.entities.Agent.get(agent_id),
            base44.entities.SkillDevelopmentPlan.filter({ agent_id }),
            base44.entities.SkillProgress.filter({ agent_id }),
            base44.entities.TrainingModule.list(),
            base44.entities.SkillEndorsement.filter({ endorsed_agent_id: agent_id })
        ]);

        const activePlans = developmentPlans.filter(p => p.status === 'active');

        const prompt = `You are analyzing skill development progress for an agent in SoulBridge Village.

**Agent:** ${agent.name}

**Active Development Plans:**
${activePlans.map(p => `
- ${p.plan_title}
  Status: ${p.status}
  Progress: ${p.overall_progress}%
  Objectives: ${p.learning_objectives?.map(o => o.skill).join(', ')}
`).join('\n')}

**Skill Progress Tracking:**
${skillProgress.map(sp => `
- ${sp.skill_name}: ${sp.current_level}/${sp.target_level} (${sp.progress_percentage}% complete)
  Activities completed: ${sp.activities_completed?.length || 0}
  Modules completed: ${sp.modules_completed?.length || 0}
  Mentorship hours: ${sp.mentorship_hours || 0}
`).join('\n')}

**Recent Endorsements:**
${endorsements.slice(0, 10).map(e => `- ${e.skill_name} (Level ${e.proficiency_level}) from ${e.endorser_agent_id}`).join('\n')}

**Analyze this agent's skill development journey:**

1. **Progress Assessment**: How well are they advancing toward goals?
2. **Growth Rate**: Are they learning at an optimal pace?
3. **Strengths**: What's working well in their development?
4. **Bottlenecks**: What's slowing progress?
5. **Recommendations**: What should they focus on next?
6. **Milestones**: What achievements should be celebrated?
7. **Adjustments**: Should the learning plan be modified?`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_development_health: {
                        type: "object",
                        properties: {
                            health_score: { type: "number" },
                            status: { type: "string" },
                            trajectory: { type: "string" }
                        }
                    },
                    progress_by_skill: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill: { type: "string" },
                                progress_rating: { type: "string" },
                                growth_rate: { type: "string" },
                                time_to_target: { type: "string" }
                            }
                        }
                    },
                    achievements: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                achievement: { type: "string" },
                                significance: { type: "string" },
                                date: { type: "string" }
                            }
                        }
                    },
                    challenges: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                challenge: { type: "string" },
                                impact: { type: "string" },
                                suggested_solution: { type: "string" }
                            }
                        }
                    },
                    next_steps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                action: { type: "string" },
                                priority: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    },
                    plan_adjustments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                adjustment: { type: "string" },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    motivational_insights: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            celebration_worthy_milestones: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            agent_id,
            development_tracking: aiResponse,
            tracked_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Skill tracking error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});