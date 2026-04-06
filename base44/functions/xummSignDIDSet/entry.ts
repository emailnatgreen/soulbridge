import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id, did_set } = await req.json();
    
    if (!wallet_id || !did_set) {
      return Response.json({ error: 'wallet_id and did_set required' }, { status: 400 });
    }

    const wallet = await base44.entities.Wallet.get(wallet_id);
    if (!wallet || wallet.owner_id !== user.id) {
      return Response.json({ error: 'Wallet not found or unauthorized' }, { status: 404 });
    }

    const xummApiKey = Deno.env.get('xumm_api_key');
    if (!xummApiKey) {
      return Response.json({ error: 'XUMM API key not configured' }, { status: 500 });
    }

    // Create XUMM payload for DID set signing
    const payload = {
      txjson: {
        TransactionType: 'DIDSet',
        Account: wallet.classic_address,
        URI: did_set.uri || '',
        DIDDocument: did_set.document || {},
      },
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
      qr_matrix: data.refs?.qr_matrix,
      xumm_deeplink: data.next?.always,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});