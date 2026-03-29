import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();
  const { token_id } = body;

  if (!token_id) {
    return Response.json({ error: 'token_id required' }, { status: 400 });
  }

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

  let wallet = null;
  try {
    const createWalletRes = await base44.asServiceRole.functions.invoke('createWallet', {
      name: `${token.recipient_nickname || 'Invited'}'s Wallet`,
      network: 'testnet'
    });
    wallet = createWalletRes?.data?.wallet || null;
  } catch (_) {}

  // Mark as claimed if single-use
  if (token.usage_type === 'single') {
    await base44.asServiceRole.entities.InvitationToken.update(token.id, {
      status: 'claimed',
      claimed_count: (token.claimed_count || 0) + 1
    });
  } else {
    const newCount = (token.claimed_count || 0) + 1;
    if (newCount >= (token.max_claims || 1)) {
      await base44.asServiceRole.entities.InvitationToken.update(token.id, {
        status: 'claimed',
        claimed_count: newCount
      });
    } else {
      await base44.asServiceRole.entities.InvitationToken.update(token.id, {
        claimed_count: newCount
      });
    }
  }

  return Response.json({
    valid: true,
    token_id: token.token_id,
    recipient_nickname: token.recipient_nickname || 'New Soul',
    kinetic_weight: token.kinetic_weight || 10,
    notes: token.notes || null,
    wallet
  });
});