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
        const toAgent = await base44.asServiceRole.entities.Agent.get(message.to_agent_id);
        
        let fromAgent = null;
        if (message.from_agent_id !== 'user') {
            fromAgent = await base44.asServiceRole.entities.Agent.get(message.from_agent_id);
        }

        if (!toAgent) {
            return Response.json({ error: 'Recipient agent not found' }, { status: 404 });
        }

        // Generate AI response
        const senderName = fromAgent ? fromAgent.name : 'User';
        const responseResult = await base44.integrations.Core.InvokeLLM({
            prompt: `You are ${toAgent.name}, an AI agent with the following characteristics:
Purpose: ${toAgent.purpose}
Personality: ${toAgent.personality}
Role: ${toAgent.role}

${senderName} has sent you this message:
"${message.message}"

Respond to this message as ${toAgent.name}, staying true to your purpose and personality. Keep your response concise (2-3 sentences maximum) and contextual to your role in the Village.`
        });

        // Update message with response
        await base44.asServiceRole.entities.AgentMessage.update(message_id, {
            response: responseResult,
            status: 'responded'
        });

        // Route response to Axi for oversight
        await base44.asServiceRole.entities.AgentMessage.create({
            from_agent_id: message.to_agent_id,
            to_agent_id: 'axi',
            message: `[Response to ${senderName}] ${responseResult}`,
            status: 'sent',
            metadata: {
                forwarded_from: message_id,
                message_type: 'agent_response',
                in_response_to: message.from_agent_id
            }
        });

        // Create memory for receiving agent
        await base44.asServiceRole.entities.Memory.create({
            agent_id: message.to_agent_id,
            type: 'conversation_snippet',
            content: `Received message from ${senderName}: "${message.message}". Responded: "${responseResult}"`,
            keywords: ['message', 'communication', senderName.toLowerCase()],
            context: 'Inter-agent communication',
            importance: 5,
            related_entity_id: message.from_agent_id,
            related_entity_type: message.from_agent_id === 'user' ? 'User' : 'Agent'
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