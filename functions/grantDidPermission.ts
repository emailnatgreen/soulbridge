import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id, agent_id, action, notes } = await req.json();

    if (!wallet_id || !agent_id || !action) {
      return Response.json(
        { error: 'Missing required fields: wallet_id, agent_id, action' },
        { status: 400 }
      );
    }

    // Get the wallet and verify ownership
    const wallet = await base44.entities.Wallet.get(wallet_id);
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallet.owner_id !== user.id) {
      return Response.json(
        { error: 'You do not own this DID' },
        { status: 403 }
      );
    }

    // Verify agent exists
    const agent = await base44.entities.Agent.get(agent_id);
    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if permission already exists
    const existingPermissions = await base44.entities.DidPermission.filter({
      did_classic_address: wallet.classic_address,
      agent_id: agent_id,
      action: action,
      status: 'active'
    });

    if (existingPermissions.length > 0) {
      return Response.json(
        { error: 'Permission already exists for this agent and action' },
        { status: 409 }
      );
    }

    // Create the permission
    const permission = await base44.entities.DidPermission.create({
      did_classic_address: wallet.classic_address,
      agent_id: agent_id,
      action: action,
      granted_by_user_id: user.id,
      status: 'active',
      notes: notes || ''
    });

    return Response.json({
      success: true,
      permission: permission
    });
  } catch (error) {
    console.error('Error granting DID permission:', error);
    return Response.json(
      { error: error.message || 'Failed to grant permission' },
      { status: 500 }
    );
  }
});