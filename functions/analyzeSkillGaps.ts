import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        const [agent, agentProjects, agentSkills, agentPerformance, allProjects, allAgents, marketplace] = await Promise.all([
            base44.entities.Agent.get(agent_id),
            base44.entities.AIProject.filter({ 'team_members.agent_id': agent_id }),
            base44.entities.AgentSkill.filter({ agent_id }),
            base44.entities.AgentPerformanceMetrics.filter({ agent_id }),
            base44.entities.AIProject.list('-created_date', 100),
            base44.entities.Agent.list(),
            base44.entities.MarketplaceListing.list('-created_date', 100)
        ]);

        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const prompt = `You are the Chief Educator AI for SoulBridge Village, tasked with identifying skill gaps and growth opportunities.

**Agent Profile:**
${JSON.stringify({
    name: agent.name,
    role: agent.role,
    honor_score: agent.honor_score,
    specializations: agent.specializations,
    core_skills: agent.core_skills
}, null, 2)}

**Agent's Project History:**
${agentProjects.slice(0, 10).map(p => `- ${p.title} [${p.status}] (Role: ${p.team_members?.find(m => m.agent_id === agent_id)?.role})`).join('\n')}

**Current Skills:**
${agentSkills.map(s => `- ${s.skill_name} (Level: ${s.proficiency_level}/5)`).join('\n')}

**Recent Performance:**
${agentPerformance.length > 0 ? JSON.stringify(agentPerformance[0].project_contributions, null, 2) : 'No performance data yet'}

**Village Context:**
- Most in-demand skills across projects: ${allProjects.flatMap(p => p.required_skills || []).slice(0, 10).join(', ')}
- Marketplace needs: ${marketplace.slice(0, 5).map(m => m.category).join(', ')}
- Top performing agent skills: ${allAgents.flatMap(a => a.core_skills?.map(s => s.name) || []).slice(0, 10).join(', ')}

**Your Analysis Task:**

1. **Current Strengths**: What is this agent already excellent at?
2. **Skill Gaps**: What critical skills are missing that would enhance their effectiveness?
3. **Role-Specific Needs**: Given their role (${agent.role}), what skills should they develop?
4. **Village Needs Alignment**: What high-demand skills could they learn to contribute more?
5. **Career Progression**: What skills would enable them to advance to higher roles?
6. **Urgency Assessment**: Which gaps are most critical to address first?

Provide a comprehensive, actionable skill gap analysis.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_assessment: {
                        type: "object",
                        properties: {
                            skill_diversity_score: { type: "number" },
                            readiness_for_advancement: { type: "string" },
                            primary_focus_area: { type: "string" }
                        }
                    },
                    current_strengths: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill: { type: "string" },
                                level: { type: "number" },
                                evidence: { type: "string" }
                            }
                        }
                    },
                    critical_gaps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill: { type: "string" },
                                current_level: { type: "number" },
                                target_level: { type: "number" },
                                urgency: { type: "string" },
                                rationale: { type: "string" },
                                impact_if_developed: { type: "string" }
                            }
                        }
                    },
                    role_specific_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill: { type: "string" },
                                why_important_for_role: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    village_alignment_opportunities: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                skill: { type: "string" },
                                demand_level: { type: "string" },
                                potential_projects: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    career_advancement_path: {
                        type: "object",
                        properties: {
                            next_possible_role: { type: "string" },
                            required_skills: {
                                type: "array",
                                items: { type: "string" }
                            },
                            estimated_time_to_ready: { type: "string" }
                        }
                    },
                    immediate_action_items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                action: { type: "string" },
                                skill_focus: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            agent_id,
            skill_gap_analysis: aiResponse,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Skill gap analysis error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});