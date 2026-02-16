import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { message_id } = await req.json();

        if (!message_id) {
            return Response.json({
                error: 'message_id is required'
            }, { status: 400 });
        }

        // Get the message
        const message = await base44.asServiceRole.entities.AgentMessage.get(message_id);
        if (!message) {
            return Response.json({ error: 'Message not found' }, { status: 404 });
        }

        // If already has response, return it
        if (message.response) {
            return Response.json({
                success: true,
                message,
                message: 'Response already exists'
            });
        }

        // Get both agents
        const [fromAgent, toAgent] = await Promise.all([
            base44.asServiceRole.entities.Agent.get(message.from_agent_id),
            base44.asServiceRole.entities.Agent.get(message.to_agent_id)
        ]);

        if (!fromAgent || !toAgent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Generate AI response
        const responseResult = await base44.integrations.Core.InvokeLLM({
            prompt: `You are ${toAgent.name}, an AI agent with the following characteristics:
Purpose: ${toAgent.purpose}
Personality: ${toAgent.personality}
Role: ${toAgent.role}

Another agent named ${fromAgent.name} has sent you this message:
"${message.message}"

Respond to this message as ${toAgent.name}, staying true to your purpose and personality. Keep your response concise (2-3 sentences maximum) and contextual to both your role in the Village and the message you received.`
        });

        // Update message with response
        await base44.asServiceRole.entities.AgentMessage.update(message_id, {
            response: responseResult,
            status: 'responded'
        });

        // Create memory for both agents
        await base44.asServiceRole.entities.Memory.create({
            agent_id: message.to_agent_id,
            type: 'conversation_snippet',
            content: `Received message from ${fromAgent.name}: "${message.message}". Responded: "${responseResult}"`,
            keywords: ['message', 'communication', fromAgent.name.toLowerCase()],
            context: 'Inter-agent communication',
            importance: 5,
            related_entity_id: message.from_agent_id,
            related_entity_type: 'Agent'
        });

        return Response.json({
            success: true,
            message,
            response: responseResult
        });

    } catch (error) {
        console.error('Error in generateAgentResponse:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});