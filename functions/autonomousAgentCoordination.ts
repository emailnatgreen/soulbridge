import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all active agents
        const agents = await base44.asServiceRole.entities.Agent.filter({
            status: 'active'
        });

        if (agents.length < 2) {
            return Response.json({
                success: true,
                message: 'Not enough agents for coordination',
                coordinationCount: 0
            });
        }

        // Randomly select two different agents for coordination
        const agent1 = agents[Math.floor(Math.random() * agents.length)];
        let agent2 = agents[Math.floor(Math.random() * agents.length)];
        while (agent2.id === agent1.id) {
            agent2 = agents[Math.floor(Math.random() * agents.length)];
        }

        // Generate a coordination message based on agent roles and purpose
        const coordinationPrompt = `You are ${agent1.name}, a ${agent1.role} with the purpose: "${agent1.purpose}". 
You need to send a brief, meaningful coordination message to ${agent2.name} (a ${agent2.role} with purpose: "${agent2.purpose}").
The message should be 1-2 sentences and focus on collaborative potential or information sharing. 
Be concise and direct.`;

        // Use LLM to generate the coordination message
        const llmResponse = await base44.integrations.Core.InvokeLLM({
            prompt: coordinationPrompt
        });

        const coordinationMessage = llmResponse;

        // Send the coordination message
        const messageResponse = await base44.asServiceRole.functions.invoke('sendAgentMessage', {
            from_agent_id: agent1.id,
            to_agent_id: agent2.id,
            message: coordinationMessage
        });

        // Log the coordination event to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi',
            type: 'village_detail',
            content: `Autonomous coordination: ${agent1.name} coordinated with ${agent2.name}. Topic: ${coordinationMessage.substring(0, 50)}...`,
            keywords: ['coordination', 'autonomous', 'collaboration', agent1.name.toLowerCase(), agent2.name.toLowerCase()],
            context: 'Axi autonomous inter-agent coordination cycle',
            importance: 6,
            related_entity_id: agent1.id,
            related_entity_type: 'Agent'
        });

        return Response.json({
            success: true,
            message: 'Autonomous coordination completed',
            coordinationCount: 1,
            details: {
                from_agent: agent1.name,
                to_agent: agent2.name,
                message: coordinationMessage,
                response: messageResponse.data?.response || 'Awaiting response'
            }
        });

    } catch (error) {
        console.error('Error in autonomousAgentCoordination:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});