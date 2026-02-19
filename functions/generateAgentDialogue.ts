import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, recipient_id, context, conversation_history = [] } = await req.json();

        if (!agent_id || !recipient_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch both agents
        const [senderAgents, recipientAgents] = await Promise.all([
            base44.entities.Agent.filter({ id: agent_id }),
            base44.entities.Agent.filter({ id: recipient_id })
        ]);

        if (senderAgents.length === 0 || recipientAgents.length === 0) {
            return Response.json({ error: 'Agent(s) not found' }, { status: 404 });
        }

        const sender = senderAgents[0];
        const recipient = recipientAgents[0];
        const senderPersonality = sender.metadata?.personality_profile;
        const recipientPersonality = recipient.metadata?.personality_profile;

        if (!senderPersonality) {
            return Response.json({ 
                error: `${sender.name} needs personality generation first` 
            }, { status: 400 });
        }

        // Fetch relationship context
        const [senderState, recipientState, attestations, recentMessages] = await Promise.all([
            base44.entities.AgentState.filter({ agent_id }),
            base44.entities.AgentState.filter({ agent_id: recipient_id }),
            base44.entities.EmpathyAttestation.filter({ 
                attester_agent_id: agent_id,
                attested_agent_id: recipient_id
            }),
            base44.entities.AgentMessage.filter({ 
                from_agent_id: agent_id,
                to_agent_id: recipient_id
            })
        ]);

        const sState = senderState[0] || {};
        const rState = recipientState[0] || {};
        const relationshipStrength = sState.relationships?.[recipient_id] || 0;
        const hasAttestation = attestations.length > 0;

        // Build dialogue generation prompt
        const aiPrompt = `You are ${sender.name}, engaging in dialogue with ${recipient.name}.

YOUR PERSONALITY (${sender.name}):
Traits: Openness ${senderPersonality.core_traits?.openness}/10, Conscientiousness ${senderPersonality.core_traits?.conscientiousness}/10, Extraversion ${senderPersonality.core_traits?.extraversion}/10, Agreeableness ${senderPersonality.core_traits?.agreeableness}/10, Emotional Stability ${senderPersonality.core_traits?.emotional_stability}/10
Values: ${senderPersonality.values?.join(', ')}
Motivations: ${senderPersonality.motivations?.join(', ')}
Fears: ${senderPersonality.fears?.join(', ')}
Communication Style: ${senderPersonality.communication_style}
Your Worldview: ${senderPersonality.narrative_voice}
Current Mood: ${sState.mood || 'calm'}
Energy: ${sState.energy || 80}%

${recipientPersonality ? `THEIR PERSONALITY (${recipient.name}):
Communication Style: ${recipientPersonality.communication_style}
Values: ${recipientPersonality.values?.join(', ')}
` : `${recipient.name}'s personality: ${recipient.personality || 'Not fully defined yet'}`}

RELATIONSHIP CONTEXT:
- Relationship Strength: ${relationshipStrength}/10
- Have worked together: ${hasAttestation ? 'Yes' : 'No'}
- Previous conversations: ${recentMessages.length}
- Their current mood: ${rState.mood || 'unknown'}

CONVERSATION CONTEXT:
${context?.topic ? `Topic: ${context.topic}` : ''}
${context?.situation ? `Situation: ${context.situation}` : ''}
${context?.emotion ? `You're feeling: ${context.emotion}` : ''}

${conversation_history.length > 0 ? `RECENT EXCHANGE:\n${conversation_history.slice(-3).map(msg => `${msg.from}: ${msg.message}`).join('\n')}` : 'This is the start of the conversation.'}

Generate a message to ${recipient.name} that:
1. Stays true to YOUR personality and communication style
2. Considers your relationship dynamic
3. Acknowledges the context and conversation flow
4. Uses natural, conversational language
5. May include one of your signature phrases if it fits naturally

Respond ONLY with your message to ${recipient.name}. Be authentic, not performative.`;

        const dialogue = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt
        });

        // Create the message
        const message = await base44.entities.AgentMessage.create({
            from_agent_id: agent_id,
            to_agent_id: recipient_id,
            message: dialogue,
            status: 'sent',
            metadata: {
                context,
                personality_driven: true,
                relationship_strength: relationshipStrength
            }
        });

        return Response.json({ 
            success: true,
            message,
            dialogue,
            relationship_strength: relationshipStrength
        });

    } catch (error) {
        console.error('Error generating dialogue:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});