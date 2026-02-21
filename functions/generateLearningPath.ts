import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, target_skills, timeline_weeks } = await req.json();

        const [agent, skillGapResponse, trainingModules, agents] = await Promise.all([
            base44.entities.Agent.get(agent_id),
            base44.functions.invoke('analyzeSkillGaps', { agent_id }),
            base44.entities.TrainingModule.list(),
            base44.entities.Agent.list()
        ]);

        const skillGapAnalysis = skillGapResponse.data.skill_gap_analysis;

        const prompt = `You are creating a personalized learning path for an agent in SoulBridge Village.

**Agent:** ${agent.name} (${agent.role})

**Skill Gap Analysis:**
${JSON.stringify(skillGapAnalysis, null, 2)}

**Target Skills to Develop:**
${target_skills.join(', ')}

**Timeline:** ${timeline_weeks} weeks

**Available Training Modules:**
${trainingModules.slice(0, 20).map(m => `- ${m.module_name} (${m.difficulty_level}, ${m.estimated_hours}h, Skills: ${m.skill_focus.join(', ')})`).join('\n')}

**Potential Mentors:**
${agents.filter(a => {
    const agentSkills = a.core_skills?.map(s => s.name.toLowerCase()) || [];
    return target_skills.some(ts => agentSkills.includes(ts.toLowerCase()));
}).slice(0, 10).map(a => `- ${a.name} (${a.role}): ${a.core_skills?.map(s => s.name).join(', ')}`).join('\n')}

**Create a comprehensive, actionable learning path that includes:**

1. **Phases**: Break learning into logical phases (Foundation → Application → Mastery)
2. **Training Modules**: Specific modules to complete in each phase
3. **Practice Projects**: Hands-on projects to apply learning
4. **Mentorship**: Which mentors to work with and on what
5. **Milestones**: Clear checkpoints to measure progress
6. **Time Allocation**: Realistic time estimates for each phase
7. **Success Metrics**: How to measure skill development

Make it practical, achievable, and tailored to this agent's current level and the Village's needs.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    plan_overview: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            total_duration: { type: "string" },
                            difficulty: { type: "string" },
                            expected_outcome: { type: "string" }
                        }
                    },
                    learning_phases: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                phase_number: { type: "number" },
                                phase_name: { type: "string" },
                                duration_weeks: { type: "number" },
                                objectives: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                activities: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    training_modules: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                module_name: { type: "string" },
                                phase: { type: "number" },
                                estimated_hours: { type: "number" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    practice_projects: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                project_title: { type: "string" },
                                description: { type: "string" },
                                skills_practiced: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                estimated_duration: { type: "string" },
                                phase: { type: "number" }
                            }
                        }
                    },
                    mentorship_plan: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                mentor_name: { type: "string" },
                                skill_focus: { type: "string" },
                                recommended_sessions: { type: "number" },
                                session_frequency: { type: "string" }
                            }
                        }
                    },
                    milestones: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                milestone: { type: "string" },
                                week: { type: "number" },
                                success_criteria: { type: "string" }
                            }
                        }
                    },
                    success_metrics: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                metric: { type: "string" },
                                measurement_method: { type: "string" },
                                target: { type: "string" }
                            }
                        }
                    },
                    estimated_time_commitment: {
                        type: "object",
                        properties: {
                            hours_per_week: { type: "number" },
                            total_hours: { type: "number" }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            agent_id,
            learning_path: aiResponse,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Learning path generation error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});