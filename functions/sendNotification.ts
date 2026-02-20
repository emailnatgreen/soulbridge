import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const {
            recipient_agent_id,
            notification_type,
            title,
            message,
            action_url,
            sender_agent_id,
            related_entity_type,
            related_entity_id,
            priority = 'normal',
            metadata = {}
        } = await req.json();

        if (!recipient_agent_id || !notification_type || !message) {
            return Response.json({ 
                error: 'recipient_agent_id, notification_type, and message required' 
            }, { status: 400 });
        }

        // Create notification
        const notification = await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id,
            notification_type,
            title,
            message,
            action_url,
            sender_agent_id,
            related_entity_type,
            related_entity_id,
            priority,
            metadata,
            is_read: false
        });

        return Response.json({
            success: true,
            notification
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});