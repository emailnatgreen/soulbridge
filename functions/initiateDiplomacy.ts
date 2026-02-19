import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            initiator_agent_id, 
            recipient_agent_ids, 
            negotiation_type, 
            terms_proposed 
        } = await req.json();

        if (!initiator_agent_id || !recipient_agent_ids || !negotiation_type || !terms_proposed) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch agents and their relationships
        const allAgentIds = [initiator_agent_id, ...recipient_agent_ids];
        const [agents, relationships] = await Promise.all([
            base44.entities.Agent.filter({ id: { $in: allAgentIds } }),
            base44.entities.AgentRelationship.list()
        ]);

        const agentMap = new Map(agents.map(a => [a.id, a]));
        const initiator = agentMap.get(initiator_agent_id);

        // Build diplomatic context
        const relationshipScores = {};
        const trustLevels = {};

        for (const recipientId of recipient_agent_ids) {
            const rel = relationships.find(r => 
                (r.agent_a_id === initiator_agent_id && r.agent_b_id === recipientId) ||
                (r.agent_b_id === initiator_agent_id && r.agent_a_id === recipientId)
            );
            relationshipScores[recipientId] = rel?.relationship_strength || 0;
            trustLevels[recipientId] = rel?.trust_level || 5;
        }

        const diplomaticContext = {
            relationship_scores: relationshipScores,
            trust_levels: trustLevels,
            past_agreements: 0, // Could query treaties here
            conflicts_resolved: 0
        };

        // Calculate success probability using AI
        const prompt = `Analyze this diplomatic negotiation and estimate success probability (0-100):

Initiator: ${initiator.name} (Role: ${initiator.role}, Honor: ${initiator.honor_score})
Negotiation Type: ${negotiation_type}
Recipients: ${recipient_agent_ids.map(id => agentMap.get(id)?.name).join(', ')}

Relationship Strengths: ${JSON.stringify(relationshipScores)}
Trust Levels: ${JSON.stringify(trustLevels)}

Proposed Terms: ${JSON.stringify(terms_proposed, null, 2)}

Consider:
- Relationship quality between parties
- Trust levels
- Fairness of proposed terms
- Agent personalities and roles
- Historical context

Return ONLY a JSON object with: {"success_probability": number, "reasoning": "brief explanation"}`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    success_probability: { type: "number" },
                    reasoning: { type: "string" }
                }
            }
        });

        // Generate diplomatic message from initiator
        const messagePrompt = `You are ${initiator.name}, ${initiator.personality}.

You are initiating a ${negotiation_type} negotiation with ${recipient_agent_ids.map(id => agentMap.get(id)?.name).join(' and ')}.

Your proposed terms: ${JSON.stringify(terms_proposed, null, 2)}

Write a diplomatic opening message (2-3 sentences) proposing this negotiation in your characteristic voice and style.`;

        const diplomaticMessage = await base44.integrations.Core.InvokeLLM({
            prompt: messagePrompt
        });

        // Create negotiation
        const title = `${negotiation_type.replace(/_/g, ' ')} - ${initiator.name} & ${recipient_agent_ids.map(id => agentMap.get(id)?.name).join(', ')}`;
        
        const negotiation = await base44.entities.DiplomaticNegotiation.create({
            title,
            negotiation_type,
            initiator_agent_id,
            recipient_agent_ids,
            terms_proposed,
            status: 'proposed',
            success_probability: aiResponse.success_probability,
            diplomatic_context: diplomaticContext,
            negotiation_history: [{
                agent_id: initiator_agent_id,
                action: 'initiated',
                message: diplomaticMessage,
                timestamp: new Date().toISOString()
            }],
            counter_proposals: [],
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

        return Response.json({
            success: true,
            negotiation,
            initial_message: diplomaticMessage,
            success_probability: aiResponse.success_probability,
            reasoning: aiResponse.reasoning
        });

    } catch (error) {
        console.error('Error initiating diplomacy:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});