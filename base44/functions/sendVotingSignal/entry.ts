import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active governance proposals
    const activeProposals = await base44.entities.GovernanceProposal.filter({
      status: 'active'
    });

    if (activeProposals.length === 0) {
      return Response.json({
        message: 'No active proposals to vote on',
        notificationsSent: 0
      });
    }

    // Fetch all active agents
    const activeAgents = await base44.entities.Agent.filter({
      status: 'active'
    });

    if (activeAgents.length === 0) {
      return Response.json({
        message: 'No active agents to notify',
        notificationsSent: 0
      });
    }

    // Create notifications for agents who haven't voted yet
    let notificationCount = 0;
    const allVotes = await base44.entities.GovernanceVote.list();

    for (const proposal of activeProposals) {
      for (const agent of activeAgents) {
        // Check if agent has already voted on this proposal
        const hasVoted = allVotes.some(
          v => v.proposal_id === proposal.id && v.voter_agent_id === agent.id
        );

        if (!hasVoted && agent.permissions?.can_vote) {
          try {
            await base44.entities.AgentNotification.create({
              recipient_agent_id: agent.id,
              notification_type: 'voting_signal',
              title: `Vote Now: ${proposal.title}`,
              message: `A governance proposal is open for voting. Your participation helps shape our Village's future.`,
              related_entity_type: 'GovernanceProposal',
              related_entity_id: proposal.id,
              status: 'unread',
              priority: 'high'
            });
            notificationCount++;
          } catch (e) {
            console.warn(`Failed to create notification for agent ${agent.id}:`, e.message);
          }
        }
      }
    }

    return Response.json({
      message: '6 AM Voting Signal sent',
      activeProposals: activeProposals.length,
      activeAgents: activeAgents.length,
      notificationsSent: notificationCount
    });
  } catch (error) {
    console.error('Voting signal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});