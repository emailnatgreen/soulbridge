import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id, agent_id, action } = await req.json();

    if (!wallet_id || !agent_id || !action) {
      return Response.json(
        { error: 'Missing required fields: wallet_id, agent_id, action' },
        { status: 400 }
      );
    }

    // Get the wallet
    const wallet = await base44.entities.Wallet.get(wallet_id);
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Check if user is the owner (owners always have permission)
    if (wallet.owner_id === user.id) {
      return Response.json({
        hasPermission: true,
        reason: 'owner'
      });
    }

    // Check for active permission
    const permissions = await base44.entities.DidPermission.filter({
      did_classic_address: wallet.classic_address,
      agent_id: agent_id,
      action: action,
      status: 'active'
    });

    return Response.json({
      hasPermission: permissions.length > 0,
      reason: permissions.length > 0 ? 'granted' : 'denied',
      permission: permissions[0] || null
    });
  } catch (error) {
    console.error('Error checking DID permission:', error);
    return Response.json(
      { error: error.message || 'Failed to check permission' },
      { status: 500 }
    );
  }
});