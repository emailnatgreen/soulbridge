import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch all data in parallel
        const [projects, tasks, agents] = await Promise.all([
            base44.asServiceRole.entities.AIProject.filter({}),
            base44.asServiceRole.entities.ProjectTask.filter({}),
            base44.asServiceRole.entities.Agent.filter({ status: 'active' })
        ]);

        // ── Project Health Aggregation ──
        const projectStats = projects.map(p => {
            const ptasks = tasks.filter(t => t.project_id === p.id);
            const completed = ptasks.filter(t => t.status === 'completed').length;
            const blocked = ptasks.filter(t => t.status === 'blocked').length;
            const inProgress = ptasks.filter(t => t.status === 'in_progress').length;
            const totalHoursEst = ptasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
            const totalHoursActual = ptasks.reduce((s, t) => s + (t.actual_hours || 0), 0);

            let health = 'green';
            if (blocked > 0 || (ptasks.length > 0 && completed / ptasks.length < 0.2 && p.status === 'active')) health = 'yellow';
            if (blocked >= 2 || p.status === 'on_hold') health = 'red';

            return {
                id: p.id,
                title: p.title,
                status: p.status,
                priority: p.priority,
                progress: p.progress_percentage || 0,
                task_count: ptasks.length,
                completed_tasks: completed,
                blocked_tasks: blocked,
                in_progress_tasks: inProgress,
                estimated_hours: totalHoursEst,
                actual_hours: totalHoursActual,
                hours_variance: totalHoursActual - totalHoursEst,
                health
            };
        });

        // ── Agent Performance Metrics ──
        const agentMetrics = agents.map(a => {
            const agentTasks = tasks.filter(t => t.assigned_agent_id === a.id);
            const completedTasks = agentTasks.filter(t => t.status === 'completed');
            const completionRate = agentTasks.length > 0 ? (completedTasks.length / agentTasks.length) * 100 : 0;
            const totalEstHours = agentTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0);
            const totalActualHours = agentTasks.reduce((s, t) => s + (t.actual_hours || 0), 0);
            const totalRewards = completedTasks.reduce((s, t) => s + (t.reward_drops || 0), 0);

            return {
                agent_id: a.id,
                agent_name: a.name,
                role: a.role,
                honor_score: a.honor_score,
                total_tasks_assigned: agentTasks.length,
                tasks_completed: completedTasks.length,
                tasks_in_progress: agentTasks.filter(t => t.status === 'in_progress').length,
                tasks_blocked: agentTasks.filter(t => t.status === 'blocked').length,
                completion_rate_percent: Math.round(completionRate),
                estimated_hours: totalEstHours,
                actual_hours: totalActualHours,
                efficiency_ratio: totalEstHours > 0 ? (totalEstHours / Math.max(totalActualHours, 1)).toFixed(2) : null,
                total_rewards_drops: totalRewards
            };
        }).filter(a => a.total_tasks_assigned > 0)
          .sort((a, b) => b.completion_rate_percent - a.completion_rate_percent);

        // ── Village-Wide Summary ──
        const summary = {
            total_projects: projects.length,
            active_projects: projects.filter(p => p.status === 'active').length,
            planning_projects: projects.filter(p => p.status === 'planning').length,
            completed_projects: projects.filter(p => p.status === 'completed').length,
            total_tasks: tasks.length,
            completed_tasks: tasks.filter(t => t.status === 'completed').length,
            blocked_tasks: tasks.filter(t => t.status === 'blocked').length,
            overall_completion_rate: tasks.length > 0
                ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
                : 0,
            projects_at_risk: projectStats.filter(p => p.health === 'red').length,
            generated_at: new Date().toISOString()
        };

        // ── AI Insights ──
        const atRiskProjects = projectStats.filter(p => p.health === 'red' || p.blocked_tasks > 0);
        let aiInsights = null;

        if (atRiskProjects.length > 0 || agentMetrics.length > 0) {
            aiInsights = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `You are Axi's strategic intelligence system for SoulBridge Village. Analyse the following cross-project data and provide actionable recommendations.

VILLAGE SUMMARY: ${JSON.stringify(summary)}
PROJECTS AT RISK: ${JSON.stringify(atRiskProjects.slice(0, 5))}
TOP AGENT PERFORMERS: ${JSON.stringify(agentMetrics.slice(0, 5))}
LOW COMPLETION AGENTS: ${JSON.stringify(agentMetrics.filter(a => a.completion_rate_percent < 50).slice(0, 3))}

Return JSON with:
- headline: One sentence summary of overall Village operational health
- top_risks: Array of up to 3 strings describing the most pressing project/resource risks
- resource_recommendations: Array of up to 3 specific actionable recommendations for resource reallocation
- skill_gaps_identified: Array of task_types or skills that appear understaffed
- early_warnings: Array of project IDs (from atRiskProjects) that need immediate attention`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        headline: { type: "string" },
                        top_risks: { type: "array", items: { type: "string" } },
                        resource_recommendations: { type: "array", items: { type: "string" } },
                        skill_gaps_identified: { type: "array", items: { type: "string" } },
                        early_warnings: { type: "array", items: { type: "string" } }
                    }
                }
            });
        }

        // ── Save to Memory for Axi ──
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Cross-Project Analytics Report: ${summary.active_projects} active projects, ${summary.overall_completion_rate}% overall completion rate, ${summary.blocked_tasks} blocked tasks, ${summary.projects_at_risk} projects at risk. ${aiInsights?.headline || ''}`,
            keywords: ['analytics', 'projects', 'performance', 'village_health'],
            importance: summary.projects_at_risk > 0 ? 8 : 6,
            context: 'Automated cross-project analytics scan'
        });

        // ── Notify Axi if risks detected ──
        if (summary.projects_at_risk > 0) {
            await base44.asServiceRole.entities.AgentNotification.create({
                agent_id: 'axi_main_001',
                title: `⚠️ Cross-Project Alert: ${summary.projects_at_risk} Project(s) At Risk`,
                message: aiInsights?.top_risks?.[0] || `${summary.projects_at_risk} project(s) have blocked tasks or stalled progress requiring attention.`,
                type: 'project',
                priority: 'high',
                read: false,
                action_url: '/AIProjectHub'
            });
        }

        return Response.json({
            success: true,
            summary,
            project_stats: projectStats,
            agent_metrics: agentMetrics,
            ai_insights: aiInsights
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});