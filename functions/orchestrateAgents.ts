import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { project_id, task_definitions, orchestration_mode = 'auto' } = await req.json();

        if (!project_id) {
            return Response.json({ error: 'project_id is required' }, { status: 400 });
        }

        // Fetch project and available agents
        const project = await base44.entities.AIProject.get(project_id);
        const agents = await base44.entities.Agent.filter({ status: 'active' });

        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }

        // AI-powered agent-task matching
        const matchingPrompt = `You are an expert AI orchestrator. Given this project and available agents, assign tasks optimally.

PROJECT: ${project.title}
Description: ${project.description}
Required Skills: ${project.required_skills?.join(', ') || 'General'}

AVAILABLE AGENTS:
${agents.map(a => `- ${a.name} (${a.role}): ${a.purpose} | Skills: ${a.specializations?.join(', ') || 'General'}`).join('\n')}

TASKS TO ASSIGN:
${task_definitions ? JSON.stringify(task_definitions, null, 2) : 'Generate appropriate project tasks'}

${task_definitions ? 'Assign each task to the most suitable agent based on skills, role, and capacity.' : 'Generate 3-5 project tasks and assign them to suitable agents.'}

Return a JSON object:
{
  "assignments": [
    {
      "task_title": "string",
      "task_description": "string",
      "assigned_agent_id": "string",
      "assigned_agent_name": "string",
      "priority": "low|medium|high|critical",
      "estimated_hours": number,
      "dependencies": ["task_title1", "task_title2"],
      "rationale": "why this agent is optimal for this task"
    }
  ],
  "orchestration_strategy": "brief explanation of the overall coordination plan",
  "potential_bottlenecks": ["bottleneck1", "bottleneck2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

        const orchestrationPlan = await base44.integrations.Core.InvokeLLM({
            prompt: matchingPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    assignments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                task_title: { type: "string" },
                                task_description: { type: "string" },
                                assigned_agent_id: { type: "string" },
                                assigned_agent_name: { type: "string" },
                                priority: { type: "string" },
                                estimated_hours: { type: "number" },
                                dependencies: { type: "array", items: { type: "string" } },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    orchestration_strategy: { type: "string" },
                    potential_bottlenecks: { type: "array", items: { type: "string" } },
                    recommendations: { type: "array", items: { type: "string" } }
                }
            }
        });

        // Create tasks in the database
        const createdTasks = [];
        const taskMap = new Map(); // For dependency resolution

        for (const assignment of orchestrationPlan.assignments) {
            const taskData = {
                project_id: project_id,
                title: assignment.task_title,
                description: assignment.task_description,
                assigned_agent_id: assignment.assigned_agent_id,
                priority: assignment.priority || 'medium',
                estimated_hours: assignment.estimated_hours || 4,
                status: 'todo',
                dependencies: [] // Will populate after all tasks are created
            };

            const createdTask = await base44.asServiceRole.entities.ProjectTask.create(taskData);
            createdTasks.push({
                ...createdTask,
                rationale: assignment.rationale
            });
            taskMap.set(assignment.task_title, createdTask.id);
        }

        // Update dependencies with actual task IDs
        for (let i = 0; i < orchestrationPlan.assignments.length; i++) {
            const assignment = orchestrationPlan.assignments[i];
            if (assignment.dependencies?.length > 0) {
                const dependencyIds = assignment.dependencies
                    .map(depTitle => taskMap.get(depTitle))
                    .filter(id => id);
                
                if (dependencyIds.length > 0) {
                    await base44.asServiceRole.entities.ProjectTask.update(createdTasks[i].id, {
                        dependencies: dependencyIds
                    });
                    createdTasks[i].dependencies = dependencyIds;
                }
            }
        }

        // Send notifications to assigned agents
        for (const task of createdTasks) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: task.assigned_agent_id,
                notification_type: 'task_assigned',
                title: `New Task: ${task.title}`,
                message: `You have been assigned to work on "${task.title}" in project "${project.title}"`,
                action_url: `/AIProjectHub?project_id=${project_id}`,
                related_entity_type: 'ProjectTask',
                related_entity_id: task.id,
                priority: task.priority === 'critical' ? 'urgent' : 'normal'
            });
        }

        // Log orchestration event
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'village_detail',
            content: `Orchestrated ${createdTasks.length} tasks for project "${project.title}". Strategy: ${orchestrationPlan.orchestration_strategy}`,
            keywords: ['orchestration', 'coordination', 'project_management', project.title.toLowerCase()],
            context: 'AI Agent Orchestration System',
            importance: 7,
            related_entity_id: project_id,
            related_entity_type: 'AIProject'
        });

        return Response.json({
            success: true,
            project_id: project_id,
            tasks_created: createdTasks.length,
            assignments: createdTasks,
            orchestration_plan: {
                strategy: orchestrationPlan.orchestration_strategy,
                potential_bottlenecks: orchestrationPlan.potential_bottlenecks,
                recommendations: orchestrationPlan.recommendations
            }
        });

    } catch (error) {
        console.error('Error in orchestrateAgents:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});