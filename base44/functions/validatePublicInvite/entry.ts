import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token_id } = body;

    if (!token_id) {
      return Response.json({ valid: false, error: 'Invite code required' }, { status: 400 });
    }

    // Public validation — no auth required, uses service role
    const tokens = await base44.asServiceRole.entities.InvitationToken.filter({
      token_id: token_id.trim().toUpperCase()
    });

    if (!tokens || tokens.length === 0) {
      return Response.json({ valid: false, error: 'Invalid invite code' });
    }

    const token = tokens[0];

    if (token.status !== 'active') {
      return Response.json({ valid: false, error: 'This invite has already been used or revoked' });
    }

    if (token.expiration_date && new Date(token.expiration_date) < new Date()) {
      return Response.json({ valid: false, error: 'This invite has expired' });
    }

    // Mark as claimed
    if (token.usage_type === 'single') {
      await base44.asServiceRole.entities.InvitationToken.update(token.id, {
        status: 'claimed',
        claimed_count: (token.claimed_count || 0) + 1
      });
    } else {
      const newCount = (token.claimed_count || 0) + 1;
      await base44.asServiceRole.entities.InvitationToken.update(token.id, {
        status: newCount >= (token.max_claims || 1) ? 'claimed' : 'active',
        claimed_count: newCount
      });
    }

    // Fetch VIP wallets + agents + treasuries for the public dashboard
    const [allWallets, allAgents, treasuries] = await Promise.all([
      base44.asServiceRole.entities.Wallet.list('-created_date', 100),
      base44.asServiceRole.entities.Agent.list('-created_date', 100),
      base44.asServiceRole.entities.Treasury.list('-created_date', 20),
    ]);

    const vipWallets = (allWallets || []).filter(w =>
      (w.name && w.name.toLowerCase().includes('vip')) ||
      (w.notes && w.notes.toLowerCase().includes('vip'))
    );

    // Strip sensitive fields from wallets
    const safeWallets = vipWallets.map(w => ({
      id: w.id,
      name: w.name,
      classic_address: w.classic_address,
      network: w.network,
      balance: w.balance,
      is_published: w.is_published,
      published_at: w.published_at,
      published_txid: w.published_txid,
      notes: w.notes,
    }));

    const safeAgents = (allAgents || []).map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      honor_score: a.honor_score,
      status: a.status,
      avatar_url: a.avatar_url,
      purpose: a.purpose,
    }));

    return Response.json({
      valid: true,
      token_id: token.token_id,
      recipient_nickname: token.recipient_nickname || 'Honoured Guest',
      kinetic_weight: token.kinetic_weight || 10,
      notes: token.notes || null,
      dashboard_data: {
        wallets: safeWallets,
        agents: safeAgents,
        treasury_count: (treasuries || []).length,
      }
    });
  } catch (error) {
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
});