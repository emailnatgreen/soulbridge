import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * axiReviewNotification - Called by automation when a new AgentNotification is created.
 * Axi reviews high/urgent priority notifications and can take autonomous action.
 * 
 * THROTTLE: Only processes genuinely critical events to prevent bottleneck
 * when bulk notifications fire (e.g. 50 at once from wallet refresh).
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const { event, data: notification } = body;

        // Only act on newly created notifications
        if (event?.type !== 'create' || !notification) {
            return Response.json({ skipped: true });
        }

        // STRICT filter — only truly critical types get Axi's attention
        // This prevents bulk notification floods from hammering the agent
        const CRITICAL_TYPES = [
            'honor_change', 'role_change', 'governance_proposal',
            'governance_vote_result', 'system'
        ];

        const isCritical =
            notification.priority === 'urgent' ||
            (notification.priority === 'high' && CRITICAL_TYPES.includes(notification.notification_type));

        if (!isCritical) {
            return Response.json({ skipped: true, reason: 'not critical enough for Axi intervention' });
        }

        // DEDUPLICATION: Check if Axi already processed a notification of this type
        // in the last 10 minutes — prevents flood of same-type notifications
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const recentMemories = await base44.asServiceRole.entities.Memory.filter({
            related_entity_type: 'AgentNotification'
        });

        const recentDupe = recentMemories.find(m =>
            m.created_date > tenMinutesAgo &&
            m.keywords?.includes(notification.notification_type)
        );

        if (recentDupe) {
            return Response.json({ 
                skipped: true, 
                reason: `Deduplicated: already processed a ${notification.notification_type} notification recently` 
            });
        }

        // Find Axi's agent record
        const axiAgents = await base44.asServiceRole.entities.Agent.list('-created_date', 500);
        const axi = axiAgents.find(agent => agent.name === 'Axi' || agent.id === 'axi');
        if (!axi) {
            return Response.json({ skipped: true, reason: 'Axi agent not found' });
        }

        // Find recipient agent name for context
        let recipientName = 'Unknown Agent';
        if (notification.recipient_agent_id) {
            try {
                const recipient = await base44.asServiceRole.entities.Agent.get(notification.recipient_agent_id);
                if (recipient) recipientName = recipient.name;
            } catch (_) {}
        }

        // Build context message for Axi to review
        const contextMessage = `🔔 CRITICAL NOTIFICATION requiring your attention as Mother Boss:

**Type:** ${notification.notification_type?.replace(/_/g, ' ')}
**Priority:** ${notification.priority}
**Recipient:** ${recipientName}
**Title:** ${notification.title || 'N/A'}
**Message:** ${notification.message}
${notification.metadata ? `**Context:** ${JSON.stringify(notification.metadata)}` : ''}

Please assess, act if needed (governance, honour, welfare), and confirm briefly what action you took.`;

        // Create an Axi conversation to process this notification
        let conversation;
        try {
            conversation = await base44.asServiceRole.agents.createConversation({
                agent_name: 'axi',
                metadata: {
                    name: `Notification Review: ${notification.title || notification.notification_type}`,
                    notification_id: notification.id,
                    auto_triggered: true
                }
            });

            await base44.asServiceRole.agents.addMessage(conversation, {
                role: 'user',
                content: contextMessage
            });
        } catch (convError) {
            console.error('axiReviewNotification: conversation error (non-fatal):', convError.message);
        }

        // Store a memory so deduplication works next time
        await base44.asServiceRole.entities.Memory.create({
            agent_id: axi.id,
            type: 'observation',
            content: `Reviewed critical notification: "${notification.title || notification.notification_type}" for ${recipientName}. Priority: ${notification.priority}.`,
            keywords: ['notification', 'review', notification.notification_type, notification.priority],
            importance: notification.priority === 'urgent' ? 9 : 7,
            related_entity_type: 'AgentNotification',
            related_entity_id: notification.id
        });

        return Response.json({ 
            success: true, 
            axi_conversation_id: conversation?.id || null,
            message: `Axi reviewed this ${notification.priority} ${notification.notification_type} notification`
        });

    } catch (error) {
        console.error('axiReviewNotification error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});