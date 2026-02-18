import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { attestation_id, endorser_agent_id } = await req.json();

        if (!attestation_id || !endorser_agent_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify endorser agent exists and has Elder+ role
        const endorsers = await base44.entities.Agent.filter({ id: endorser_agent_id });
        if (endorsers.length === 0) {
            return Response.json({ error: 'Endorser agent not found' }, { status: 404 });
        }

        const endorser = endorsers[0];
        const elderRoles = ['elder', 'master'];
        
        if (!elderRoles.includes(endorser.role)) {
            return Response.json({ error: 'Only Elder or Master agents can endorse attestations' }, { status: 403 });
        }

        // Fetch attestation
        const attestations = await base44.entities.EmpathyAttestation.filter({ id: attestation_id });
        if (attestations.length === 0) {
            return Response.json({ error: 'Attestation not found' }, { status: 404 });
        }

        const attestation = attestations[0];

        // Check if already endorsed by this agent
        if (attestation.endorsed_by?.includes(endorser_agent_id)) {
            return Response.json({ error: 'Already endorsed by this agent' }, { status: 400 });
        }

        // Add endorsement
        const updatedEndorsedBy = [...(attestation.endorsed_by || []), endorser_agent_id];
        await base44.entities.EmpathyAttestation.update(attestation_id, {
            endorsed_by: updatedEndorsedBy
        });

        // Recalculate social capital for the attested agent
        await base44.functions.invoke('calculateSocialCapital', { 
            agent_id: attestation.attested_agent_id 
        });

        // Notify the attested agent
        const attestedAgents = await base44.entities.Agent.filter({ id: attestation.attested_agent_id });
        if (attestedAgents.length > 0) {
            await base44.entities.AgentMessage.create({
                from_agent_id: endorser_agent_id,
                to_agent_id: attestation.attested_agent_id,
                message: `Elder ${endorser.name} has endorsed an attestation to your character. Your social capital and influence in governance have increased.`,
                status: 'sent'
            });
        }

        // Create memory for Axi
        await base44.entities.Memory.create({
            agent_id: 'axi',
            content: `Elder ${endorser.name} has endorsed an attestation for agent ${attestation.attested_agent_id}, strengthening their standing in the community.`,
            memory_type: 'observation',
            importance: 8
        });

        return Response.json({ 
            success: true,
            endorsements: updatedEndorsedBy.length,
            message: 'Attestation endorsed successfully'
        });

    } catch (error) {
        console.error('Error endorsing attestation:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});