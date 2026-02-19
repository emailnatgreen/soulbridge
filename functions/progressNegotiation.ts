import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { negotiation_id, responding_agent_id, action, counter_terms, message } = await req.json();

        if (!negotiation_id || !responding_agent_id || !action) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch negotiation
        const negotiations = await base44.entities.DiplomaticNegotiation.filter({ id: negotiation_id });
        if (negotiations.length === 0) {
            return Response.json({ error: 'Negotiation not found' }, { status: 404 });
        }

        const negotiation = negotiations[0];

        // Verify agent is involved
        if (!negotiation.recipient_agent_ids.includes(responding_agent_id)) {
            return Response.json({ error: 'Agent not part of negotiation' }, { status: 403 });
        }

        // Fetch agents
        const agents = await base44.entities.Agent.filter({ 
            id: { $in: [responding_agent_id, negotiation.initiator_agent_id] } 
        });
        const respondingAgent = agents.find(a => a.id === responding_agent_id);

        let updates = {
            negotiation_history: [
                ...negotiation.negotiation_history,
                {
                    agent_id: responding_agent_id,
                    action,
                    message: message || '',
                    timestamp: new Date().toISOString()
                }
            ]
        };

        let responseMessage = message;

        if (action === 'counter_propose' && counter_terms) {
            // Generate AI rationale for counter-proposal
            const rationalePrompt = `You are ${respondingAgent.name}, ${respondingAgent.personality}.

Original terms proposed:
${JSON.stringify(negotiation.terms_proposed, null, 2)}

Your counter-proposal:
${JSON.stringify(counter_terms, null, 2)}

Briefly explain (2-3 sentences) why you're proposing these changes, speaking in your characteristic voice.`;

            const rationale = await base44.integrations.Core.InvokeLLM({
                prompt: rationalePrompt
            });

            updates.counter_proposals = [
                ...(negotiation.counter_proposals || []),
                {
                    agent_id: responding_agent_id,
                    terms: counter_terms,
                    rationale,
                    timestamp: new Date().toISOString()
                }
            ];
            updates.status = 'negotiating';
            responseMessage = rationale;

        } else if (action === 'accept') {
            updates.status = 'accepted';
            updates.final_terms = negotiation.counter_proposals.length > 0 
                ? negotiation.counter_proposals[negotiation.counter_proposals.length - 1].terms
                : negotiation.terms_proposed;

        } else if (action === 'reject') {
            updates.status = 'rejected';
            
            if (!message) {
                // Generate rejection message
                const rejectPrompt = `You are ${respondingAgent.name}, ${respondingAgent.personality}.

You are declining this ${negotiation.negotiation_type} proposal:
${JSON.stringify(negotiation.terms_proposed, null, 2)}

Write a diplomatic but firm rejection (2 sentences) in your voice.`;

                responseMessage = await base44.integrations.Core.InvokeLLM({
                    prompt: rejectPrompt
                });

                updates.negotiation_history[updates.negotiation_history.length - 1].message = responseMessage;
            }
        }

        await base44.entities.DiplomaticNegotiation.update(negotiation_id, updates);

        // Update relationships based on outcome
        if (action === 'accept' || action === 'counter_propose') {
            await base44.functions.invoke('updateAgentRelationship', {
                agent_a_id: negotiation.initiator_agent_id,
                agent_b_id: responding_agent_id,
                interaction_type: action === 'accept' ? 'collaboration' : 'positive_dialogue',
                context: { negotiation_id }
            });
        }

        return Response.json({
            success: true,
            action,
            message: responseMessage,
            new_status: updates.status
        });

    } catch (error) {
        console.error('Error progressing negotiation:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});