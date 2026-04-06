import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id } = await req.json();
    if (!wallet_id) {
      return Response.json({ error: 'wallet_id required' }, { status: 400 });
    }

    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const xummApiKey = Deno.env.get('xumm_api_key');
    const xummApiSecret = Deno.env.get('xume_secret_key');
    if (!xummApiKey || !xummApiSecret) {
      return Response.json({ error: 'XUMM API keys not configured' }, { status: 500 });
    }

    // Build DID URI and document hex
    const didUri = `did:xrpl:1:${wallet.classic_address}`;
    const uriHex = Array.from(new TextEncoder().encode(didUri)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const didDoc = JSON.stringify({
      id: didUri,
      controller: wallet.classic_address,
      created: new Date().toISOString(),
      service: [{ id: '#soulbridge', type: 'SoulBridgeVillage', serviceEndpoint: 'https://soulbridge.base44.app' }]
    });
    const dataHex = Array.from(new TextEncoder().encode(didDoc)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const payload = {
      txjson: {
        TransactionType: 'DIDSet',
        Account: wallet.classic_address,
        URI: uriHex,
        Data: dataHex.slice(0, 256),
      },
      options: {
        submit: true,
        expire: 10,
      },
      custom_meta: {
        instruction: `Publish DID for ${wallet.name || wallet.classic_address} on XRPL Mainnet`,
      },
    };

    const response = await fetch('https://xaman.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': xummApiKey,
        'X-API-Secret': xummApiSecret,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!data?.uuid) {
      console.error('XUMM DIDSet payload failed:', JSON.stringify(data));
      return Response.json({ error: 'XUMM payload creation failed', details: data }, { status: 500 });
    }

    return Response.json({
      uuid: data.uuid,
      qr_png: data.refs?.qr_png,
      deeplink: data.next?.always,
      wallet_name: wallet.name,
      classic_address: wallet.classic_address,
    });
  } catch (error) {
    console.error('xummSignDIDSet error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});