import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id, wallet_id } = await req.json();

    if (!agent_id) {
      return Response.json({ error: 'agent_id is required' }, { status: 400 });
    }

    // Get agent
    const agents = await base44.entities.Agent.filter({ id: agent_id });
    if (!agents || agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agents[0];

    // If wallet_id is null, we're unlinking
    if (!wallet_id) {
      await base44.asServiceRole.entities.Agent.update(agent_id, {
        wallet_id: null,
        classic_address: null
      });

      return Response.json({
        success: true,
        message: 'Agent unlinked from DID',
        agent_id: agent_id
      });
    }

    // Get wallet to verify ownership
    const wallets = await base44.entities.Wallet.filter({ id: wallet_id });
    if (!wallets || wallets.length === 0) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const wallet = wallets[0];

    // Verify user owns the wallet
    if (wallet.owner_id !== user.id) {
      return Response.json({ error: 'Not authorized to use this wallet' }, { status: 403 });
    }

    // Check if wallet is already linked to another agent
    const existingLink = await base44.entities.Agent.filter({ wallet_id: wallet_id });
    if (existingLink && existingLink.length > 0 && existingLink[0].id !== agent_id) {
      return Response.json({ 
        error: 'Wallet already linked to another agent',
        linked_agent: existingLink[0].name
      }, { status: 400 });
    }

    // Link agent to wallet
    await base44.asServiceRole.entities.Agent.update(agent_id, {
      wallet_id: wallet_id,
      classic_address: wallet.classic_address
    });

    return Response.json({
      success: true,
      message: 'Agent successfully linked to DID',
      agent_id: agent_id,
      wallet_id: wallet_id,
      did: `did:xrpl:${wallet.classic_address}`
    });

  } catch (error) {
    console.error('Error linking agent to DID:', error);
    return Response.json({ 
      error: 'Failed to link agent', 
      message: error.message 
    }, { status: 500 });
  }
});