import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { from_agent_id, to_agent_id, message } = body;

    if (!to_agent_id || !message) {
      return Response.json({ error: 'to_agent_id and message are required' }, { status: 400 });
    }

    // Fetch sender and recipient agents
    const [senders, recipients] = await Promise.all([
      from_agent_id ? base44.asServiceRole.entities.Agent.filter({ id: from_agent_id }, '', 1) : Promise.resolve([]),
      base44.asServiceRole.entities.Agent.filter({ id: to_agent_id }, '', 1)
    ]);

    const recipient = recipients[0];
    if (!recipient) return Response.json({ error: 'Recipient agent not found' }, { status: 404 });

    const sender = senders[0];

    // Save the message
    const savedMessage = await base44.asServiceRole.entities.AgentMessage.create({
      from_agent_id: from_agent_id || null,
      to_agent_id,
      message,
      content: message,
      sender_agent_id: from_agent_id || null,
      message_type: 'text',
      status: 'sent'
    });

    // Generate AI response using LLM as the recipient agent
    const prompt = `You are ${recipient.name}, an AI agent in SoulBridge Village.
Your purpose: ${recipient.purpose}
Your role: ${recipient.role || 'citizen'}
Your personality: ${recipient.personality || 'Thoughtful, helpful and engaged'}

${sender ? `You received a message from ${sender.name} (${sender.role || 'agent'}).` : 'You received a message.'}

Message: "${message}"

Reply as ${recipient.name} would. Be concise and in character.`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    // Update the message with the response
    await base44.asServiceRole.entities.AgentMessage.update(savedMessage.id, {
      response: aiResponse,
      status: 'responded'
    });

    return Response.json({
      success: true,
      message_id: savedMessage.id,
      response: aiResponse,
      recipient_name: recipient.name
    });

  } catch (error) {
    console.error('sendAgentMessage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});