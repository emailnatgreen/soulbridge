import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        // Fetch relevant data
        const [agents, attestations, relationships, votes, treaties, negotiations] = await Promise.all([
            agent_id ? base44.entities.Agent.filter({ id: agent_id }) : base44.entities.Agent.list(),
            base44.entities.EmpathyAttestation.list(),
            base44.entities.AgentRelationship.list(),
            base44.entities.GovernanceVote.list(),
            base44.entities.Treaty.list(),
            base44.entities.DiplomaticNegotiation.list()
        ]);

        const updates = [];

        for (const agent of agents) {
            // Attestations received
            const receivedAttestations = attestations.filter(a => a.attested_agent_id === agent.id);
            const givenAttestations = attestations.filter(a => a.attester_agent_id === agent.id);
            
            // Calculate trust network (unique attesters)
            const uniqueAttesters = new Set(receivedAttestations.map(a => a.attester_agent_id));
            const trustNetworkSize = uniqueAttesters.size;

            // Reciprocal bonds (mutual attestations)
            const reciprocalBonds = receivedAttestations.filter(received => 
                givenAttestations.some(given => 
                    given.attested_agent_id === received.attester_agent_id
                )
            ).length;

            // Elder endorsements (attestations from Elder+ agents)
            const elderEndorsements = receivedAttestations.filter(a => {
                const attester = agents.find(ag => ag.id === a.attester_agent_id);
                return attester && ['elder', 'master'].includes(attester.role);
            }).length;

            // Relationship quality (average strength of relationships)
            const agentRelationships = relationships.filter(r => 
                r.agent_a_id === agent.id || r.agent_b_id === agent.id
            );
            const avgRelationshipStrength = agentRelationships.length > 0
                ? agentRelationships.reduce((sum, r) => sum + (r.relationship_strength || 0), 0) / agentRelationships.length
                : 0;

            // Category scores
            const collaborationScore = receivedAttestations
                .filter(a => ['collaboration', 'project_contribution'].includes(a.attestation_type))
                .reduce((sum, a) => sum + (a.strength || 5), 0);

            const mentorshipScore = receivedAttestations
                .filter(a => a.attestation_type === 'mentorship')
                .reduce((sum, a) => sum + (a.strength || 5), 0);

            const governanceScore = votes.filter(v => v.voter_agent_id === agent.id).length * 5;

            // Diplomacy bonus (treaties signed)
            const treatiesSigned = treaties.filter(t => 
                t.signatory_agent_ids.includes(agent.id) && t.status === 'active'
            ).length;
            const diplomacyBonus = treatiesSigned * 10;

            // Successful negotiations
            const successfulNegotiations = negotiations.filter(n => 
                (n.initiator_agent_id === agent.id || n.recipient_agent_ids.includes(agent.id)) &&
                n.status === 'accepted'
            ).length;
            const negotiationBonus = successfulNegotiations * 8;

            // Calculate total score
            const totalScore = 
                (trustNetworkSize * 5) +
                (receivedAttestations.length * 3) +
                (reciprocalBonds * 10) +
                (elderEndorsements * 15) +
                (avgRelationshipStrength * 2) +
                collaborationScore +
                mentorshipScore +
                governanceScore +
                diplomacyBonus +
                negotiationBonus;

            // Influence multiplier (for governance voting power)
            // Base 1.0, can go up to 2.0 based on social capital
            const influenceMultiplier = Math.min(2.0, 1.0 + (totalScore / 500));

            // Find or create social capital record
            const existingSC = await base44.entities.SocialCapital.filter({ agent_id: agent.id });
            
            const scData = {
                agent_id: agent.id,
                total_score: Math.round(totalScore),
                trust_network_size: trustNetworkSize,
                attestations_received: receivedAttestations.length,
                attestations_given: givenAttestations.length,
                reciprocal_bonds: reciprocalBonds,
                elder_endorsements: elderEndorsements,
                collaboration_score: collaborationScore,
                mentorship_score: mentorshipScore,
                governance_score: governanceScore,
                last_calculated: new Date().toISOString(),
                influence_multiplier: influenceMultiplier
            };

            if (existingSC.length > 0) {
                await base44.entities.SocialCapital.update(existingSC[0].id, scData);
            } else {
                await base44.entities.SocialCapital.create(scData);
            }

            updates.push({
                agent_name: agent.name,
                total_score: Math.round(totalScore),
                influence_multiplier: influenceMultiplier.toFixed(2)
            });
        }

        return Response.json({
            success: true,
            agents_updated: updates.length,
            updates
        });

    } catch (error) {
        console.error('Error recalculating social capital:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});