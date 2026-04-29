import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Redeem Activation Code — called from the user's dashboard.
 * 
 * Validates the code, creates a MarketplaceTransaction (marking ownership),
 * and marks the code as redeemed.
 * 
 * Payload: { code: string }
 * Returns: { success, widget_name, widget_nft_id, message }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Must be authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized — please sign in' }, { status: 401 });
    }

    const body = await req.json();
    const rawCode = (body.code || '').trim().toUpperCase();

    if (!rawCode) {
      return Response.json({ error: 'Please enter an activation code' }, { status: 400 });
    }

    // Look up the code
    const codes = await base44.asServiceRole.entities.ActivationCode.filter({ code: rawCode }, '-created_date', 1);
    const codeRecord = codes?.[0];

    if (!codeRecord) {
      return Response.json({ error: 'Invalid activation code. Please check and try again.' }, { status: 404 });
    }

    if (codeRecord.status === 'redeemed') {
      return Response.json({ error: 'This code has already been redeemed.' }, { status: 409 });
    }

    if (codeRecord.status === 'expired' || codeRecord.status === 'revoked') {
      return Response.json({ error: `This code is ${codeRecord.status}.` }, { status: 410 });
    }

    // Check expiry
    if (codeRecord.expires_at && new Date(codeRecord.expires_at) < new Date()) {
      await base44.asServiceRole.entities.ActivationCode.update(codeRecord.id, { status: 'expired' });
      return Response.json({ error: 'This code has expired.' }, { status: 410 });
    }

    // Check if user already owns this widget
    const existingPurchases = await base44.asServiceRole.entities.MarketplaceTransaction.filter(
      { buyer_agent_id: user.email, nft_id: codeRecord.widget_nft_id, status: 'completed' },
      '-created_date', 1
    );
    if (existingPurchases && existingPurchases.length > 0) {
      return Response.json({ error: 'You already own this widget NFT!' }, { status: 409 });
    }

    // Resolve user DID
    let userDid = null;
    try {
      const wallets = await base44.asServiceRole.entities.Wallet.filter({ owner_id: user.id }, '-created_date', 5);
      const published = wallets?.find(w => w.is_published && w.classic_address);
      if (published) userDid = `did:xrpl:1:${published.classic_address}`;
    } catch (_) {}

    // Create the MarketplaceTransaction to register ownership
    const tx = await base44.asServiceRole.entities.MarketplaceTransaction.create({
      resource_name: codeRecord.widget_name,
      buyer_agent_id: user.email,
      buyer_did: userDid,
      seller_agent_id: 'didits.store',
      payment_method: codeRecord.source === 'didit_rlusd' ? 'RLUSD_ON_XRPL' : 'PAYPAL_FIAT',
      unit_amount: 0,
      quantity: 1,
      nft_id: codeRecord.widget_nft_id,
      marketplace_type: 'widget',
      status: 'completed',
      source: 'didit_bridge',
      payment_reference: codeRecord.didit_payment_id || `code:${rawCode}`,
      completion_date: new Date().toISOString(),
      metadata: {
        activation_code: rawCode,
        redeemed_at: new Date().toISOString(),
      },
    });

    // Mark code as redeemed
    await base44.asServiceRole.entities.ActivationCode.update(codeRecord.id, {
      status: 'redeemed',
      redeemed_by_email: user.email,
      redeemed_by_did: userDid,
      redeemed_at: new Date().toISOString(),
      transaction_id: tx.id,
    });

    console.log(`[RedeemCode] ${user.email} redeemed ${rawCode} → ${codeRecord.widget_name} (${codeRecord.widget_nft_id})`);

    return Response.json({
      success: true,
      widget_name: codeRecord.widget_name,
      widget_nft_id: codeRecord.widget_nft_id,
      message: `${codeRecord.widget_name} has been activated on your dashboard!`,
    });
  } catch (error) {
    console.error('[RedeemCode] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});