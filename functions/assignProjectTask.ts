import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { task_id, agent_id } = await req.json();

        if (!task_id || !agent_id) {
            return Response.json({ error: 'task_id and agent_id required' }, { status: 400 });
        }

        // Get task
        const tasks = await base44.entities.ProjectTask.filter({ id: task_id });
        if (!tasks.length) {
            return Response.json({ error: 'Task not found' }, { status: 404 });
        }

        const task = tasks[0];

        // Update task
        const updatedTask = await base44.entities.ProjectTask.update(task_id, {
            assigned_agent_id: agent_id,
            status: 'todo'
        });

        // Get project
        const projects = await base44.entities.AIProject.filter({ id: task.project_id });
        const project = projects[0];

        // Send notification to assigned agent
        await base44.asServiceRole.functions.invoke('sendNotification', {
            recipient_agent_id: agent_id,
            notification_type: 'task_assigned',
            title: `New task assigned: ${task.title}`,
            message: `You've been assigned to "${task.title}" in project "${project.title}"`,
            action_url: `/AIProjectHub?projectId=${task.project_id}`,
            related_entity_type: 'ProjectTask',
            related_entity_id: task_id,
            priority: task.priority === 'critical' ? 'urgent' : 'normal'
        });

        return Response.json({ success: true, task: updatedTask });

    } catch (error) {
        console.error('Assign task error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});