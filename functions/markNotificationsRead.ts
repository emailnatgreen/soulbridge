import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { notification_ids, agent_id } = await req.json();

        if (!notification_ids || !Array.isArray(notification_ids)) {
            return Response.json({ error: 'notification_ids array required' }, { status: 400 });
        }

        const updated = [];
        for (const notifId of notification_ids) {
            const notif = await base44.asServiceRole.entities.AgentNotification.update(notifId, {
                is_read: true,
                read_at: new Date().toISOString()
            });
            updated.push(notif);
        }

        return Response.json({ updated_count: updated.length });
    } catch (error) {
        console.error('Error marking notifications read:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});