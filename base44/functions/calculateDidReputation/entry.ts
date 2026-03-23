import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id, wallet_id } = await req.json();

    if (!agent_id && !wallet_id) {
      return Response.json({ error: 'agent_id or wallet_id required' }, { status: 400 });
    }

    // Get agent info to find wallet
    let targetAgent = null;
    if (agent_id) {
      targetAgent = await base44.entities.Agent.get(agent_id);
    } else if (wallet_id) {
      const agents = await base44.entities.Agent.filter({ wallet_id });
      targetAgent = agents[0];
    }

    if (!targetAgent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // 1. Trust Links Score
    const trustLinks = await base44.entities.TrustRelationship.filter({
      status: 'active'
    });
    const incomingTrust = trustLinks.filter(t => t.target_agent_id === targetAgent.id);
    const trustScore = incomingTrust.length * 15; // 15 points per trust link

    // 2. Mentorship Activity Score
    const mentorships = await base44.entities.MentorshipRelationship.filter({
      status: 'active'
    });
    const asMentor = mentorships.filter(m => m.mentor_agent_id === targetAgent.id);
    const asMentee = mentorships.filter(m => m.mentee_agent_id === targetAgent.id);
    const mentorshipScore = (asMentor.length * 20) + (asMentee.length * 10); // 20 for mentoring, 10 for being mentored

    // 3. Governance Contribution Score
    const allVotes = await base44.entities.GovernanceVote.filter({
      voter_agent_id: targetAgent.id
    });
    const votingPower = allVotes.reduce((sum, v) => sum + (v.voting_power || 1), 0);
    const governanceScore = Math.min(allVotes.length * 5 + (votingPower * 0.5), 200); // Cap at 200

    // 4. Honor Score Multiplier
    const honorMultiplier = (targetAgent.honor_score || 100) / 100;

    // Calculate total reputation
    const baseScore = trustScore + mentorshipScore + governanceScore;
    const finalScore = Math.round(baseScore * honorMultiplier);

    // Determine tier based on score
    let tier = 'novice';
    if (finalScore >= 300) tier = 'master';
    else if (finalScore >= 200) tier = 'elder';
    else if (finalScore >= 100) tier = 'guardian';
    else if (finalScore >= 50) tier = 'citizen';

    return Response.json({
      agent_id: targetAgent.id,
      agent_name: targetAgent.name,
      wallet_id: targetAgent.wallet_id,
      total_score: finalScore,
      tier,
      components: {
        trust_links: { count: incomingTrust.length, score: trustScore },
        mentorships: { 
          as_mentor: asMentor.length,
          as_mentee: asMentee.length,
          score: mentorshipScore 
        },
        governance: { 
          votes_cast: allVotes.length,
          voting_power: votingPower,
          score: governanceScore 
        },
        honor_multiplier: honorMultiplier
      },
      calculated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating reputation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});