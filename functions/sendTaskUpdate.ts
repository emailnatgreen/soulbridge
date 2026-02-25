import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { task_id, sender_agent_id, update_message, update_type = 'progress' } = await req.json();

        if (!task_id || !sender_agent_id || !update_message) {
            return Response.json({ 
                error: 'task_id, sender_agent_id, and update_message are required' 
            }, { status: 400 });
        }

        // Get task and project details
        const task = await base44.entities.ProjectTask.get(task_id);
        const project = await base44.entities.AIProject.get(task.project_id);
        const sender = await base44.asServiceRole.entities.Agent.get(sender_agent_id);

        // Find or create project conversation
        const conversations = await base44.entities.AgentConversation.list();
        let projectConvo = conversations.find(c => 
            c.conversation_type === 'project' && 
            c.project_id === task.project_id
        );

        if (!projectConvo) {
            // Create project conversation with all team members
            const participantIds = project.team_members?.map(tm => tm.agent_id) || [];
            projectConvo = await base44.entities.AgentConversation.create({
                title: `${project.title} - Team Chat`,
                conversation_type: 'project',
                participant_agent_ids: participantIds,
                project_id: project.id,
                last_message_at: new Date().toISOString(),
                last_message_preview: 'Project conversation started',
                message_count: 0,
                is_active: true
            });
        }

        // Create task update message
        const message = await base44.entities.AgentMessage.create({
            conversation_id: projectConvo.id,
            sender_agent_id,
            content: update_message,
            message_type: 'task_update',
            related_task_id: task_id,
            related_project_id: task.project_id,
            status: 'sent',
            read_by: [sender_agent_id],
            context: {
                conversation_id: projectConvo.id,
                sender_name: sender.name,
                task_title: task.title,
                update_type
            }
        });

        // Update conversation
        await base44.entities.AgentConversation.update(projectConvo.id, {
            last_message_at: new Date().toISOString(),
            last_message_preview: `${sender.name}: ${update_message.substring(0, 80)}`,
            message_count: (projectConvo.message_count || 0) + 1
        });

        // Notify project team
        const otherMembers = projectConvo.participant_agent_ids.filter(id => id !== sender_agent_id);
        for (const agentId of otherMembers) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: agentId,
                notification_type: 'task_assigned',
                title: `Task Update: ${task.title}`,
                message: `${sender.name}: ${update_message}`,
                action_url: `/ai-project-manager?project=${task.project_id}&task=${task_id}`,
                sender_agent_id,
                related_entity_type: 'ProjectTask',
                related_entity_id: task_id,
                priority: update_type === 'completed' ? 'high' : 'normal',
                metadata: {
                    task_id,
                    project_id: task.project_id,
                    update_type
                }
            });
        }

        return Response.json({
            success: true,
            message,
            conversation: projectConvo
        });

    } catch (error) {
        console.error('Error sending task update:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});