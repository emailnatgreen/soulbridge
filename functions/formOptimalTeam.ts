import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id, required_skills, team_size } = await req.json();

        const [
            project,
            agents,
            skills,
            synergy,
            reputationScores,
            wellbeingRecords,
            performances
        ] = await Promise.all([
            project_id ? base44.entities.AIProject.get(project_id) : Promise.resolve(null),
            base44.entities.Agent.list(),
            base44.entities.AgentSkill.list(),
            base44.entities.TeamSynergy.list(),
            base44.entities.ReputationScore.list(),
            base44.entities.AgentWellbeing.list('-created_date', 100),
            base44.entities.AgentPerformanceMetrics.list('-created_date', 100)
        ]);

        // Build agent profiles
        const agentProfiles = agents.map(agent => {
            const agentSkills = skills.filter(s => s.agent_id === agent.id);
            const reputation = reputationScores.find(r => r.agent_id === agent.id);
            const wellbeing = wellbeingRecords.find(w => w.agent_id === agent.id);
            const performance = performances.find(p => p.agent_id === agent.id);
            
            return {
                agent_id: agent.id,
                name: agent.name,
                role: agent.role,
                skills: agentSkills.map(s => ({
                    name: s.skill_name,
                    level: s.proficiency_level
                })),
                reputation_score: reputation?.overall_score || 100,
                wellbeing_status: wellbeing?.wellbeing_status || 'healthy',
                overall_performance: performance?.overall_score || 70,
                current_workload: 0 // TODO: Calculate from active projects
            };
        });

        const prompt = `You are the Team Formation Oracle for SoulBridge Village, creating optimal teams for projects.

**Project:** ${project?.title || 'New Project'}
**Required Skills:** ${required_skills?.join(', ') || 'General'}
**Target Team Size:** ${team_size || 5}

**Available Agents (${agentProfiles.length}):**
${agentProfiles.map(p => `
**${p.name}** (${p.role})
- Skills: ${p.skills.slice(0, 5).map(s => `${s.name} (${s.level}/5)`).join(', ')}
- Reputation: ${p.reputation_score}/1000
- Wellbeing: ${p.wellbeing_status}
- Performance: ${p.overall_performance}/100
`).join('\n')}

**Existing Synergy Data:**
${synergy.slice(0, 20).map(s => {
    const agentA = agents.find(a => a.id === s.agent_a_id);
    const agentB = agents.find(a => a.id === s.agent_b_id);
    return `${agentA?.name} ↔ ${agentB?.name}: ${s.synergy_score}/10`;
}).join('\n')}

**Form the optimal team:**

1. Select ${team_size || 5} agents
2. For each member, assign their role and primary skills
3. Calculate team effectiveness score (0-100)
4. Predict synergy between pairs
5. Analyze skill coverage
6. Assess diversity and workload balance
7. Provide formation reasoning

Optimize for:
- Skill coverage for required skills
- Team chemistry and synergy
- Balanced workload
- Diverse perspectives
- High reputation and wellbeing
- Complementary strengths`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    team_members: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                agent_id: { type: "string" },
                                role: { type: "string" },
                                assigned_skills: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                contribution_focus: { type: "string" }
                            }
                        }
                    },
                    ai_team_score: { type: "number" },
                    skill_coverage: {
                        type: "object",
                        properties: {
                            required_skills: {
                                type: "array",
                                items: { type: "string" }
                            },
                            covered_skills: {
                                type: "array",
                                items: { type: "string" }
                            },
                            skill_gaps: {
                                type: "array",
                                items: { type: "string" }
                            },
                            coverage_percentage: { type: "number" }
                        }
                    },
                    synergy_predictions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                agent_a_id: { type: "string" },
                                agent_b_id: { type: "string" },
                                predicted_synergy: { type: "number" },
                                reasoning: { type: "string" }
                            }
                        }
                    },
                    diversity_score: { type: "number" },
                    workload_balance: { type: "number" },
                    formation_reasoning: { type: "string" },
                    team_strengths: {
                        type: "array",
                        items: { type: "string" }
                    },
                    potential_challenges: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        const teamFormation = {
            project_id,
            team_name: project?.title ? `${project.title} Team` : 'Optimal Team',
            team_members: aiResponse.team_members,
            formation_method: 'ai_recommended',
            ai_team_score: aiResponse.ai_team_score,
            skill_coverage: aiResponse.skill_coverage,
            synergy_predictions: aiResponse.synergy_predictions,
            diversity_score: aiResponse.diversity_score,
            workload_balance: aiResponse.workload_balance,
            formation_reasoning: aiResponse.formation_reasoning,
            status: 'proposed'
        };

        const created = await base44.asServiceRole.entities.TeamFormation.create(teamFormation);

        return Response.json({
            success: true,
            team_formation: created,
            team_strengths: aiResponse.team_strengths,
            potential_challenges: aiResponse.potential_challenges,
            formed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Team formation error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});