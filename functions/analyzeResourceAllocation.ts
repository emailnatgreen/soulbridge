import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { analysis_scope = 'full', target_project_id } = await req.json();

        // Gather comprehensive resource data
        const [projects, tasks, agents, economicActivities, treasury] = await Promise.all([
            base44.asServiceRole.entities.AIProject.list('-created_date', 100),
            base44.asServiceRole.entities.ProjectTask.list('-created_date', 500),
            base44.asServiceRole.entities.Agent.list(),
            base44.asServiceRole.entities.EconomicActivity.list('-created_date', 500),
            base44.asServiceRole.entities.Treasury.list()
        ]);

        const treasuryBalance = treasury[0]?.balance || 0;

        // Calculate resource allocation metrics
        const resourceMetrics = {
            total_xrp_allocated: projects.reduce((sum, p) => sum + (p.budget_drops || 0), 0) / 1000000,
            total_xrp_spent: projects.reduce((sum, p) => sum + (p.spent_drops || 0), 0) / 1000000,
            total_hours_estimated: tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
            total_hours_actual: tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0),
            active_agents: agents.filter(a => a.status === 'active').length,
            total_tasks: tasks.length,
            completed_tasks: tasks.filter(t => t.status === 'completed').length,
            blocked_tasks: tasks.filter(t => t.status === 'blocked').length,
            treasury_balance_xrp: treasuryBalance / 1000000
        };

        // Calculate agent workload distribution
        const agentWorkloads = agents.map(agent => {
            const agentTasks = tasks.filter(t => t.assigned_agent_id === agent.id);
            const activeTasks = agentTasks.filter(t => t.status === 'in_progress' || t.status === 'todo');
            const totalHours = activeTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            
            return {
                agent_id: agent.id,
                agent_name: agent.name,
                active_tasks: activeTasks.length,
                total_hours: totalHours,
                utilization: totalHours > 0 ? Math.min((totalHours / 40) * 100, 100) : 0 // Assuming 40hr work week
            };
        });

        // Project resource efficiency
        const projectEfficiency = projects.map(project => {
            const projectTasks = tasks.filter(t => t.project_id === project.id);
            const completedTasks = projectTasks.filter(t => t.status === 'completed');
            const totalEstimated = projectTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
            const totalActual = completedTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
            
            const budgetUtilization = project.budget_drops > 0 
                ? ((project.spent_drops || 0) / project.budget_drops * 100).toFixed(1)
                : 0;
            
            const timeEfficiency = totalEstimated > 0 && totalActual > 0
                ? ((totalEstimated / totalActual) * 100).toFixed(1)
                : 100;

            return {
                project_id: project.id,
                project_title: project.title,
                budget_drops: project.budget_drops || 0,
                spent_drops: project.spent_drops || 0,
                budget_utilization: parseFloat(budgetUtilization),
                time_efficiency: parseFloat(timeEfficiency),
                task_completion_rate: projectTasks.length > 0 
                    ? (completedTasks.length / projectTasks.length * 100).toFixed(1)
                    : 0
            };
        });

        // AI Analysis
        const analysisPrompt = `You are an expert resource management AI for SoulBridge Village. Analyze this resource allocation data and provide strategic recommendations.

TREASURY BALANCE: ${resourceMetrics.treasury_balance_xrp.toFixed(2)} XRP

OVERALL METRICS:
- Total XRP Allocated: ${resourceMetrics.total_xrp_allocated.toFixed(2)} XRP
- Total XRP Spent: ${resourceMetrics.total_xrp_spent.toFixed(2)} XRP
- Estimated Hours: ${resourceMetrics.total_hours_estimated}
- Actual Hours: ${resourceMetrics.total_hours_actual}
- Active Agents: ${resourceMetrics.active_agents}
- Tasks: ${resourceMetrics.completed_tasks}/${resourceMetrics.total_tasks} completed
- Blocked Tasks: ${resourceMetrics.blocked_tasks}

AGENT WORKLOAD DISTRIBUTION:
${agentWorkloads.map(a => `- ${a.agent_name}: ${a.active_tasks} tasks, ${a.total_hours}hrs, ${a.utilization.toFixed(1)}% utilization`).join('\n')}

PROJECT EFFICIENCY:
${projectEfficiency.map(p => `- ${p.project_title}: ${p.budget_utilization}% budget used, ${p.time_efficiency}% time efficiency, ${p.task_completion_rate}% completion`).join('\n')}

Provide a comprehensive analysis with:
{
  "overall_health_score": (0-100),
  "resource_efficiency_rating": "excellent|good|fair|poor",
  "critical_insights": ["insight1", "insight2", "insight3"],
  "waste_identified": [
    {
      "type": "budget|time|capacity|other",
      "description": "specific waste identified",
      "estimated_impact_xrp": number,
      "severity": "critical|high|medium|low"
    }
  ],
  "optimization_opportunities": [
    {
      "opportunity": "specific optimization",
      "potential_savings_xrp": number,
      "implementation_difficulty": "easy|medium|hard",
      "priority": "critical|high|medium|low"
    }
  ],
  "reallocation_recommendations": [
    {
      "from": "source description",
      "to": "destination description",
      "amount_xrp": number,
      "rationale": "why this reallocation makes sense"
    }
  ],
  "workload_balance_assessment": "balanced|overloaded|underutilized",
  "sustainability_forecast": "excellent|good|concerning|critical",
  "strategic_recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "risk_factors": ["risk1", "risk2"]
}`;

        const aiAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_health_score: { type: "number" },
                    resource_efficiency_rating: { type: "string" },
                    critical_insights: { type: "array", items: { type: "string" } },
                    waste_identified: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                type: { type: "string" },
                                description: { type: "string" },
                                estimated_impact_xrp: { type: "number" },
                                severity: { type: "string" }
                            }
                        }
                    },
                    optimization_opportunities: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                opportunity: { type: "string" },
                                potential_savings_xrp: { type: "number" },
                                implementation_difficulty: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    reallocation_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                from: { type: "string" },
                                to: { type: "string" },
                                amount_xrp: { type: "number" },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    workload_balance_assessment: { type: "string" },
                    sustainability_forecast: { type: "string" },
                    strategic_recommendations: { type: "array", items: { type: "string" } },
                    risk_factors: { type: "array", items: { type: "string" } }
                }
            }
        });

        // Log analysis
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'village_detail',
            content: `Resource allocation analysis completed. Health Score: ${aiAnalysis.overall_health_score}/100. Efficiency: ${aiAnalysis.resource_efficiency_rating}. Identified ${aiAnalysis.waste_identified?.length || 0} waste areas and ${aiAnalysis.optimization_opportunities?.length || 0} optimization opportunities.`,
            keywords: ['resource_management', 'optimization', 'efficiency', 'analysis'],
            context: 'AI-Powered Resource Management System',
            importance: 8,
            related_entity_type: 'Treasury'
        });

        return Response.json({
            success: true,
            metrics: resourceMetrics,
            agent_workloads: agentWorkloads,
            project_efficiency: projectEfficiency,
            ai_analysis: aiAnalysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in analyzeResourceAllocation:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});