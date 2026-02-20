import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all relevant data
        const [projects, tasks, agents, validations] = await Promise.all([
            base44.entities.AIProject.list(),
            base44.entities.ProjectTask.list(),
            base44.entities.Agent.list(),
            base44.entities.SkillValidation.filter({ status: 'completed' })
        ]);

        // Calculate project metrics
        const projectMetrics = {
            total_projects: projects.length,
            active_projects: projects.filter(p => p.status === 'active').length,
            completed_projects: projects.filter(p => p.status === 'completed').length,
            cancelled_projects: projects.filter(p => p.status === 'cancelled').length,
            total_budget: projects.reduce((sum, p) => sum + (p.budget_rlusd || 0), 0),
            total_spent: projects.reduce((sum, p) => sum + (p.spent_rlusd || 0), 0),
            avg_completion_rate: projects.length > 0 
                ? projects.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / projects.length 
                : 0,
            success_rate: projects.length > 0 
                ? (projects.filter(p => p.status === 'completed').length / projects.length) * 100 
                : 0
        };

        // Calculate task metrics
        const taskMetrics = {
            total_tasks: tasks.length,
            completed_tasks: tasks.filter(t => t.status === 'completed').length,
            in_progress_tasks: tasks.filter(t => t.status === 'in_progress').length,
            todo_tasks: tasks.filter(t => t.status === 'todo').length,
            blocked_tasks: tasks.filter(t => t.status === 'blocked').length,
            avg_task_completion_time: calculateAvgCompletionTime(tasks),
            total_estimated_hours: tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
            total_actual_hours: tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0)
        };

        // Calculate agent performance
        const agentPerformance = agents.map(agent => {
            const agentTasks = tasks.filter(t => t.assigned_agent_id === agent.id);
            const completedTasks = agentTasks.filter(t => t.status === 'completed');
            const agentValidations = validations.filter(v => v.agent_id === agent.id);

            return {
                agent_id: agent.id,
                agent_name: agent.name,
                role: agent.role,
                honor_score: agent.honor_score,
                tasks_assigned: agentTasks.length,
                tasks_completed: completedTasks.length,
                completion_rate: agentTasks.length > 0 
                    ? (completedTasks.length / agentTasks.length) * 100 
                    : 0,
                total_hours: agentTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0),
                validated_skills: agentValidations.length,
                avg_skill_level: agentValidations.length > 0
                    ? agentValidations.reduce((sum, v) => sum + (v.ai_assessment?.validated_level || 0), 0) / agentValidations.length
                    : 0
            };
        }).sort((a, b) => b.tasks_completed - a.tasks_completed);

        // Project timeline data
        const projectTimeline = projects.map(p => ({
            project_id: p.id,
            title: p.title,
            status: p.status,
            progress: p.progress_percentage || 0,
            budget: p.budget_rlusd || 0,
            spent: p.spent_rlusd || 0,
            created_date: p.created_date,
            start_date: p.start_date,
            target_completion: p.target_completion_date,
            actual_completion: p.actual_completion_date
        }));

        // Budget analysis
        const budgetAnalysis = {
            total_allocated: projectMetrics.total_budget,
            total_spent: projectMetrics.total_spent,
            remaining: projectMetrics.total_budget - projectMetrics.total_spent,
            utilization_rate: projectMetrics.total_budget > 0 
                ? (projectMetrics.total_spent / projectMetrics.total_budget) * 100 
                : 0,
            projects_over_budget: projects.filter(p => 
                p.budget_rlusd && p.spent_rlusd && p.spent_rlusd > p.budget_rlusd
            ).length,
            avg_budget_per_project: projects.length > 0 
                ? projectMetrics.total_budget / projects.length 
                : 0
        };

        // Skill utilization
        const skillUtilization = calculateSkillUtilization(projects, tasks, agents);

        // Time-series data for charts (last 30 days)
        const timeSeriesData = generateTimeSeriesData(projects, tasks);

        return Response.json({
            success: true,
            analytics: {
                project_metrics: projectMetrics,
                task_metrics: taskMetrics,
                agent_performance: agentPerformance.slice(0, 10), // Top 10 performers
                project_timeline: projectTimeline,
                budget_analysis: budgetAnalysis,
                skill_utilization: skillUtilization,
                time_series: timeSeriesData
            },
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Analytics error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function calculateAvgCompletionTime(tasks) {
    const completedTasks = tasks.filter(t => 
        t.status === 'completed' && t.created_date && t.completed_date
    );
    
    if (completedTasks.length === 0) return 0;
    
    const totalTime = completedTasks.reduce((sum, t) => {
        const start = new Date(t.created_date);
        const end = new Date(t.completed_date);
        return sum + (end - start);
    }, 0);
    
    return totalTime / completedTasks.length / (1000 * 60 * 60 * 24); // Convert to days
}

function calculateSkillUtilization(projects, tasks, agents) {
    const skillMap = {};
    
    projects.forEach(project => {
        if (project.required_skills) {
            project.required_skills.forEach(skill => {
                if (!skillMap[skill]) {
                    skillMap[skill] = { demanded: 0, supplied: 0 };
                }
                skillMap[skill].demanded++;
            });
        }
    });
    
    agents.forEach(agent => {
        if (agent.core_skills) {
            agent.core_skills.forEach(skill => {
                const skillName = skill.name;
                if (!skillMap[skillName]) {
                    skillMap[skillName] = { demanded: 0, supplied: 0 };
                }
                if (skill.validated) {
                    skillMap[skillName].supplied++;
                }
            });
        }
    });
    
    return Object.entries(skillMap).map(([skill, data]) => ({
        skill,
        demand: data.demanded,
        supply: data.supplied,
        gap: data.demanded - data.supplied
    })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}

function generateTimeSeriesData(projects, tasks) {
    const days = 30;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const projectsCreated = projects.filter(p => 
            p.created_date && p.created_date.startsWith(dateStr)
        ).length;
        
        const tasksCompleted = tasks.filter(t => 
            t.completed_date && t.completed_date.startsWith(dateStr)
        ).length;
        
        data.push({
            date: dateStr,
            projects_created: projectsCreated,
            tasks_completed: tasksCompleted
        });
    }
    
    return data;
}