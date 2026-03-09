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
        const task = await base44.entities.ProjectTask.get(task_id);
        if (!task) {
            return Response.json({ error: 'Task not found' }, { status: 404 });
        }

        // Enrich: fetch agent's validated credentials for merit context
        const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
        let meritNote = '';
        if (agent?.classic_address) {
          const creds = await base44.asServiceRole.entities.DidCredential.filter({
            subject_did: agent.classic_address,
            credential_type: 'skill_certification',
            status: 'active'
          });
          if (creds.length > 0) {
            const skillNames = creds.map(c => c.credential_data?.skill_name).filter(Boolean).join(', ');
            meritNote = ` (Verified skills: ${skillNames})`;
          }
        }

        // Update task
        const updatedTask = await base44.entities.ProjectTask.update(task_id, {
            assigned_agent_id: agent_id,
            status: 'todo',
            assignment_merit_note: meritNote || undefined
        });

        // Get project
        const project = await base44.entities.AIProject.get(task.project_id);

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