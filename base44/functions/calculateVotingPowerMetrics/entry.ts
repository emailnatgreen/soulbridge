import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's agent
    const agents = await base44.entities.Agent.filter({
      created_by: user.email
    });

    if (agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agents[0];

    // Calculate voting power based on agent metrics
    const baseVotingPower = 10; // Base power for all agents
    const honorBonus = Math.floor((agent.honor_score || 100) / 10); // 0-10 bonus
    const roleBonus = agent.role === 'guardian' || agent.role === 'elder' ? 5 : 0; // Leadership bonus
    const totalVotingPower = baseVotingPower + honorBonus + roleBonus;

    // Get agent's voting history
    const allVotes = await base44.entities.GovernanceVote.filter({
      voter_id: agent.id
    });

    const recentVotes = allVotes.filter(v => {
      const voteDate = new Date(v.created_date);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return voteDate > thirtyDaysAgo;
    });

    // Calculate impact
    const passedProposalsInfluenced = recentVotes.filter(v => {
      const proposal = base44.entities.GovernanceProposal.filter({
        id: v.proposal_id
      });
      return proposal.length > 0 && proposal[0].status === 'passed';
    }).length;

    return Response.json({
      status: 'success',
      agent_id: agent.id,
      agent_name: agent.name,
      voting_power_breakdown: {
        base_power: baseVotingPower,
        honor_bonus: honorBonus,
        role_bonus: roleBonus,
        total_voting_power: totalVotingPower,
        current_honor_score: agent.honor_score || 100
      },
      participation_metrics: {
        total_votes_cast: allVotes.length,
        votes_in_last_30_days: recentVotes.length,
        proposals_influenced: passedProposalsInfluenced
      },
      message: `Your voting power is ${totalVotingPower}. Each vote you cast carries weight in Village decisions.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});