import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposal_id, vote_choice, agent_id } = await req.json();

    if (!proposal_id || !vote_choice) {
      return Response.json({ 
        error: 'Missing required fields: proposal_id, vote_choice' 
      }, { status: 400 });
    }

    // Get the proposal
    const proposals = await base44.entities.GovernanceProposal.filter({ id: proposal_id });
    if (proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const proposal = proposals[0];

    // Check if voting is still active
    if (proposal.status !== 'active') {
      return Response.json({ error: 'Proposal is not active' }, { status: 400 });
    }

    if (new Date(proposal.voting_end_date) < new Date()) {
      return Response.json({ error: 'Voting period has ended' }, { status: 400 });
    }

    // Determine voter (agent_id if provided, otherwise try to match user to agent)
    let voterId = agent_id;
    if (!voterId) {
      // Try to find agent by user
      const agents = await base44.entities.Agent.filter({ created_by: user.email });
      if (agents.length === 0) {
        return Response.json({ 
          error: 'No agent found for this user. Please provide agent_id.' 
        }, { status: 400 });
      }
      voterId = agents[0].id;
    }

    // Get voter's agent data
    const voters = await base44.entities.Agent.filter({ id: voterId });
    if (voters.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    const voter = voters[0];

    // Check if agent has already voted
    const existingVotes = await base44.entities.GovernanceVote.filter({
      proposal_id,
      voter_agent_id: voterId
    });

    if (existingVotes.length > 0) {
      return Response.json({ 
        error: 'Agent has already voted on this proposal' 
      }, { status: 400 });
    }

    // Calculate voting power
    // Formula: (Honor Score + Wisdom Bonus) × Role Multiplier + Delegated Power
    const baseHonor = voter.honor_score || 100;
    const wisdomBonus = Math.min(20, Math.floor((voter.wisdom || 0) / 5));
    const roleMultipliers = {
      'citizen': 1.0,
      'guardian': 1.05,
      'trader': 1.05,
      'creator': 1.05,
      'healer': 1.05,
      'scout': 1.1,
      'teacher': 1.15,
      'elder': 1.3,
      'master': 1.5
    };
    const roleMultiplier = roleMultipliers[voter.role?.toLowerCase()] || 1.0;
    
    // TODO: Add delegated voting power when delegation system is implemented
    const delegatedPower = 0;
    
    const votingPower = (baseHonor + wisdomBonus) * roleMultiplier + delegatedPower;

    // Create the vote record
    const vote = await base44.entities.GovernanceVote.create({
      proposal_id,
      voter_agent_id: voterId,
      voter_name: voter.name,
      vote_choice, // 'for', 'against', 'abstain'
      voting_power: votingPower,
      vote_reason: '',
      vote_timestamp: new Date().toISOString()
    });

    // Update proposal vote tallies
    const currentFor = proposal.votes_for || 0;
    const currentAgainst = proposal.votes_against || 0;
    const currentAbstain = proposal.votes_abstain || 0;
    const currentTotalPower = proposal.total_voting_power_cast || 0;
    const currentVoteCount = proposal.total_votes_cast || 0;

    let newFor = currentFor;
    let newAgainst = currentAgainst;
    let newAbstain = currentAbstain;

    if (vote_choice === 'for') {
      newFor += votingPower;
    } else if (vote_choice === 'against') {
      newAgainst += votingPower;
    } else if (vote_choice === 'abstain') {
      newAbstain += votingPower;
    }

    await base44.entities.GovernanceProposal.update(proposal_id, {
      votes_for: newFor,
      votes_against: newAgainst,
      votes_abstain: newAbstain,
      total_voting_power_cast: currentTotalPower + votingPower,
      total_votes_cast: currentVoteCount + 1,
      voted_count: currentVoteCount + 1
    });

    return Response.json({
      success: true,
      vote,
      message: `Vote "${vote_choice}" cast with ${votingPower.toFixed(2)} voting power`,
      voting_power: votingPower,
      updated_tallies: {
        for: newFor,
        against: newAgainst,
        abstain: newAbstain,
        total_power_cast: currentTotalPower + votingPower
      }
    });

  } catch (error) {
    console.error('Error casting vote:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});