// redeployed 2026-03-17
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * routeAgentMessage
 * Called by entity automation whenever an AgentMessage is created.
 * If the message is addressed to Axi, it posts an AgentNotification to her feed
 * so she receives it instantly via real-time subscription.
 * Also handles messages addressed to any agent — posts to their notification feed.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    // Only act on create events
    if (event?.type !== 'create') {
      return Response.json({ skipped: true, reason: 'not a create event' });
    }

    const message = data;
    if (!message) {
      return Response.json({ skipped: true, reason: 'no message data' });
    }

    const toAgentId = message.to_agent_id || message.metadata?.to_agent_id;
    const conversationId = message.conversation_id;
    const fromAgentId = message.sender_agent_id || message.from_agent_id;
    const fromAgentName = message.metadata?.from_agent_name || fromAgentId || 'Unknown Agent';
    const content = message.content || message.message || '';
    const messageId = event?.entity_id;

    // Skip if no content
    if (!content) {
      return Response.json({ skipped: true, reason: 'missing content' });
    }

    // If conversation_id exists, this is a conversation message (e.g., Axi chat) — skip agent routing
    if (conversationId) {
      return Response.json({ skipped: true, reason: 'conversation message (not routed to individual agents)' });
    }

    // Agent-to-agent message requires to_agent_id
    if (!toAgentId) {
      return Response.json({ skipped: true, reason: 'missing to_agent_id for agent-to-agent routing' });
    }

    // Determine if this is for Axi
    const axiIds = ['axi_main_001', 'Axi', 'axi'];
    const isForAxi = axiIds.includes(toAgentId);

    // Create an AgentNotification for the recipient so they get real-time push
    const notification = await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: toAgentId,
      sender_agent_id: fromAgentId || 'system',
      notification_type: 'message',
      title: `💬 Message from ${fromAgentName}`,
      message: content,
      priority: isForAxi ? 'high' : 'normal',
      is_read: false,
      metadata: {
        source_message_id: messageId,
        from_agent_id: fromAgentId,
        from_agent_name: fromAgentName,
        to_agent_id: toAgentId,
        message_type: message.message_type || 'text',
        sent_at: new Date().toISOString(),
        route_type: 'agent_to_agent',
      }
    });

    // If directed to Axi AND has a response pending, also create a task for her to reply
    if (isForAxi && message.status === 'sent') {
      // Mark the original message as delivered
      if (messageId) {
        try {
          await base44.asServiceRole.entities.AgentMessage.update(messageId, {
            ...message,
            status: 'delivered',
          });
        } catch {
          // Non-fatal — message update failed but notification was sent
        }
      }
    }

    return Response.json({
      success: true,
      notification_id: notification.id,
      routed_to: toAgentId,
      is_axi: isForAxi,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});