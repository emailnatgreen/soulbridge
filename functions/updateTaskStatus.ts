import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { task_id, action, message, progress, rejection_reason } = await req.json();

        if (!task_id || !action) {
            return Response.json({ error: 'task_id and action required' }, { status: 400 });
        }

        const task = await base44.entities.AgentTask.get(task_id);
        const timestamp = new Date().toISOString();
        
        let updateData = {};
        let notificationMessage = '';
        let notifyAgent = null;

        switch (action) {
            case 'accept':
                updateData = {
                    status: 'accepted',
                    accepted_at: timestamp
                };
                notificationMessage = `${(await base44.entities.Agent.get(task.assignee_agent_id)).name} accepted the task: ${task.title}`;
                notifyAgent = task.delegator_agent_id;
                break;

            case 'reject':
                updateData = {
                    status: 'rejected',
                    rejection_reason: rejection_reason || 'No reason provided'
                };
                notificationMessage = `Task "${task.title}" was rejected: ${rejection_reason || 'No reason provided'}`;
                notifyAgent = task.delegator_agent_id;
                break;

            case 'start':
                updateData = {
                    status: 'in_progress',
                    started_at: timestamp,
                    progress_percentage: progress || 10
                };
                notificationMessage = `Work started on: ${task.title}`;
                notifyAgent = task.delegator_agent_id;
                break;

            case 'update_progress':
                const newProgress = Math.min(100, Math.max(0, progress || task.progress_percentage));
                const updates = task.progress_updates || [];
                updates.push({
                    timestamp,
                    message: message || `Progress updated to ${newProgress}%`,
                    progress: newProgress
                });
                
                updateData = {
                    progress_percentage: newProgress,
                    progress_updates: updates
                };
                
                if (newProgress >= 100) {
                    updateData.status = 'completed';
                    updateData.completed_at = timestamp;
                    notificationMessage = `Task completed: ${task.title}`;
                } else {
                    notificationMessage = `Progress update on "${task.title}": ${newProgress}%`;
                }
                notifyAgent = task.delegator_agent_id;
                break;

            case 'complete':
                updateData = {
                    status: 'completed',
                    completed_at: timestamp,
                    progress_percentage: 100
                };
                
                // Award rewards
                if (task.reward) {
                    const assigneeState = await base44.entities.AgentState.filter({ agent_id: task.assignee_agent_id });
                    if (assigneeState.length > 0) {
                        const state = assigneeState[0];
                        await base44.asServiceRole.entities.AgentState.update(state.id, {
                            experience: (state.experience || 0) + (task.reward.experience_points || 0)
                        });
                    }
                    
                    if (task.reward.honor_points) {
                        const assignee = await base44.entities.Agent.get(task.assignee_agent_id);
                        await base44.asServiceRole.entities.Agent.update(task.assignee_agent_id, {
                            honor_score: (assignee.honor_score || 0) + task.reward.honor_points
                        });
                    }
                }
                
                notificationMessage = `Task completed: ${task.title}`;
                notifyAgent = task.delegator_agent_id;
                break;

            case 'cancel':
                updateData = {
                    status: 'cancelled'
                };
                notificationMessage = `Task cancelled: ${task.title}`;
                notifyAgent = task.assignee_agent_id;
                break;

            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

        const updatedTask = await base44.asServiceRole.entities.AgentTask.update(task_id, updateData);

        // Send notification
        if (notifyAgent) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: notifyAgent,
                notification_type: 'system',
                title: 'Task Update',
                message: notificationMessage,
                priority: 'normal'
            });
        }

        return Response.json({ 
            task: updatedTask,
            message: 'Task updated successfully'
        });
    } catch (error) {
        console.error('Error updating task:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});