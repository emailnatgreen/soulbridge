import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id, action, currency, issuer, limit } = await req.json();
    
    if (!wallet_id || !action || !currency) {
      return Response.json({ error: 'wallet_id, action, and currency required' }, { status: 400 });
    }

    const wallet = await base44.entities.Wallet.get(wallet_id);
    if (!wallet || wallet.owner_id !== user.id) {
      return Response.json({ error: 'Wallet not found or unauthorized' }, { status: 403 });
    }

    const xummApiKey = Deno.env.get('xumm_api_key');
    if (!xummApiKey) {
      return Response.json({ error: 'XUMM API key not configured' }, { status: 500 });
    }

    // Set default issuer for rLUSD
    const trustlineIssuer = issuer || 'rN7n7otQDd6FczFgLdlqtyMVrn3MtAj58';
    const trustlineLimit = limit || '1000000000';

    const txjson = {
      TransactionType: 'TrustSet',
      Account: wallet.classic_address,
      LimitAmount: {
        currency: currency,
        issuer: trustlineIssuer,
        value: action === 'remove' ? '0' : trustlineLimit,
      },
      Fee: '12',
    };

    const payload = {
      txjson,
      user_token: user.id,
    };

    const response = await fetch('https://xumm.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': xummApiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return Response.json({ error: 'XUMM request failed', details: data }, { status: 500 });
    }

    return Response.json({
      uuid: data.uuid,
      qr_png: data.refs?.qr_png,
      xumm_deeplink: data.next?.always,
      action: action,
      currency: currency,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});