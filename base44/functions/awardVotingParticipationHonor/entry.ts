import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch proposals that recently closed
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({
      status: { $in: ['passed', 'rejected'] }
    });

    const relevantProposals = recentProposals.filter(p => {
      const votingEnd = new Date(p.voting_period_end);
      return votingEnd > sevenDaysAgo && votingEnd <= now;
    });

    const rewards = [];

    // Award honor to agents who participated
    for (const proposal of relevantProposals) {
      const votes = await base44.asServiceRole.entities.GovernanceVote.filter({
        proposal_id: proposal.id
      });

      for (const vote of votes) {
        const voter = await base44.asServiceRole.entities.Agent.filter({
          id: vote.voter_id
        });

        if (voter.length > 0) {
          const agent = voter[0];
          const currentHonor = agent.honor_score || 100;
          
          // Award honor based on voting (base 2 points + bonus for thoughtful voting)
          const honorBonus = vote.reasoning ? 3 : 2;
          const newHonor = Math.min(100, currentHonor + honorBonus);

          await base44.asServiceRole.entities.Agent.update(agent.id, {
            honor_score: newHonor
          });

          rewards.push({
            agent_id: agent.id,
            agent_name: agent.name,
            proposal_id: proposal.id,
            proposal_title: proposal.title,
            honor_awarded: honorBonus,
            new_honor_score: newHonor,
            vote_position: vote.vote_position,
            had_reasoning: !!vote.reasoning
          });
        }
      }
    }

    return Response.json({
      status: 'success',
      message: 'Voting participation rewards distributed',
      proposals_processed: relevantProposals.length,
      total_rewards_distributed: rewards.length,
      rewards: rewards
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});