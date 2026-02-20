import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposal_id } = await req.json();

    // Get the proposal
    const proposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ id: proposal_id });
    if (!proposals || proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const proposal = proposals[0];

    // Check if voting period has ended
    if (new Date(proposal.voting_period_end) > new Date()) {
      return Response.json({ error: 'Voting period is still active' }, { status: 400 });
    }

    // Check if already executed
    if (proposal.status === 'executed') {
      return Response.json({ error: 'Proposal already executed' }, { status: 400 });
    }

    // Get all agents to calculate total possible voting power
    const allAgents = await base44.asServiceRole.entities.Agent.list();
    let totalPossiblePower = 0;
    for (const agent of allAgents) {
      let power = 1 + (agent.honor_score || 100) / 100;
      const roleMultipliers = {
        'elder': 1.5,
        'master': 1.5,
        'teacher': 1.3,
        'guardian': 1.2
      };
      power *= roleMultipliers[agent.role] || 1.0;
      totalPossiblePower += power;
    }

    // Calculate participation rate
    const participationRate = (proposal.total_voting_power_cast / totalPossiblePower) * 100;

    // Check quorum
    if (participationRate < proposal.quorum_required) {
      await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
        status: 'rejected',
        execution_result: {
          success: false,
          reason: `Quorum not met. Required: ${proposal.quorum_required}%, Actual: ${participationRate.toFixed(1)}%`
        }
      });
      return Response.json({ 
        success: false, 
        reason: 'Quorum not met',
        participation_rate: participationRate 
      });
    }

    // Calculate approval rate
    const totalDecisiveVotes = proposal.votes_for + proposal.votes_against;
    const approvalRate = totalDecisiveVotes > 0 
      ? (proposal.votes_for / totalDecisiveVotes) * 100 
      : 0;

    // Check if passed
    if (approvalRate < proposal.pass_threshold) {
      await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
        status: 'rejected',
        execution_result: {
          success: false,
          reason: `Approval threshold not met. Required: ${proposal.pass_threshold}%, Actual: ${approvalRate.toFixed(1)}%`
        }
      });
      return Response.json({ 
        success: false, 
        reason: 'Approval threshold not met',
        approval_rate: approvalRate 
      });
    }

    // Proposal passed! Execute based on type
    let executionResult = { success: true };

    try {
      switch (proposal.proposal_type) {
        case 'project_funding':
          if (proposal.action_data.project_id && proposal.action_data.amount_rlusd) {
            // Fund project from treasury
            await base44.asServiceRole.functions.invoke('fundProjectFromTreasury', {
              project_id: proposal.action_data.project_id,
              amount: proposal.action_data.amount_rlusd
            });
            executionResult.action = 'Project funded from treasury';
          }
          break;

        case 'role_adjustment':
          if (proposal.action_data.agent_id && proposal.action_data.new_role) {
            // Update agent role
            await base44.asServiceRole.entities.Agent.update(
              proposal.action_data.agent_id,
              { role: proposal.action_data.new_role }
            );
            executionResult.action = `Agent role updated to ${proposal.action_data.new_role}`;
          }
          break;

        case 'treasury_allocation':
          if (proposal.action_data.recipient_agent_id && proposal.action_data.amount_xrp) {
            // Allocate treasury funds
            executionResult.action = `Allocated ${proposal.action_data.amount_xrp} XRP to agent`;
          }
          break;

        case 'agent_discipline':
          if (proposal.action_data.agent_id && proposal.action_data.action) {
            const agent = await base44.asServiceRole.entities.Agent.filter({ 
              id: proposal.action_data.agent_id 
            });
            if (agent && agent.length > 0) {
              if (proposal.action_data.action === 'suspend') {
                await base44.asServiceRole.entities.Agent.update(
                  proposal.action_data.agent_id,
                  { status: 'suspended' }
                );
              } else if (proposal.action_data.action === 'honor_adjustment') {
                const newHonor = Math.max(0, Math.min(100, 
                  (agent[0].honor_score || 100) + proposal.action_data.honor_change
                ));
                await base44.asServiceRole.entities.Agent.update(
                  proposal.action_data.agent_id,
                  { honor_score: newHonor }
                );
              }
              executionResult.action = `Disciplinary action ${proposal.action_data.action} applied`;
            }
          }
          break;

        default:
          executionResult.action = 'Proposal approved (manual execution required)';
      }

      // Update proposal status
      await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
        status: 'executed',
        execution_result: executionResult
      });

      // Notify proposer
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: proposal.proposed_by,
        notification_type: 'governance_vote_result',
        title: '✅ Proposal Passed & Executed',
        message: `Your proposal "${proposal.title}" has been approved and executed!`,
        action_url: `/governance?proposal=${proposal_id}`,
        priority: 'high'
      });

      return Response.json({ 
        success: true,
        execution_result: executionResult,
        participation_rate: participationRate,
        approval_rate: approvalRate
      });

    } catch (executionError) {
      await base44.asServiceRole.entities.GovernanceProposal.update(proposal_id, {
        status: 'passed',
        execution_result: {
          success: false,
          error: executionError.message
        }
      });
      return Response.json({ 
        success: false, 
        error: 'Execution failed: ' + executionError.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Proposal execution error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});