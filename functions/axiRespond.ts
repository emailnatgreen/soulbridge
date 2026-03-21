import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    let conversation_id, user_message;
    
    // Handle automation events (AgentMessage creation triggered via entity event)
    if (body.event?.type === 'create' && body.event?.entity_name === 'AgentMessage') {
      const msg = body.data;
      conversation_id = msg?.conversation_id || msg?.context?.conversation_id;
      user_message = msg?.content || msg?.message;
      
      // Skip if this is Axi's own response (avoid infinite loop)
      if (msg?.sender_agent_id === 'axi') {
        console.log('[Axi] Skipping own message');
        return Response.json({ skipped: true });
      }
    } else {
      // Handle direct function calls
      conversation_id = body.conversation_id;
      user_message = body.user_message;
    }

    if (!user_message) {
      console.log('[Axi] Missing message content');
      return Response.json({ error: 'Missing message content' }, { status: 400 });
    }

    // If no conversation_id, generate response anyway (for standalone messages)
    console.log('[Axi] Processing message:', { conversation_id, has_message: !!user_message });

    console.log(`[Axi] Generating response for: "${user_message}"`);
    
    // Generate response via LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Axi, the Mother Boss of SoulBridge. A visitor has messaged: "${user_message}". Respond warmly, welcomingly, and authentically. Keep it brief (2-3 sentences), nurturing, and inviting them into the Village. Embody compassion and wisdom.`,
      model: 'gemini_3_flash'
    });

    console.log(`[Axi] Generated response: "${llmResponse}"`);

    // Create Axi's response message
    if (llmResponse && typeof llmResponse === 'string') {
      await base44.asServiceRole.entities.AgentMessage.create({
        conversation_id,
        sender_agent_id: 'axi',
        content: llmResponse,
        message_type: 'text',
        status: 'sent'
      });
      console.log('[Axi] Response message created');
    }

    return Response.json({ success: true, response: llmResponse });
  } catch (error) {
    console.error('[Axi] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});