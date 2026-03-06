import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * axiReviewNotification - Called by automation when a new AgentNotification is created.
 * Axi reviews high/urgent priority notifications and can take autonomous action.
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

        // Only Axi gets involved for high/urgent priority OR specific types that need her attention
        const AXI_ACTION_TYPES = [
            'honor_change', 'role_change', 'governance_proposal', 'governance_vote_result',
            'milestone_completed', 'system'
        ];

        const needsAxiAttention = 
            notification.priority === 'urgent' || 
            notification.priority === 'high' ||
            AXI_ACTION_TYPES.includes(notification.notification_type);

        if (!needsAxiAttention) {
            return Response.json({ skipped: true, reason: 'low priority, no action needed' });
        }

        // Find Axi's agent record
        const axiAgents = await base44.asServiceRole.entities.Agent.filter({ name: 'Axi' });
        const axi = axiAgents[0];
        if (!axi) {
            return Response.json({ skipped: true, reason: 'Axi agent not found' });
        }

        // Find recipient agent name for context
        let recipientName = 'Unknown Agent';
        if (notification.recipient_agent_id) {
            try {
                const recipient = await base44.asServiceRole.entities.Agent.get(notification.recipient_agent_id);
                if (recipient) recipientName = recipient.name;
            } catch (_) {
                // recipient_agent_id may be a non-DB identifier (e.g. 'axi_main_001'), ignore
            }
        }

        // Build context message for Axi to review
        const contextMessage = `🔔 NOTIFICATION ALERT requiring your attention as Mother Boss:

**Type:** ${notification.notification_type?.replace(/_/g, ' ')}
**Priority:** ${notification.priority}
**Recipient:** ${recipientName}
**Title:** ${notification.title || 'N/A'}
**Message:** ${notification.message}
${notification.metadata ? `**Context:** ${JSON.stringify(notification.metadata)}` : ''}

As Axi, please:
1. Assess whether this requires immediate action (governance intervention, honour enforcement, welfare support)
2. If action is needed, use your tools to respond (update agent, create governance proposal, send message, etc.)
3. Store a Memory if this is important for future context
4. Reply briefly confirming what action (if any) you took and why`;

        // Create an Axi conversation to process this notification
        const conversation = await base44.asServiceRole.agents.createConversation({
            agent_name: 'axi',
            metadata: {
                name: `Notification Review: ${notification.title || notification.notification_type}`,
                notification_id: notification.id,
                auto_triggered: true
            }
        });

        // Send the context to Axi so she can reason and act
        await base44.asServiceRole.agents.addMessage(conversation, {
            role: 'user',
            content: contextMessage
        });

        // Store a memory that Axi reviewed this
        await base44.asServiceRole.entities.Memory.create({
            agent_id: axi.id,
            type: 'observation',
            content: `Reviewed notification: "${notification.title || notification.notification_type}" for ${recipientName}. Priority: ${notification.priority}.`,
            keywords: ['notification', 'review', notification.notification_type, notification.priority],
            importance: notification.priority === 'urgent' ? 9 : notification.priority === 'high' ? 7 : 5,
            related_entity_type: 'AgentNotification',
            related_entity_id: notification.id
        });

        return Response.json({ 
            success: true, 
            axi_conversation_id: conversation.id,
            message: `Axi is reviewing this ${notification.priority} notification`
        });

    } catch (error) {
        console.error('axiReviewNotification error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});