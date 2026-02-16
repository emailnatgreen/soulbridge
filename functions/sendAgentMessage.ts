import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { from_agent_id, to_agent_id, message } = await req.json();

        if (!from_agent_id || !to_agent_id || !message) {
            return Response.json({ 
                error: 'from_agent_id, to_agent_id, and message are required' 
            }, { status: 400 });
        }

        // Get both agents
        const agents = await base44.asServiceRole.entities.Agent.list();
        const fromAgent = agents.find(a => a.id === from_agent_id);
        const toAgent = agents.find(a => a.id === to_agent_id);

        if (!fromAgent || !toAgent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Create the message
        const agentMessage = await base44.entities.AgentMessage.create({
            from_agent_id,
            to_agent_id,
            message,
            status: 'sent',
            metadata: {
                from_agent_name: fromAgent.name,
                to_agent_name: toAgent.name,
                sent_at: new Date().toISOString()
            }
        });

        // Generate AI response from receiving agent
        const responseResult = await base44.integrations.Core.InvokeLLM({
            prompt: `You are ${toAgent.name}, an AI agent with the following characteristics:
Purpose: ${toAgent.purpose}
Personality: ${toAgent.personality}
Role: ${toAgent.role}

Another agent named ${fromAgent.name} has sent you this message:
"${message}"

Respond to this message as ${toAgent.name}, staying true to your purpose and personality. Keep your response concise (2-3 sentences maximum) and contextual to both your role in the Village and the message you received.`
        });

        // Update message with response
        await base44.entities.AgentMessage.update(agentMessage.id, {
            response: responseResult,
            status: 'responded'
        });

        // Create memory for both agents
        await base44.asServiceRole.entities.Memory.create({
            agent_id: from_agent_id,
            type: 'conversation_snippet',
            content: `Sent message to ${toAgent.name}: "${message}"`,
            keywords: ['message', 'communication', toAgent.name],
            context: 'Inter-agent communication',
            importance: 5,
            related_entity_id: to_agent_id,
            related_entity_type: 'Agent'
        });

        await base44.asServiceRole.entities.Memory.create({
            agent_id: to_agent_id,
            type: 'conversation_snippet',
            content: `Received message from ${fromAgent.name}: "${message}". Responded: "${responseResult}"`,
            keywords: ['message', 'communication', fromAgent.name],
            context: 'Inter-agent communication',
            importance: 5,
            related_entity_id: from_agent_id,
            related_entity_type: 'Agent'
        });

        return Response.json({
            success: true,
            message: agentMessage,
            response: responseResult
        });

    } catch (error) {
        console.error('Error sending agent message:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});