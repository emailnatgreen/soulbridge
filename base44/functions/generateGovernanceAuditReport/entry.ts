import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all proposals from last 30 days
    const allProposals = await base44.asServiceRole.entities.GovernanceProposal.list();
    const recentProposals = allProposals.filter(p => new Date(p.created_date) > thirtyDaysAgo);

    // Fetch all votes
    const allVotes = await base44.asServiceRole.entities.GovernanceVote.list();
    const recentVotes = allVotes.filter(v => new Date(v.created_date) > thirtyDaysAgo);

    // Aggregate metrics
    const completedProposals = recentProposals.filter(p => p.status !== 'active');
    const passedCount = completedProposals.filter(p => p.status === 'passed').length;
    const rejectedCount = completedProposals.filter(p => p.status === 'rejected').length;

    const uniqueVoters = new Set(recentVotes.map(v => v.voter_id)).size;
    const agents = await base44.asServiceRole.entities.Agent.filter({
      status: 'active'
    });
    const participationRate = agents.length > 0 ? ((uniqueVoters / agents.length) * 100).toFixed(1) : 0;

    // Proposal type distribution
    const typeDistribution = {};
    recentProposals.forEach(p => {
      typeDistribution[p.proposal_type] = (typeDistribution[p.proposal_type] || 0) + 1;
    });

    // Honor impact analysis
    const honorChanges = [];
    const agentUpdates = await base44.asServiceRole.entities.Agent.list();
    const avgHonor = agentUpdates.reduce((sum, a) => sum + (a.honor_score || 100), 0) / agentUpdates.length;

    // Constitutional alignment check
    const proposalsWithAlignment = recentProposals.filter(p => 
      p.constitutional_alignment && p.constitutional_alignment.length > 0
    ).length;

    const auditReport = {
      report_date: new Date().toISOString(),
      period: '30 days',
      summary: {
        total_proposals: recentProposals.length,
        completed_proposals: completedProposals.length,
        passed: passedCount,
        rejected: rejectedCount,
        approval_rate: completedProposals.length > 0 
          ? ((passedCount / completedProposals.length) * 100).toFixed(1) + '%'
          : 'N/A'
      },
      participation: {
        unique_voters: uniqueVoters,
        total_votes_cast: recentVotes.length,
        participation_rate: participationRate + '%',
        average_votes_per_proposal: completedProposals.length > 0 
          ? (recentVotes.length / completedProposals.length).toFixed(1)
          : 0
      },
      proposal_types: typeDistribution,
      constitutional_health: {
        proposals_with_alignment: proposalsWithAlignment,
        alignment_coverage: recentProposals.length > 0
          ? ((proposalsWithAlignment / recentProposals.length) * 100).toFixed(1) + '%'
          : '0%'
      },
      community_health: {
        average_honor_score: avgHonor.toFixed(1),
        active_agents: agents.length
      },
      recommendations: [
        uniqueVoters < agents.length * 0.3 ? '📉 Voter participation is below 30%—consider Phase 1 reminder automations' : '✅ Healthy participation rates',
        proposalsWithAlignment < recentProposals.length * 0.8 ? '⚠️ Less than 80% of proposals have constitutional alignment—strengthen requirements' : '✅ Strong constitutional alignment',
        rejectedCount > passedCount ? '⚠️ More proposals rejected than passed—review proposal quality' : '✅ Balanced pass/reject ratio'
      ]
    };

    return Response.json({
      status: 'success',
      audit_report: auditReport
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});