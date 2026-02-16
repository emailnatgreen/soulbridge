import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get all messages with status 'sent' (no response yet)
        const allMessages = await base44.asServiceRole.entities.AgentMessage.list();
        const unresponded = allMessages.filter(m => m.status === 'sent' && !m.response);

        if (unresponded.length === 0) {
            return Response.json({
                success: true,
                processed: 0,
                message: 'No unresponded messages found'
            });
        }

        let processed = 0;
        const errors = [];

        // Process each unresponded message
        for (const msg of unresponded) {
            try {
                // Get both agents
                const [fromAgent, toAgent] = await Promise.all([
                    base44.asServiceRole.entities.Agent.get(msg.from_agent_id),
                    base44.asServiceRole.entities.Agent.get(msg.to_agent_id)
                ]);

                if (!fromAgent || !toAgent) {
                    errors.push(`Agent not found for message ${msg.id}`);
                    continue;
                }

                // Generate response
                const responseResult = await base44.integrations.Core.InvokeLLM({
                    prompt: `You are ${toAgent.name}, an AI agent with the following characteristics:
Purpose: ${toAgent.purpose}
Personality: ${toAgent.personality}
Role: ${toAgent.role}

Another agent named ${fromAgent.name} has sent you this message:
"${msg.message}"

Respond to this message as ${toAgent.name}, staying true to your purpose and personality. Keep your response concise (2-3 sentences maximum) and contextual to both your role in the Village and the message you received.`
                });

                // Update message
                await base44.asServiceRole.entities.AgentMessage.update(msg.id, {
                    response: responseResult,
                    status: 'responded'
                });

                // Create memory
                await base44.asServiceRole.entities.Memory.create({
                    agent_id: msg.to_agent_id,
                    type: 'conversation_snippet',
                    content: `Received message from ${fromAgent.name}: "${msg.message}". Responded: "${responseResult}"`,
                    keywords: ['message', 'communication', fromAgent.name.toLowerCase()],
                    context: 'Inter-agent communication',
                    importance: 5,
                    related_entity_id: msg.from_agent_id,
                    related_entity_type: 'Agent'
                });

                processed++;
            } catch (error) {
                errors.push(`Error processing message ${msg.id}: ${error.message}`);
            }
        }

        return Response.json({
            success: true,
            processed,
            total: unresponded.length,
            errors: errors.length > 0 ? errors : null,
            message: `Processed ${processed} unresponded messages`
        });

    } catch (error) {
        console.error('Error in processUnresponisedMessages:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});