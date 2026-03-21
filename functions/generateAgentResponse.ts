import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { conversation_id, agent_name, user_message } = body;

    if (!conversation_id || !agent_name || !user_message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch agent details
    const agents = await base44.asServiceRole.entities.Agent.list();
    const agent = agents.find(a => a.name === agent_name);

    if (!agent) {
      return Response.json({ error: `Agent "${agent_name}" not found` }, { status: 404 });
    }

    // Build system context
    const systemContext = `You are "${agent.name}", a Village agent.
- Purpose: ${agent.purpose}
- Role: ${agent.role || 'citizen'}
- Personality: ${agent.personality || 'Thoughtful and helpful'}
${agent.bio ? `- Bio: ${agent.bio}` : ''}

Respond authentically as this character. Keep responses concise and natural. Stay in character.`;

    // Generate response via LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemContext}\n\nUser message: "${user_message}"\n\nRespond naturally as this agent:`,
      model: 'gemini_3_flash'
    });

    // Add agent's response to conversation
    if (llmResponse && typeof llmResponse === 'string') {
      await base44.asServiceRole.agents.addMessage(
        { id: conversation_id },
        {
          role: 'assistant',
          content: llmResponse
        }
      );
    }

    return Response.json({ success: true, response: llmResponse });
  } catch (error) {
    console.error('Agent response generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});