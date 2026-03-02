import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { vault_id, agent_id, permission_type, duration_hours = 1 } = payload;

    // Fetch vault
    const vault = await base44.entities.LiquidityVault.filter({ id: vault_id }, '', 1);
    if (!vault || vault.length === 0) {
      return Response.json({ error: 'Vault not found' }, { status: 404 });
    }

    const vaultData = vault[0];

    // Verify requester is vault owner or admin
    if (vaultData.owner_agent_id !== user.id && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Not vault owner' }, { status: 403 });
    }

    // Generate ephemeral ticket
    const ticketId = `TICKET_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const grantedDate = new Date().toISOString();
    const expiresDate = new Date(Date.now() + duration_hours * 3600000).toISOString();

    // Add to ZSP permission grants
    const updatedGrants = [
      ...(vaultData.zsp_permission_grants || []),
      {
        agent_id: agent_id,
        permission_type: permission_type,
        granted_date: grantedDate,
        expires_date: expiresDate,
        ticket_id: ticketId
      }
    ];

    // Update vault with new permission
    const updated = await base44.entities.LiquidityVault.update(vault_id, {
      zsp_permission_grants: updatedGrants
    });

    return Response.json({
      success: true,
      ticket: {
        ticket_id: ticketId,
        agent_id: agent_id,
        permission_type: permission_type,
        expires_date: expiresDate,
        message: `Ephemeral permission granted. Self-destructs at ${expiresDate}`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});