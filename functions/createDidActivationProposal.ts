import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { wallet_id, agent_id, justification } = body;

    if (!wallet_id) {
      return Response.json({ error: 'wallet_id is required' }, { status: 400 });
    }

    // Fetch wallet
    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Fetch agent if provided
    let agent = null;
    let agentName = 'Unknown';
    if (agent_id) {
      agent = await base44.asServiceRole.entities.Agent.get(agent_id);
      if (agent) {
        agentName = agent.name;
      }
    }

    // Create governance proposal for DID activation
    const proposal = await base44.asServiceRole.entities.GovernanceProposal.create({
      title: `Activate DID for ${agent_id ? agentName : wallet.name}`,
      description: `Request to activate Decentralized Identifier (DID) on the XRPL for ${agent_id ? `Agent: ${agentName}` : `Wallet: ${wallet.name}`}\n\nClassic Address: ${wallet.classic_address}\nNetwork: ${wallet.network}\n\nJustification: ${justification || 'No justification provided'}`,
      proposal_type: 'general',
      proposed_by: user.email,
      status: 'active',
      voting_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      quorum_required: 50,
      pass_threshold: 60,
      action_data: {
        action_type: 'activate_did',
        wallet_id,
        agent_id: agent_id || null,
        classic_address: wallet.classic_address,
        network: wallet.network
      }
    });

    // Log proposal creation
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'DID Activation Proposal',
      function_name: 'createDidActivationProposal',
      status: 'success',
      message: `DID activation proposal created for ${agent_id ? agentName : wallet.name}`,
      details: {
        proposal_id: proposal.id,
        wallet_id,
        agent_id,
        proposed_by: user.email,
        voting_period_end: proposal.voting_period_end
      },
      run_at: new Date().toISOString(),
      triggered_by: 'manual'
    });

    return Response.json({
      status: 'success',
      message: 'DID activation proposal created successfully',
      proposal_id: proposal.id,
      proposal_title: proposal.title,
      voting_period_end: proposal.voting_period_end,
      wallet_id,
      agent_id,
      next_step: 'Wait for quad to vote on the proposal'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});