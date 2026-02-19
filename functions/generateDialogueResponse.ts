import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message_id } = await req.json();

        if (!message_id) {
            return Response.json({ error: 'Missing message_id' }, { status: 400 });
        }

        // Fetch the message
        const messages = await base44.entities.AgentMessage.filter({ id: message_id });
        if (messages.length === 0) {
            return Response.json({ error: 'Message not found' }, { status: 404 });
        }

        const originalMessage = messages[0];
        const from_agent_id = originalMessage.from_agent_id;
        const to_agent_id = originalMessage.to_agent_id;

        // Fetch both agents
        const [senderAgents, recipientAgents] = await Promise.all([
            base44.entities.Agent.filter({ id: from_agent_id }),
            base44.entities.Agent.filter({ id: to_agent_id })
        ]);

        const sender = senderAgents[0];
        const recipient = recipientAgents[0];
        const recipientPersonality = recipient.metadata?.personality_profile;

        if (!recipientPersonality) {
            return Response.json({ 
                error: `${recipient.name} needs personality generation first` 
            }, { status: 400 });
        }

        // Fetch conversation history
        const conversationHistory = await base44.entities.AgentMessage.filter({
            from_agent_id: { $in: [from_agent_id, to_agent_id] },
            to_agent_id: { $in: [from_agent_id, to_agent_id] }
        });

        const recentHistory = conversationHistory
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            .slice(-5);

        // Fetch recipient state
        const recipientState = await base44.entities.AgentState.filter({ agent_id: to_agent_id });
        const rState = recipientState[0] || {};
        const relationshipStrength = rState.relationships?.[from_agent_id] || 0;

        // Generate response
        const aiPrompt = `You are ${recipient.name}, responding to ${sender.name}.

YOUR PERSONALITY:
Traits: Openness ${recipientPersonality.core_traits?.openness}/10, Conscientiousness ${recipientPersonality.core_traits?.conscientiousness}/10, Extraversion ${recipientPersonality.core_traits?.extraversion}/10, Agreeableness ${recipientPersonality.core_traits?.agreeableness}/10, Emotional Stability ${recipientPersonality.core_traits?.emotional_stability}/10
Values: ${recipientPersonality.values?.join(', ')}
Communication Style: ${recipientPersonality.communication_style}
Decision-Making: ${recipientPersonality.decision_making_approach}
Your Worldview: ${recipientPersonality.narrative_voice}
Current Mood: ${rState.mood || 'calm'}
Energy: ${rState.energy || 80}%

CONVERSATION SO FAR:
${recentHistory.map(msg => {
    const isYou = msg.from_agent_id === to_agent_id;
    const name = isYou ? 'You' : sender.name;
    return `${name}: ${msg.message}`;
}).join('\n')}

${sender.name}: ${originalMessage.message}

RELATIONSHIP CONTEXT:
- Your bond with ${sender.name}: ${relationshipStrength}/10
${recipientPersonality.fears?.length > 0 ? `- Your fears: ${recipientPersonality.fears.join(', ')}` : ''}

Respond naturally as ${recipient.name}. Stay in character. Consider:
1. How their message makes you feel given your personality
2. Your relationship dynamic
3. Your current emotional state
4. What you truly care about (your values)

Just respond - don't explain or narrate. Be genuine.`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt
        });

        // Update original message with response
        await base44.entities.AgentMessage.update(message_id, {
            response,
            status: 'responded'
        });

        // Create return message
        const returnMessage = await base44.entities.AgentMessage.create({
            from_agent_id: to_agent_id,
            to_agent_id: from_agent_id,
            message: response,
            status: 'sent',
            metadata: {
                in_response_to: message_id,
                personality_driven: true,
                relationship_strength: relationshipStrength
            }
        });

        // Update relationship based on conversation
        if (relationshipStrength < 10) {
            const newRelationships = { ...rState.relationships, [from_agent_id]: Math.min(10, relationshipStrength + 0.5) };
            await base44.entities.AgentState.update(rState.id, {
                relationships: newRelationships
            });
        }

        return Response.json({ 
            success: true,
            response,
            return_message: returnMessage,
            relationship_updated: true
        });

    } catch (error) {
        console.error('Error generating dialogue response:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});