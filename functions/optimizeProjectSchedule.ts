import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id } = await req.json();

        const [project, tasks, team, productionChains] = await Promise.all([
            base44.entities.AIProject.get(project_id),
            base44.entities.ProjectTask.filter({ project_id }),
            base44.entities.Agent.list(),
            base44.entities.ProductionChain.filter({ status: 'active' })
        ]);

        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        const teamMembers = team.filter(agent => 
            project.team_members?.some(tm => tm.agent_id === agent.id)
        );

        const prompt = `You are an AI project scheduler for SoulBridge Village.

**Project:** ${project.title}
**Status:** ${project.status}
**Current Progress:** ${project.progress_percentage}%
**Target Completion:** ${project.target_completion_date}

**Tasks:**
${tasks.map(t => `- [${t.status}] ${t.title} | Est: ${t.estimated_hours}h | Assigned: ${t.assigned_agent_id || 'Unassigned'} | Deps: ${t.dependencies?.length || 0}`).join('\n')}

**Team Availability:**
${teamMembers.map(m => `- ${m.name}: ${m.core_skills?.map(s => s.name).join(', ')}`).join('\n')}

**Active Production Chains:** ${productionChains.length} (may affect resource availability)

Optimize the project schedule using advanced AI scheduling algorithms:

1. **Task Prioritization:** Reorder tasks for maximum efficiency
2. **Dependency Resolution:** Identify critical path and parallel opportunities
3. **Resource Leveling:** Balance workload across team members
4. **Timeline Prediction:** Realistic completion estimates
5. **Bottleneck Detection:** Find and resolve scheduling constraints

Provide:
- optimized_task_sequence: Recommended task order with rationale
- critical_path: Tasks that directly impact completion date
- parallel_opportunities: Tasks that can run simultaneously
- resource_allocation: Optimal agent assignments
- predicted_completion_date: Realistic estimate
- time_savings: Hours saved vs current schedule
- efficiency_improvements: Specific optimizations made`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    optimized_task_sequence: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                task_id: { type: "string" },
                                priority_rank: { type: "number" },
                                rationale: { type: "string" },
                                recommended_start: { type: "string" }
                            }
                        }
                    },
                    critical_path: {
                        type: "array",
                        items: { type: "string" }
                    },
                    parallel_opportunities: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                tasks: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                benefit: { type: "string" }
                            }
                        }
                    },
                    resource_allocation: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                task_id: { type: "string" },
                                recommended_agent: { type: "string" },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    predicted_completion_date: { type: "string" },
                    time_savings_hours: { type: "number" },
                    efficiency_improvements: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            project_id,
            schedule_optimization: aiResponse,
            optimized_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Schedule optimization error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});