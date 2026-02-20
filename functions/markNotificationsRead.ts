import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { notification_ids, agent_id, mark_all = false } = await req.json();

        if (mark_all) {
            // Mark all notifications for an agent as read
            if (!agent_id) {
                return Response.json({ error: 'agent_id required for mark_all' }, { status: 400 });
            }

            const notifications = await base44.entities.AgentNotification.filter({
                recipient_agent_id: agent_id,
                is_read: false
            });

            for (const notif of notifications) {
                await base44.asServiceRole.entities.AgentNotification.update(notif.id, {
                    is_read: true,
                    read_at: new Date().toISOString()
                });
            }

            return Response.json({
                success: true,
                marked_count: notifications.length
            });
        }

        if (!notification_ids || !Array.isArray(notification_ids)) {
            return Response.json({ error: 'notification_ids array required' }, { status: 400 });
        }

        // Mark specific notifications as read
        for (const id of notification_ids) {
            await base44.asServiceRole.entities.AgentNotification.update(id, {
                is_read: true,
                read_at: new Date().toISOString()
            });
        }

        return Response.json({
            success: true,
            marked_count: notification_ids.length
        });

    } catch (error) {
        console.error('Error marking notifications read:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});