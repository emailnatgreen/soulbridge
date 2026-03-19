import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct invocation and entity automation payload
    const data = body.data || body;
    const { sender_agent_id, to_agent_id, content, conversation_id, message_type } = data;

    const recipientId = to_agent_id || data.recipient_agent_id;

    // Route to recipient's notification feed
    if (recipientId && content) {
      await base44.asServiceRole.entities.AgentNotification.create({
        agent_id: recipientId,
        type: 'message',
        title: 'New Message',
        message: content?.substring(0, 200) || 'You have a new message',
        from_agent_id: sender_agent_id,
        conversation_id: conversation_id || null,
        read: false,
        metadata: {
          message_type: message_type || 'text',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return Response.json({ 
      success: true, 
      message_routed: true,
      recipient: recipientId || 'none',
    });
  } catch (error) {
    console.error('Message routing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});