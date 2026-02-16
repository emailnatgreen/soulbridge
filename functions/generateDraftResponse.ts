import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { message_id, agent_id } = await req.json();

        if (!message_id || !agent_id) {
            return Response.json({
                error: 'message_id and agent_id are required'
            }, { status: 400 });
        }

        // Get the message
        const message = await base44.asServiceRole.entities.AgentMessage.get(message_id);
        if (!message) {
            return Response.json({ error: 'Message not found' }, { status: 404 });
        }

        // Get agent details
        const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Get recent conversation history for context (last 10 messages)
        const allMessages = await base44.asServiceRole.entities.AgentMessage.filter(
            { to_agent_id: agent_id },
            '-created_date',
            10
        );

        const conversationContext = allMessages
            .reverse()
            .map(m => `${m.from_agent_id}: ${m.message}`)
            .join('\n');

        // Generate draft response with context awareness
        const draftResult = await base44.integrations.Core.InvokeLLM({
            prompt: `You are ${agent.name}, an AI agent with these characteristics:
Purpose: ${agent.purpose}
Personality: ${agent.personality}
Role: ${agent.role}

Recent conversation context:
${conversationContext}

A new message has arrived:
"${message.message}"

Generate a thoughtful, concise draft response (2-3 sentences) that:
1. Stays true to your purpose and personality
2. Addresses the specific message content
3. Maintains consistency with the conversation history
4. Is professional yet fits your character

Draft response:`
        });

        return Response.json({
            success: true,
            message_id,
            agent_id,
            draft_response: draftResult.trim(),
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in generateDraftResponse:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});