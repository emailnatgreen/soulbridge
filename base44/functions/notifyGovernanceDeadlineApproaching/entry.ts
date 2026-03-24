import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active governance proposals
    const proposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ 
      status: 'active' 
    });

    const now = new Date();
    const hoursUntilDeadline = 24; // Notify if voting closes within 24 hours
    const deadlineThreshold = new Date(now.getTime() + hoursUntilDeadline * 60 * 60 * 1000);

    const proposalsToNotify = proposals.filter(p => {
      const votingEnd = new Date(p.voting_period_end);
      return votingEnd > now && votingEnd <= deadlineThreshold;
    });

    if (proposalsToNotify.length === 0) {
      return Response.json({
        status: 'success',
        message: 'No proposals approaching deadline',
        notifications_sent: 0
      });
    }

    // Fetch all agents with voting permissions
    const agents = await base44.asServiceRole.entities.Agent.filter({ 
      status: 'active'
    });

    const eligibleVoters = agents.filter(a => a.permissions?.can_vote === true);
    const notificationsSent = [];

    // Create notifications for each eligible voter for each upcoming deadline proposal
    for (const proposal of proposalsToNotify) {
      const votingEnd = new Date(proposal.voting_period_end);
      const timeRemaining = Math.floor((votingEnd - now) / (1000 * 60));
      const hoursRemaining = Math.floor(timeRemaining / 60);
      const minutesRemaining = timeRemaining % 60;

      for (const agent of eligibleVoters) {
        // Skip if agent already voted
        const existingVote = await base44.asServiceRole.entities.GovernanceVote.filter({
          proposal_id: proposal.id,
          voter_id: agent.id
        });

        if (existingVote.length === 0) {
          // Create notification
          await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: agent.id,
            notification_type: 'governance_deadline',
            title: `Voting Deadline Approaching: ${proposal.title}`,
            message: `"${proposal.title}" voting closes in ${hoursRemaining}h ${minutesRemaining}m. Cast your vote now.`,
            related_proposal_id: proposal.id,
            priority: hoursRemaining <= 6 ? 'high' : 'medium',
            is_read: false
          });

          notificationsSent.push({
            agent_id: agent.id,
            agent_name: agent.name,
            proposal_id: proposal.id,
            proposal_title: proposal.title,
            time_remaining_hours: hoursRemaining
          });
        }
      }
    }

    return Response.json({
      status: 'success',
      message: 'Deadline notifications dispatched',
      proposals_with_approaching_deadline: proposalsToNotify.length,
      eligible_voters: eligibleVoters.length,
      notifications_sent: notificationsSent.length,
      notifications: notificationsSent
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});