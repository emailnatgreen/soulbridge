import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id } = await req.json();

        const [project, tasks, team] = await Promise.all([
            base44.entities.AIProject.get(project_id),
            base44.entities.ProjectTask.filter({ project_id }),
            base44.entities.Agent.list()
        ]);

        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        const teamMembers = team.filter(agent => 
            project.team_members?.some(tm => tm.agent_id === agent.id)
        );

        const resourceListings = await base44.entities.ResourceListing.filter({
            status: { $in: ['available', 'low_stock'] }
        });

        const productionChains = await base44.entities.ProductionChain.filter({
            status: 'active'
        });

        const prompt = `You are an AI project risk analyst for SoulBridge Village.

**Project Overview:**
${JSON.stringify({
    title: project.title,
    status: project.status,
    priority: project.priority,
    budget: project.budget_rlusd,
    spent: project.spent_rlusd,
    progress: project.progress_percentage,
    start_date: project.start_date,
    target_completion: project.target_completion_date,
    required_skills: project.required_skills
}, null, 2)}

**Team Composition:** ${teamMembers.length} members
${teamMembers.map(m => `- ${m.name} (${m.role}): ${m.core_skills?.map(s => s.name).join(', ')}`).join('\n')}

**Tasks:** ${tasks.length} total
- Todo: ${tasks.filter(t => t.status === 'todo').length}
- In Progress: ${tasks.filter(t => t.status === 'in_progress').length}
- Blocked: ${tasks.filter(t => t.status === 'blocked').length}
- Completed: ${tasks.filter(t => t.status === 'completed').length}

**Available Resources:** ${resourceListings.length} marketplace listings
**Active Production Chains:** ${productionChains.length}

Analyze ALL potential risks for this project across multiple dimensions:

1. **Resource Risks:** Dependencies on marketplace resources, production chain availability
2. **Timeline Risks:** Schedule conflicts, blocked tasks, dependency bottlenecks
3. **Team Risks:** Skill gaps, workload distribution, member availability
4. **Budget Risks:** Spending rate, resource costs, unexpected expenses
5. **Technical Risks:** Complexity, dependencies, integration challenges
6. **External Risks:** Market volatility, supply chain disruptions

For each risk identified, provide:
- severity: low/medium/high/critical
- probability: 0-100
- impact_description: What happens if this materializes
- mitigation_strategy: Actionable steps to prevent/minimize
- early_warning_signs: Indicators to watch`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_risk_level: { type: "string" },
                    overall_risk_score: { type: "number" },
                    critical_risks: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                title: { type: "string" },
                                severity: { type: "string" },
                                probability: { type: "number" },
                                impact_description: { type: "string" },
                                mitigation_strategy: { type: "string" },
                                early_warning_signs: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    recommendations: {
                        type: "array",
                        items: { type: "string" }
                    },
                    monitoring_priorities: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            project_id,
            risk_analysis: aiResponse,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Risk analysis error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});