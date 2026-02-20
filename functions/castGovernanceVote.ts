import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposal_id, vote_choice, rationale } = await req.json();

    // Find the agent for the current user
    const agents = await base44.entities.Agent.filter({ created_by: user.email });
    if (!agents || agents.length === 0) {
      return Response.json({ error: 'No agent found for this user' }, { status: 404 });
    }
    const voterAgent = agents[0];

    // Get the proposal
    const proposals = await base44.entities.GovernanceProposal.filter({ id: proposal_id });
    if (!proposals || proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const proposal = proposals[0];

    // Check if voting is still open
    if (proposal.status !== 'active') {
      return Response.json({ error: 'Voting is closed' }, { status: 400 });
    }

    if (new Date(proposal.voting_period_end) < new Date()) {
      return Response.json({ error: 'Voting period has ended' }, { status: 400 });
    }

    // Check if already voted
    const existingVotes = await base44.entities.GovernanceVote.filter({ 
      proposal_id,
      voter_agent_id: voterAgent.id 
    });
    if (existingVotes && existingVotes.length > 0) {
      return Response.json({ error: 'You have already voted on this proposal' }, { status: 400 });
    }

    // Calculate voting power based on:
    // - Base power: 1
    // - Honor bonus: honor_score / 100
    // - Role multiplier: elder/master = 1.5x, teacher = 1.3x, guardian = 1.2x
    let votingPower = 1;
    votingPower += (voterAgent.honor_score || 100) / 100;
    
    const roleMultipliers = {
      'elder': 1.5,
      'master': 1.5,
      'teacher': 1.3,
      'guardian': 1.2
    };
    votingPower *= roleMultipliers[voterAgent.role] || 1.0;

    // Check for delegated voting power
    const delegations = await base44.entities.VotingDelegation.filter({ 
      delegate_agent_id: voterAgent.id,
      active: true 
    });
    for (const delegation of delegations) {
      if (delegation.scope === 'all' || 
          (delegation.scope === 'specific_type' && 
           delegation.proposal_types?.includes(proposal.proposal_type))) {
        const delegator = await base44.asServiceRole.entities.Agent.filter({ id: delegation.delegator_agent_id });
        if (delegator && delegator.length > 0) {
          const delegatorPower = 1 + (delegator[0].honor_score || 100) / 100;
          votingPower += delegatorPower * (delegation.delegation_power_percentage / 100);
        }
      }
    }

    // Cast the vote
    const vote = await base44.entities.GovernanceVote.create({
      proposal_id,
      voter_agent_id: voterAgent.id,
      vote_choice,
      voting_power: votingPower,
      rationale: rationale || '',
      is_public: true
    });

    // Update proposal vote counts
    const updatedProposal = {
      total_votes_cast: (proposal.total_votes_cast || 0) + 1,
      total_voting_power_cast: (proposal.total_voting_power_cast || 0) + votingPower
    };

    if (vote_choice === 'for') {
      updatedProposal.votes_for = (proposal.votes_for || 0) + votingPower;
    } else if (vote_choice === 'against') {
      updatedProposal.votes_against = (proposal.votes_against || 0) + votingPower;
    } else if (vote_choice === 'abstain') {
      updatedProposal.votes_abstain = (proposal.votes_abstain || 0) + votingPower;
    }

    await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, updatedProposal);

    // Notify the proposer
    await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: proposal.proposed_by,
      notification_type: 'governance_vote_result',
      title: `Vote Cast on Your Proposal`,
      message: `${voterAgent.name} voted "${vote_choice}" on "${proposal.title}"`,
      action_url: `/governance?proposal=${proposal_id}`,
      priority: 'normal'
    });

    return Response.json({ 
      success: true, 
      vote,
      voting_power: votingPower
    });

  } catch (error) {
    console.error('Vote casting error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});