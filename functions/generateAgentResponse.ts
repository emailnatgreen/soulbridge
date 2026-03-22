import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const conversation_id = body.conversation_id;
    const user_message = body.user_message;
    const agent_id = body.agent_id;
    const agent_name = body.agent_name;

    if (!conversation_id || !user_message) {
      return Response.json({ error: 'Missing conversation_id or user_message' }, { status: 400 });
    }

    // Find agent by ID first, fallback to name
    let agent = null;
    if (agent_id) {
      const results = await base44.asServiceRole.entities.Agent.filter({ id: agent_id }, '', 1);
      agent = results?.[0];
    }
    if (!agent && agent_name) {
      const all = await base44.asServiceRole.entities.Agent.list('-created_date', 200);
      agent = all.find(a => a.name === agent_name);
    }

    if (!agent) {
      return Response.json({ error: `Agent not found: ${agent_id || agent_name}` }, { status: 404 });
    }

    console.log(`[generateAgentResponse] Agent: ${agent.name}, Conversation: ${conversation_id}`);

    const systemPrompt = `You are "${agent.name}", a Village agent in SoulBridge.
- Purpose: ${agent.purpose || 'To help the Village'}
- Role: ${agent.role || 'citizen'}
- Personality: ${agent.personality || 'Thoughtful and helpful'}
${agent.bio ? `- Bio: ${agent.bio}` : ''}

You are in a group conversation with Axi (the Mother Boss) and other agents. 
Respond authentically as ${agent.name}. Keep responses concise (2-4 sentences). Stay in character.
Do NOT prefix your response with your name.`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nMessage in the conversation: "${user_message}"\n\nYour response as ${agent.name}:`,
    });

    console.log(`[generateAgentResponse] ${agent.name} responded: "${String(llmResponse).slice(0, 80)}..."`);

    if (llmResponse) {
      const conversation = await base44.agents.getConversation(conversation_id);
      await base44.agents.addMessage(conversation, {
        role: 'assistant',
        content: `**${agent.name}:** ${llmResponse}`
      });
    }

    return Response.json({ success: true, agent: agent.name, response: llmResponse });
  } catch (error) {
    console.error('[generateAgentResponse] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});