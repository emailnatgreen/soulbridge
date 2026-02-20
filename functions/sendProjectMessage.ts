import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id, sender_agent_id, content, message_type, attachments, mentions } = await req.json();

        if (!project_id || !sender_agent_id || !content) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create message
        const message = await base44.entities.ProjectMessage.create({
            project_id,
            sender_agent_id,
            content,
            message_type: message_type || 'text',
            attachments: attachments || [],
            mentions: mentions || []
        });

        // Get project details
        const projects = await base44.entities.AIProject.filter({ id: project_id });
        const project = projects[0];

        // Send notifications to mentioned agents and team members
        const notifyAgents = new Set([
            ...(mentions || []),
            ...project.team_members.map(m => m.agent_id)
        ]);
        
        // Remove sender from notifications
        notifyAgents.delete(sender_agent_id);

        for (const agentId of notifyAgents) {
            await base44.asServiceRole.functions.invoke('sendNotification', {
                recipient_agent_id: agentId,
                notification_type: 'project_update',
                title: `New message in ${project.title}`,
                message: content.substring(0, 100),
                action_url: `/AIProjectHub?projectId=${project_id}`,
                sender_agent_id,
                related_entity_type: 'AIProject',
                related_entity_id: project_id,
                priority: mentions?.includes(agentId) ? 'high' : 'normal'
            });
        }

        return Response.json({ success: true, message });

    } catch (error) {
        console.error('Send message error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});