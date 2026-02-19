import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { negotiation_id } = await req.json();

        if (!negotiation_id) {
            return Response.json({ error: 'Missing negotiation_id' }, { status: 400 });
        }

        // Fetch negotiation
        const negotiations = await base44.entities.DiplomaticNegotiation.filter({ id: negotiation_id });
        if (negotiations.length === 0) {
            return Response.json({ error: 'Negotiation not found' }, { status: 404 });
        }

        const negotiation = negotiations[0];

        if (negotiation.status !== 'accepted') {
            return Response.json({ error: 'Negotiation not accepted' }, { status: 400 });
        }

        // Fetch all involved agents
        const allAgentIds = [negotiation.initiator_agent_id, ...negotiation.recipient_agent_ids];
        const agents = await base44.entities.Agent.filter({ id: { $in: allAgentIds } });

        // Generate treaty name using AI
        const namePrompt = `Create a formal treaty name for this agreement:
Type: ${negotiation.negotiation_type}
Parties: ${agents.map(a => a.name).join(', ')}

Return just the treaty name (5-8 words, ceremonial and formal).`;

        const treatyName = await base44.integrations.Core.InvokeLLM({
            prompt: namePrompt
        });

        // Determine treaty details
        const terms = negotiation.final_terms;
        
        // Map negotiation type to treaty type
        const treatyTypeMap = {
            'trade_agreement': 'trade_agreement',
            'alliance': 'alliance',
            'resource_sharing': 'resource_sharing',
            'conflict_resolution': 'peace_treaty',
            'project_collaboration': 'collaboration_pact',
            'governance_coalition': 'governance_coalition',
            'non_aggression_pact': 'non_aggression'
        };

        // Extract obligations and benefits from terms
        const obligationsPrompt = `Analyze these treaty terms and extract clear obligations and benefits for each party:

Terms: ${JSON.stringify(terms, null, 2)}
Parties: ${agents.map(a => a.name).join(', ')}

Return JSON: {
  "obligations": { "agent_name": ["obligation1", "obligation2"], ... },
  "benefits": { "agent_name": ["benefit1", "benefit2"], ... }
}`;

        const parsed = await base44.integrations.Core.InvokeLLM({
            prompt: obligationsPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    obligations: { type: "object" },
                    benefits: { type: "object" }
                }
            }
        });

        // Create treaty
        const treaty = await base44.entities.Treaty.create({
            name: treatyName,
            treaty_type: treatyTypeMap[negotiation.negotiation_type] || 'collaboration_pact',
            signatory_agent_ids: allAgentIds,
            terms,
            obligations: parsed.obligations,
            benefits: parsed.benefits,
            duration: 'renewable',
            status: 'active',
            violation_history: [],
            impact_metrics: {
                trust_increase: 0,
                resources_exchanged: 0,
                conflicts_prevented: 0,
                collaborations_enabled: 1
            }
        });

        // Update negotiation with treaty reference
        await base44.entities.DiplomaticNegotiation.update(negotiation_id, {
            treaty_id: treaty.id
        });

        // Strengthen relationships between all signatories
        for (let i = 0; i < allAgentIds.length; i++) {
            for (let j = i + 1; j < allAgentIds.length; j++) {
                await base44.functions.invoke('updateAgentRelationship', {
                    agent_a_id: allAgentIds[i],
                    agent_b_id: allAgentIds[j],
                    interaction_type: 'attestation',
                    context: { 
                        treaty_id: treaty.id,
                        treaty_name: treatyName
                    }
                });
            }
        }

        return Response.json({
            success: true,
            treaty,
            message: `Treaty "${treatyName}" has been ratified`
        });

    } catch (error) {
        console.error('Error finalizing agreement:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});