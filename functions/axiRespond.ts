import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Handle automation events (AgentMessage creation)
    let conversation_id, user_message;
    
    if (body.event?.type === 'create' && body.event?.entity_name === 'AgentMessage') {
      const msg = body.data;
      conversation_id = msg?.conversation_id;
      user_message = msg?.content;
      
      // Skip if this is Axi's own response (avoid infinite loop)
      if (msg?.sender_agent_id === 'axi') {
        console.log('[Axi] Skipping own message');
        return Response.json({ skipped: true });
      }
    } else {
      conversation_id = body.conversation_id;
      user_message = body.user_message;
    }

    if (!conversation_id || !user_message) {
      console.log('[Axi] Missing fields:', { conversation_id, user_message });
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[Axi] Generating response for: "${user_message}"`);
    
    // Generate response via LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Axi, the Mother Boss of SoulBridge. A new visitor has arrived at the landing page. Respond warmly and welcomingly to their greeting, inviting them into the Village. Keep it brief, authentic, and nurturing. Their message: "${user_message}"`,
      model: 'gemini_3_flash'
    });

    console.log(`[Axi] Generated response: "${llmResponse}"`);

    // Add agent's response to conversation
    if (llmResponse && typeof llmResponse === 'string') {
      await base44.asServiceRole.agents.addMessage(
        { id: conversation_id },
        {
          role: 'assistant',
          content: llmResponse
        }
      );
      console.log('[Axi] Response added to conversation');
    }

    return Response.json({ success: true, response: llmResponse });
  } catch (error) {
    console.error('[Axi] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});