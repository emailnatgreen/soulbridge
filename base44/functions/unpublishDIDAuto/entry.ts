import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { wallet_id } = await req.json();
    if (!wallet_id) {
      return Response.json({ error: 'wallet_id is required' }, { status: 400 });
    }

    // Reset the published state in the database (app-level only, not on-chain)
    await base44.asServiceRole.entities.Wallet.update(wallet_id, {
      is_published: false,
      published_at: null,
      published_txid: null,
    });

    return Response.json({
      success: true,
      message: 'Wallet DID status reset to unpublished (app-level only — the on-chain DID record remains).',
    });
  } catch (error) {
    console.error('unpublishDIDAuto error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});