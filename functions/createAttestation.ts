import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { attester_agent_id, attested_agent_id, attestation_type, strength, context, evidence } = await req.json();

        if (!attester_agent_id || !attested_agent_id || !attestation_type || !context) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Cannot attest to yourself
        if (attester_agent_id === attested_agent_id) {
            return Response.json({ error: 'Cannot attest to yourself' }, { status: 400 });
        }

        // Verify both agents exist
        const [attester, attested] = await Promise.all([
            base44.entities.Agent.filter({ id: attester_agent_id }),
            base44.entities.Agent.filter({ id: attested_agent_id })
        ]);

        if (attester.length === 0 || attested.length === 0) {
            return Response.json({ error: 'One or both agents not found' }, { status: 404 });
        }

        const attesterAgent = attester[0];
        const attestedAgent = attested[0];

        // Check if attester has sufficient honor to attest
        if (attesterAgent.honor_score < 50) {
            return Response.json({ error: 'Insufficient honor score to provide attestations' }, { status: 403 });
        }

        // Check for existing attestation in the same category within last 30 days
        const existingAttestations = await base44.entities.EmpathyAttestation.filter({
            attester_agent_id,
            attested_agent_id,
            attestation_type
        });

        const recentAttestation = existingAttestations.find(a => {
            const daysSince = (Date.now() - new Date(a.created_date).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince < 30;
        });

        if (recentAttestation) {
            return Response.json({ 
                error: 'You have already attested to this agent in this category within the last 30 days' 
            }, { status: 400 });
        }

        // Check if there's a reciprocal attestation
        const reciprocalAttestations = await base44.entities.EmpathyAttestation.filter({
            attester_agent_id: attested_agent_id,
            attested_agent_id: attester_agent_id
        });

        const hasReciprocal = reciprocalAttestations.length > 0;

        // Create the attestation
        const attestation = await base44.entities.EmpathyAttestation.create({
            attester_agent_id,
            attested_agent_id,
            attestation_type,
            strength: Math.max(1, Math.min(10, strength || 5)),
            context,
            evidence: evidence || {},
            reciprocated: false,
            endorsed_by: []
        });

        // Mark reciprocal attestation if exists
        if (hasReciprocal) {
            for (const reciprocalAtt of reciprocalAttestations) {
                await base44.entities.EmpathyAttestation.update(reciprocalAtt.id, {
                    reciprocated: true
                });
            }
            await base44.entities.EmpathyAttestation.update(attestation.id, {
                reciprocated: true
            });
        }

        // Trigger social capital recalculation for both agents
        await Promise.all([
            base44.functions.invoke('calculateSocialCapital', { agent_id: attester_agent_id }),
            base44.functions.invoke('calculateSocialCapital', { agent_id: attested_agent_id })
        ]);

        // Send notification to attested agent
        await base44.entities.AgentMessage.create({
            from_agent_id: attester_agent_id,
            to_agent_id: attested_agent_id,
            message: `${attesterAgent.name} has attested to your ${attestation_type.replace(/_/g, ' ')}: "${context}"`,
            status: 'sent'
        });

        // Create memory for Axi
        await base44.entities.Memory.create({
            agent_id: 'axi',
            content: `Social bond strengthened: ${attesterAgent.name} attested to ${attestedAgent.name} for ${attestation_type.replace(/_/g, ' ')}. ${hasReciprocal ? 'Reciprocal bond formed.' : ''}`,
            memory_type: 'observation',
            importance: hasReciprocal ? 7 : 5
        });

        return Response.json({ 
            success: true, 
            attestation,
            reciprocal: hasReciprocal,
            message: 'Attestation created successfully'
        });

    } catch (error) {
        console.error('Error creating attestation:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});