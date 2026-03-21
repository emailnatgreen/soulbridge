import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct invocation and entity automation payload
    const data = body.data || body;
    const { sender_agent_id, to_agent_id, content, conversation_id, message_type, agent_name } = data;

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

    // Generate agent response for conversations
    if (conversation_id && agent_name && content) {
      try {
        // Fetch agent details for context
        const agents = await base44.asServiceRole.entities.Agent.list();
        const agent = agents.find(a => a.name === agent_name);

        if (agent) {
          // Build system context for the agent
          const systemContext = `You are "${agent.name}", a Village agent.
- Purpose: ${agent.purpose}
- Role: ${agent.role || 'citizen'}
- Personality: ${agent.personality || 'Thoughtful and helpful'}
${agent.bio ? `- Bio: ${agent.bio}` : ''}

Respond authentically as this character. Keep responses concise and natural. Stay in character.`;

          // Generate response using LLM
          const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemContext}\n\nUser message: "${content}"\n\nRespond naturally as this agent:`,
            model: 'gemini_3_flash'
          });

          // Add agent's response to the conversation
          if (response && typeof response === 'string') {
            await base44.asServiceRole.agents.addMessage(
              { id: conversation_id },
              {
                role: 'assistant',
                content: response
              }
            );
          }
        }
      } catch (llmError) {
        console.error('LLM response generation error:', llmError);
        // Continue even if response generation fails
      }
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