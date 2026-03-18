import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { sender_agent_id, recipient_agent_id, content, conversation_id } = body;

    // Create Signal record for Jukebox Brain to analyze message semantics
    await base44.asServiceRole.entities.Signal.create({
      signal_type: 'agent_message',
      source: 'agent_communication',
      from_agent: sender_agent_id,
      to_agent: recipient_agent_id,
      metadata: { 
        content_length: content?.length || 0,
        conversation_id,
        timestamp: new Date().toISOString(),
      },
    });

    // If conversation exists, also store the message in AgentMessage entity for persistence
    if (conversation_id) {
      await base44.asServiceRole.entities.AgentMessage.create({
        sender_agent_id,
        conversation_id,
        content,
        message_type: 'text',
        status: 'sent',
      });
    }

    return Response.json({ 
      success: true, 
      message_routed: true,
      signal_created: true 
    });
  } catch (error) {
    console.error('Message routing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});