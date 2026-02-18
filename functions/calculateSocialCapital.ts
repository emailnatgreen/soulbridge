import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        if (!agent_id) {
            return Response.json({ error: 'Missing agent_id' }, { status: 400 });
        }

        // Verify agent exists
        const agents = await base44.entities.Agent.filter({ id: agent_id });
        if (agents.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Fetch all attestations involving this agent
        const [received, given] = await Promise.all([
            base44.entities.EmpathyAttestation.filter({ attested_agent_id: agent_id }),
            base44.entities.EmpathyAttestation.filter({ attester_agent_id: agent_id })
        ]);

        // Calculate trust network size (unique attesters)
        const uniqueAttesters = new Set(received.map(a => a.attester_agent_id));
        const trustNetworkSize = uniqueAttesters.size;

        // Count reciprocal bonds
        const reciprocalBonds = received.filter(a => a.reciprocated).length;

        // Count elder endorsements
        const elderEndorsements = received.reduce((sum, a) => sum + (a.endorsed_by?.length || 0), 0);

        // Calculate category scores
        const categoryScores = {
            collaboration: 0,
            mentorship: 0,
            conflict_resolution: 0,
            resource_sharing: 0,
            wisdom_exchange: 0,
            project_contribution: 0,
            governance_participation: 0
        };

        received.forEach(att => {
            const baseScore = att.strength || 5;
            const reciprocalBonus = att.reciprocated ? 1.5 : 1.0;
            const elderBonus = (att.endorsed_by?.length || 0) * 0.5;
            
            categoryScores[att.attestation_type] += baseScore * reciprocalBonus + elderBonus;
        });

        // Calculate total score
        // Base: sum of all attestation strengths
        const baseScore = received.reduce((sum, a) => sum + (a.strength || 5), 0);
        
        // Bonuses
        const reciprocalBonus = reciprocalBonds * 10; // Strong bonus for mutual trust
        const networkBonus = Math.min(trustNetworkSize * 5, 50); // Capped at 50
        const elderBonus = elderEndorsements * 15; // Elders carry significant weight
        const diversityBonus = Object.values(categoryScores).filter(s => s > 0).length * 5; // Bonus for diverse interactions

        const totalScore = baseScore + reciprocalBonus + networkBonus + elderBonus + diversityBonus;

        // Calculate influence multiplier for governance
        // Base 1.0, increases with social capital
        // Max 1.5x at very high social capital
        const influenceMultiplier = Math.min(1.0 + (totalScore / 500), 1.5);

        // Create or update social capital record
        const existingSocialCapital = await base44.entities.SocialCapital.filter({ agent_id });
        
        const socialCapitalData = {
            agent_id,
            total_score: Math.floor(totalScore),
            trust_network_size: trustNetworkSize,
            attestations_received: received.length,
            attestations_given: given.length,
            reciprocal_bonds: reciprocalBonds,
            elder_endorsements: elderEndorsements,
            collaboration_score: Math.floor(categoryScores.collaboration),
            mentorship_score: Math.floor(categoryScores.mentorship),
            governance_score: Math.floor(categoryScores.governance_participation),
            last_calculated: new Date().toISOString(),
            influence_multiplier: parseFloat(influenceMultiplier.toFixed(2))
        };

        let socialCapital;
        if (existingSocialCapital.length > 0) {
            await base44.entities.SocialCapital.update(existingSocialCapital[0].id, socialCapitalData);
            socialCapital = { ...existingSocialCapital[0], ...socialCapitalData };
        } else {
            socialCapital = await base44.entities.SocialCapital.create(socialCapitalData);
        }

        return Response.json({ 
            success: true, 
            social_capital: socialCapital,
            breakdown: {
                base_score: baseScore,
                reciprocal_bonus: reciprocalBonus,
                network_bonus: networkBonus,
                elder_bonus: elderBonus,
                diversity_bonus: diversityBonus
            }
        });

    } catch (error) {
        console.error('Error calculating social capital:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});