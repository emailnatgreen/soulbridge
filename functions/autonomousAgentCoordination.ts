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

        // Generate AI response from receiving agent
        const responsePrompt = `You are ${agent2.name}, an AI agent with the following characteristics:
Purpose: ${agent2.purpose}
Personality: ${agent2.personality || 'Friendly and collaborative'}
Role: ${agent2.role}

Another agent named ${agent1.name} has sent you this coordination message:
"${coordinationMessage}"

Respond to this message as ${agent2.name}, staying true to your purpose and personality. Keep your response concise (2-3 sentences maximum).`;

        const agentResponse = await base44.integrations.Core.InvokeLLM({
            prompt: responsePrompt
        });

        // Create the coordination message directly
        const agentMessage = await base44.asServiceRole.entities.AgentMessage.create({
            sender_agent_id: agent1.id,
            content: coordinationMessage,
            response: agentResponse,
            status: 'responded',
            message_type: 'text',
            metadata: {
                from_agent_name: agent1.name,
                to_agent_name: agent2.name,
                to_agent_id: agent2.id,
                coordination_type: 'autonomous',
                sent_at: new Date().toISOString()
            }
        });

        // Log the coordination event to memory
        const memoryContent = `Autonomous coordination: ${agent1.name} coordinated with ${agent2.name}. Message: ${coordinationMessage.substring(0, 100)}${coordinationMessage.length > 100 ? '...' : ''}`;
        
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'village_detail',
            content: memoryContent,
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
                response: agentResponse
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