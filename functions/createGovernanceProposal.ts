import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      title, 
      description, 
      proposal_type, 
      action_data,
      voting_duration_hours = 72 
    } = await req.json();

    // Find the agent for the current user
    const agents = await base44.entities.Agent.filter({ created_by: user.email });
    if (!agents || agents.length === 0) {
      return Response.json({ error: 'No agent found for this user' }, { status: 404 });
    }
    const proposerAgent = agents[0];

    // Calculate voting period end
    const votingPeriodEnd = new Date(Date.now() + voting_duration_hours * 60 * 60 * 1000).toISOString();

    // Create the proposal
    const proposal = await base44.entities.GovernanceProposal.create({
      title,
      description,
      proposal_type,
      proposed_by: proposerAgent.id,
      status: 'active',
      voting_period_end: votingPeriodEnd,
      quorum_required: 30, // 30% participation needed
      pass_threshold: 60, // 60% approval needed
      action_data: action_data || {},
      total_votes_cast: 0,
      total_voting_power_cast: 0,
      votes_for: 0,
      votes_against: 0,
      votes_abstain: 0
    });

    // Notify all agents about the new proposal
    const allAgents = await base44.asServiceRole.entities.Agent.list();
    for (const agent of allAgents.slice(0, 20)) { // Notify first 20 agents
      if (agent.id !== proposerAgent.id) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: agent.id,
          notification_type: 'governance_proposal',
          title: '🗳️ New Governance Proposal',
          message: `${proposerAgent.name} has created a new ${proposal_type.replace('_', ' ')} proposal: "${title}"`,
          action_url: `/governance?proposal=${proposal.id}`,
          priority: 'high'
        });
      }
    }

    return Response.json({ 
      success: true, 
      proposal 
    });

  } catch (error) {
    console.error('Proposal creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});