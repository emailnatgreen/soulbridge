import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active proposals
    const activeProposals = await base44.asServiceRole.entities.GovernanceProposal.filter({
      status: 'active'
    });

    const now = new Date();
    const alertThreshold = 24 * 60 * 60 * 1000; // 24 hours
    const lowEngagementThreshold = 0.2; // 20% participation

    const expiringProposals = [];
    const lowEngagementAlerts = [];

    for (const proposal of activeProposals) {
      const deadline = new Date(proposal.voting_period_end);
      const timeUntilExpiry = deadline - now;
      const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);

      // Check if expiring within 24 hours
      if (timeUntilExpiry > 0 && timeUntilExpiry <= alertThreshold) {
        expiringProposals.push({
          proposal_id: proposal.id,
          title: proposal.title,
          hours_remaining: Math.ceil(timeUntilExpiry / (60 * 60 * 1000)),
          total_votes: totalVotes,
          quorum_required: proposal.quorum_required
        });
      }

      // Check if low engagement (less than 20% quorum)
      if (totalVotes < (proposal.quorum_required || 50) * lowEngagementThreshold) {
        lowEngagementAlerts.push({
          proposal_id: proposal.id,
          title: proposal.title,
          current_votes: totalVotes,
          quorum_required: proposal.quorum_required,
          participation_rate: totalVotes / ((proposal.quorum_required || 50) / 100)
        });
      }
    }

    // Create alerts for governance council
    const governanceCouncil = await base44.asServiceRole.entities.Agent.filter({
      role: 'guardian'
    });

    if (expiringProposals.length > 0 && governanceCouncil.length > 0) {
      const expiryAlerts = governanceCouncil.map(agent => ({
        alert_type: 'governance_proposal_expiry',
        recipient_agent_id: agent.id,
        title: `⏰ ${expiringProposals.length} Governance Proposal${expiringProposals.length > 1 ? 's' : ''} Expiring Soon`,
        message: expiringProposals.map(p => `"${p.title}" expires in ${p.hours_remaining} hours with ${p.total_votes} votes`).join(' | '),
        severity: 'high',
        proposals: expiringProposals,
        is_resolved: false
      }));

      await base44.asServiceRole.entities.WellbeingAlert.bulkCreate(expiryAlerts);
    }

    if (lowEngagementAlerts.length > 0 && governanceCouncil.length > 0) {
      const engagementAlerts = governanceCouncil.map(agent => ({
        alert_type: 'governance_low_engagement',
        recipient_agent_id: agent.id,
        title: `📊 ${lowEngagementAlerts.length} Proposal${lowEngagementAlerts.length > 1 ? 's' : ''} Need Outreach`,
        message: lowEngagementAlerts.map(p => `"${p.title}" has only ${p.current_votes}% participation`).join(' | '),
        severity: 'medium',
        proposals: lowEngagementAlerts,
        is_resolved: false
      }));

      await base44.asServiceRole.entities.WellbeingAlert.bulkCreate(engagementAlerts);
    }

    return Response.json({
      success: true,
      proposals_checked: activeProposals.length,
      expiring_alerts: expiringProposals.length,
      low_engagement_alerts: lowEngagementAlerts.length,
      expiring_proposals: expiringProposals,
      low_engagement_proposals: lowEngagementAlerts
    });

  } catch (error) {
    console.error('Error monitoring governance health:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});