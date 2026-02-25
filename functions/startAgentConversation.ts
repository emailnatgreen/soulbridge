import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { participant_agent_ids, conversation_type, project_id, role_filter } = await req.json();

        if (!participant_agent_ids || participant_agent_ids.length < 2) {
            return Response.json({ 
                error: 'At least 2 participants required' 
            }, { status: 400 });
        }

        // Get agent details
        const agents = await base44.asServiceRole.entities.Agent.list();
        const participants = agents.filter(a => participant_agent_ids.includes(a.id));

        // Generate conversation title
        let title;
        if (conversation_type === 'project' && project_id) {
            const project = await base44.entities.AIProject.get(project_id);
            title = `${project.title} - Team Chat`;
        } else if (conversation_type === 'role_based' && role_filter) {
            title = `${role_filter.charAt(0).toUpperCase() + role_filter.slice(1)}s Discussion`;
        } else if (conversation_type === 'group') {
            title = participants.map(p => p.name).join(', ');
        } else {
            title = participants.map(p => p.name).join(' & ');
        }

        // Create conversation
        const conversation = await base44.entities.AgentConversation.create({
            title,
            conversation_type,
            participant_agent_ids,
            project_id: project_id || null,
            role_filter: role_filter || null,
            last_message_at: new Date().toISOString(),
            last_message_preview: 'Conversation started',
            message_count: 0,
            is_active: true,
            metadata: {
                created_by: user.email,
                participant_names: participants.map(p => p.name)
            }
        });

        // Notify all participants
        for (const agentId of participant_agent_ids) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: agentId,
                notification_type: 'message',
                title: 'New Conversation',
                message: `You've been added to: ${title}`,
                action_url: `/agent-messaging?conversation=${conversation.id}`,
                related_entity_type: 'AgentConversation',
                related_entity_id: conversation.id,
                priority: 'normal'
            });
        }

        return Response.json({
            success: true,
            conversation
        });

    } catch (error) {
        console.error('Error starting conversation:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});