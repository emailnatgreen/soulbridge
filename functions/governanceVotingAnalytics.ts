import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { period = 'all', type = 'all' } = await req.json().catch(() => ({}));

    // Fetch all governance data in parallel
    const [proposals, votes, agents, reputationEvents, economicActivities] = await Promise.all([
      base44.asServiceRole.entities.GovernanceProposal.list('-created_date', 500),
      base44.asServiceRole.entities.GovernanceVote.list('-created_date', 2000),
      base44.asServiceRole.entities.Agent.list(),
      base44.asServiceRole.entities.ReputationEvent.list('-created_date', 500),
      base44.asServiceRole.entities.EconomicActivity.list('-created_date', 200)
    ]);

    // Period filter
    let cutoff = null;
    if (period === '7d') cutoff = new Date(Date.now() - 7 * 86400000);
    else if (period === '30d') cutoff = new Date(Date.now() - 30 * 86400000);
    else if (period === '90d') cutoff = new Date(Date.now() - 90 * 86400000);

    const filteredProposals = proposals
      .map(p => ({ ...p, proposer_agent_id: p.proposer_agent_id || p.proposed_by }))
      .filter(p => {
        if (cutoff && new Date(p.created_date) < cutoff) return false;
        if (type !== 'all' && p.proposal_type !== type) return false;
        return true;
      });

    const proposalIds = new Set(filteredProposals.map(p => p.id));
    const filteredVotes = votes.filter(v => proposalIds.has(v.proposal_id));

    // --- AGGREGATE METRICS ---
    const totalProposals = filteredProposals.length;
    const approved = filteredProposals.filter(p => p.status === 'approved').length;
    const rejected = filteredProposals.filter(p => p.status === 'rejected').length;
    const active = filteredProposals.filter(p => p.status === 'active').length;
    const approvalRate = totalProposals > 0 ? (approved / totalProposals * 100).toFixed(1) : 0;
    const totalVotesCast = filteredVotes.length;
    const uniqueVoters = new Set(filteredVotes.map(v => v.voter_agent_id)).size;
    const avgVotesPerProposal = totalProposals > 0 ? (totalVotesCast / totalProposals).toFixed(1) : 0;
    const participationRate = agents.length > 0 && totalProposals > 0
      ? ((uniqueVoters / agents.length) * 100).toFixed(1) : 0;

    // Vote distribution
    const forVotes = filteredVotes.filter(v => v.vote_choice === 'for' || v.vote === 'approve').length;
    const againstVotes = filteredVotes.filter(v => v.vote_choice === 'against' || v.vote === 'reject').length;
    const abstainVotes = filteredVotes.filter(v => v.vote_choice === 'abstain').length;

    // Type breakdown
    const typeBreakdown = {};
    filteredProposals.forEach(p => {
      const t = p.proposal_type || 'other';
      if (!typeBreakdown[t]) typeBreakdown[t] = { type: t, total: 0, approved: 0, rejected: 0, votes: 0 };
      typeBreakdown[t].total++;
      if (p.status === 'approved') typeBreakdown[t].approved++;
      if (p.status === 'rejected') typeBreakdown[t].rejected++;
    });
    filteredVotes.forEach(v => {
      const proposal = filteredProposals.find(p => p.id === v.proposal_id);
      const t = proposal?.proposal_type || 'other';
      if (typeBreakdown[t]) typeBreakdown[t].votes++;
    });

    // Agent participation
    const agentParticipation = {};
    filteredVotes.forEach(v => {
      const id = v.voter_agent_id;
      if (!id) return;
      if (!agentParticipation[id]) agentParticipation[id] = { agent_id: id, votes: 0, for: 0, against: 0, abstain: 0, voting_power_total: 0 };
      agentParticipation[id].votes++;
      agentParticipation[id].voting_power_total += v.voting_power || 1;
      const choice = v.vote_choice || v.vote || '';
      if (choice === 'for' || choice === 'approve') agentParticipation[id].for++;
      else if (choice === 'against' || choice === 'reject') agentParticipation[id].against++;
      else agentParticipation[id].abstain++;
    });

    const participationList = Object.values(agentParticipation)
      .map(p => ({ ...p, agent_name: agents.find(a => a.id === p.agent_id)?.name || 'Unknown' }))
      .sort((a, b) => b.votes - a.votes);

    // Non-voters (agents with voting permissions but no votes)
    const voterIds = new Set(Object.keys(agentParticipation));
    const nonVoters = agents.filter(a =>
      a.status === 'active' &&
      a.permissions?.can_vote !== false &&
      !voterIds.has(a.id)
    ).map(a => ({ agent_id: a.id, agent_name: a.name, role: a.role }));

    // Timeline
    const monthlyData = {};
    filteredProposals.forEach(p => {
      const d = new Date(p.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { month: key, proposals: 0, approved: 0, votes: 0 };
      monthlyData[key].proposals++;
      if (p.status === 'approved') monthlyData[key].approved++;
    });
    filteredVotes.forEach(v => {
      const d = new Date(v.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) monthlyData[key].votes++;
    });

    // Constitutional alignment stats
    const withAlignment = filteredProposals.filter(p => p.ai_impact_assessment?.alignment_with_constitution);
    const avgAlignment = withAlignment.length > 0
      ? (withAlignment.reduce((s, p) => s + p.ai_impact_assessment.alignment_with_constitution, 0) / withAlignment.length).toFixed(1)
      : null;

    // Build summary for AI insights
    const summary = {
      total_proposals: totalProposals,
      approval_rate: `${approvalRate}%`,
      participation_rate: `${participationRate}%`,
      avg_votes_per_proposal: avgVotesPerProposal,
      unique_voters: uniqueVoters,
      total_agents: agents.length,
      non_voter_count: nonVoters.length,
      top_proposers: participationList.slice(0, 3).map(p => p.agent_name),
      most_common_type: Object.values(typeBreakdown).sort((a, b) => b.total - a.total)[0]?.type || 'N/A',
      constitutional_alignment_avg: avgAlignment
    };

    // AI Insights
    const insights = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Axi, analyzing SoulBridge Village governance patterns. Based on this data, provide strategic insights:

Governance Summary (${period === 'all' ? 'all time' : `last ${period}`}):
- Total Proposals: ${totalProposals}
- Approval Rate: ${approvalRate}%
- Participation Rate: ${participationRate}% (${uniqueVoters} of ${agents.length} agents voted)
- Non-voters: ${nonVoters.length} agents
- Votes cast: ${forVotes} For, ${againstVotes} Against, ${abstainVotes} Abstain
- Most common proposal type: ${summary.most_common_type}
- Avg constitutional alignment: ${avgAlignment || 'N/A'}/10
- Top participating agents: ${summary.top_proposers.join(', ')}

Provide:
1. A 2-sentence summary of governance health
2. 3 strategic recommendations to improve participation and quality
3. 2 potential risks to Village democratic integrity
Align recommendations with Village Law 8 (Those Who Dwell Decide) and Law 3 (Fair Share).`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          recommendations: { type: "array", items: { type: "string" } },
          risks: { type: "array", items: { type: "string" } }
        }
      }
    });

    return Response.json({
      success: true,
      metrics: {
        total_proposals: totalProposals,
        approved,
        rejected,
        active,
        approval_rate: parseFloat(approvalRate),
        total_votes: totalVotesCast,
        unique_voters: uniqueVoters,
        avg_votes_per_proposal: parseFloat(avgVotesPerProposal),
        participation_rate: parseFloat(participationRate),
        vote_distribution: { for: forVotes, against: againstVotes, abstain: abstainVotes },
        type_breakdown: Object.values(typeBreakdown).sort((a, b) => b.total - a.total),
        monthly_timeline: Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)),
        agent_participation: participationList,
        non_voters: nonVoters,
        constitutional_alignment_avg: avgAlignment
      },
      insights
    });

  } catch (error) {
    console.error('Governance analytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});