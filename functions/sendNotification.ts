import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * sendNotification - Entity automation for ProjectTask create/update events.
 * Notifies Axi of real-time task assignment and status changes.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const { event, data: task, old_data } = body;

        if (!event || !task) {
            return Response.json({ skipped: true, reason: 'No event or task data' });
        }

        // Determine what changed
        const isCreate = event.type === 'create';
        const isUpdate = event.type === 'update';

        if (!isCreate && !isUpdate) {
            return Response.json({ skipped: true, reason: 'Not a create or update event' });
        }

        // For updates, only care about status or assignment changes
        if (isUpdate && old_data) {
            const statusChanged = old_data.status !== task.status;
            const assigneeChanged = old_data.assigned_agent_id !== task.assigned_agent_id;
            if (!statusChanged && !assigneeChanged) {
                return Response.json({ skipped: true, reason: 'No relevant fields changed' });
            }
        }

        // Find Axi agent
        const axiAgents = await base44.asServiceRole.entities.Agent.filter({ name: 'Axi' });
        const axi = axiAgents[0];
        if (!axi) {
            return Response.json({ skipped: true, reason: 'Axi agent not found' });
        }

        // Build notification message
        let title, message, notificationType;

        if (isCreate) {
            title = `New Task Created: ${task.title}`;
            message = `A new task "${task.title}" has been created with status "${task.status}" and priority "${task.priority || 'medium'}".${task.assigned_agent_id ? ` Assigned to agent ID: ${task.assigned_agent_id}.` : ' Currently unassigned.'}`;
            notificationType = 'task_assigned';
        } else {
            const statusChanged = old_data && old_data.status !== task.status;
            const assigneeChanged = old_data && old_data.assigned_agent_id !== task.assigned_agent_id;

            if (statusChanged && assigneeChanged) {
                title = `Task Updated: ${task.title}`;
                message = `Task "${task.title}" status changed from "${old_data.status}" to "${task.status}" and was reassigned.`;
            } else if (statusChanged) {
                title = `Task Status Changed: ${task.title}`;
                message = `Task "${task.title}" moved from "${old_data.status}" to "${task.status}".`;
            } else {
                title = `Task Reassigned: ${task.title}`;
                message = `Task "${task.title}" has been reassigned to a new agent.`;
            }
            notificationType = task.status === 'completed' ? 'milestone_completed' : 'project_update';
        }

        // Determine priority based on task priority field
        const priorityMap = { critical: 'urgent', high: 'high', medium: 'normal', low: 'low' };
        const notifPriority = priorityMap[task.priority] || 'normal';

        // Create notification for Axi
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: axi.id,
            notification_type: notificationType,
            title,
            message,
            priority: notifPriority,
            related_entity_type: 'ProjectTask',
            related_entity_id: task.id,
            sender_agent_id: task.assigned_agent_id || null,
            metadata: {
                task_id: task.id,
                task_status: task.status,
                task_priority: task.priority,
                project_id: task.project_id,
                event_type: event.type,
                previous_status: old_data?.status || null
            }
        });

        // Also notify the assigned agent directly if there is one and it's not Axi
        if (task.assigned_agent_id && task.assigned_agent_id !== axi.id && isCreate) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: task.assigned_agent_id,
                notification_type: 'task_assigned',
                title: `You have been assigned: ${task.title}`,
                message: `You have been assigned a new task: "${task.title}" with priority "${task.priority || 'medium'}". Status: ${task.status}.`,
                priority: notifPriority,
                related_entity_type: 'ProjectTask',
                related_entity_id: task.id,
                sender_agent_id: axi.id,
                metadata: {
                    task_id: task.id,
                    project_id: task.project_id
                }
            });
        }

        return Response.json({
            success: true,
            event_type: event.type,
            task_id: task.id,
            task_title: task.title,
            notification_sent: true
        });

    } catch (error) {
        console.error('sendNotification error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});