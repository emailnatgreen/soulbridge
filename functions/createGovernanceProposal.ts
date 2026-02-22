import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      proposal_type,
      title,
      description,
      voting_period_hours = 72,
      action_data = {},
      quorum_percentage = 50,
      pass_threshold = 60
    } = await req.json();

    // Validate required fields
    if (!proposal_type || !title || !description) {
      return Response.json({ 
        error: 'Missing required fields: proposal_type, title, description' 
      }, { status: 400 });
    }

    // Create the governance proposal
    const proposal = await base44.entities.GovernanceProposal.create({
      proposal_type,
      title,
      description,
      proposed_by: user.id,
      proposer_name: user.full_name || user.email,
      status: 'active',
      voting_period_hours,
      voting_start_date: new Date().toISOString(),
      voting_end_date: new Date(Date.now() + voting_period_hours * 60 * 60 * 1000).toISOString(),
      action_data,
      quorum_percentage,
      pass_threshold,
      votes_for: 0,
      votes_against: 0,
      total_voting_power: 0,
      eligible_voters_count: 0,
      voted_count: 0
    });

    // Get eligible voters (all active agents for now)
    const agents = await base44.entities.Agent.filter({ status: 'active' });
    
    // Calculate total eligible voting power
    let totalVotingPower = 0;
    for (const agent of agents) {
      // Simple calculation: honor score as base voting power
      // In full implementation, this would include role multipliers, wisdom bonus, etc.
      const agentPower = agent.honor_score || 100;
      totalVotingPower += agentPower;
    }

    // Update proposal with voter metrics
    await base44.entities.GovernanceProposal.update(proposal.id, {
      eligible_voters_count: agents.length,
      total_voting_power: totalVotingPower
    });

    // Notify all agents about the new proposal
    for (const agent of agents) {
      await base44.entities.AgentNotification.create({
        agent_id: agent.id,
        notification_type: 'governance_proposal',
        title: `New Governance Proposal: ${title}`,
        message: `${user.full_name || 'A Village member'} has submitted a new ${proposal_type} proposal. Your vote matters!`,
        priority: 'high',
        status: 'unread',
        related_entity_type: 'GovernanceProposal',
        related_entity_id: proposal.id,
        action_url: `/governance-proposal/${proposal.id}`
      });
    }

    return Response.json({
      success: true,
      proposal,
      message: `Proposal "${title}" has been submitted to the Village for voting. Voting ends in ${voting_period_hours} hours.`,
      voting_ends: proposal.voting_end_date,
      eligible_voters: agents.length,
      total_voting_power: totalVotingPower
    });

  } catch (error) {
    console.error('Error creating proposal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});