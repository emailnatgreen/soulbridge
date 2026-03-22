import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const XUMM_API_KEY = Deno.env.get('xumm_api_key');
const XUMM_API_SECRET = Deno.env.get('xume_secret_key');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { wallet_id, did_uri, action } = body;

    // Handle status check
    if (action === 'check_status') {
      const { uuid, wallet_id: checkWalletId } = body;
      const statusRes = await fetch(`https://xumm.app/api/v1/platform/payload/${uuid}`, {
        headers: {
          'x-api-key': XUMM_API_KEY,
          'x-api-secret': XUMM_API_SECRET,
        }
      });
      const statusData = await statusRes.json();
      const txid = statusData.response?.txid || statusData.response?.tx_id || statusData.response?.hash || null;

      // If transaction is signed and we have a txid, save it to the wallet
      if (statusData.meta?.signed && txid && checkWalletId) {
        try {
          await base44.asServiceRole.entities.Wallet.update(checkWalletId, {
            is_published: true,
            published_at: new Date().toISOString(),
            published_txid: txid
          });
          console.log(`Saved publication status for wallet ${checkWalletId}`);
        } catch (err) {
          console.error('Failed to save publication status:', err);
        }
      }

      return Response.json({
        signed: statusData.meta?.signed ?? false,
        resolved: statusData.meta?.resolved ?? false,
        account: statusData.response?.account,
        txid,
        raw_response: statusData.response,
      });
    }

    if (!wallet_id) return Response.json({ error: 'wallet_id is required' }, { status: 400 });

    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });

    // Build DID document URI - use provided or default to app URL
    const uri = did_uri || `https://soulbridge.base44.app/SharedDidView?address=${wallet.classic_address}`;
    
    // Encode URI to hex for XRPL
    const uriHex = Array.from(new TextEncoder().encode(uri))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    // Create XUMM DIDSet payload
    const isTestnet = wallet.network === 'testnet';
    const payload = {
      txjson: {
        TransactionType: 'DIDSet',
        Account: wallet.classic_address,
        URI: uriHex,
      },
      options: {
        submit: true,
        expire: 10, // 10 minutes
        ...(isTestnet ? {
          multisign: false,
          signers: [],
          force_network: 'TESTNET',
        } : {}),
      },
      custom_meta: {
        instruction: `Publish DID for ${wallet.name || wallet.classic_address} on XRPL ${wallet.network}`,
        identifier: `publish_did_${wallet.id}`,
      }
    };

    const xummRes = await fetch('https://xumm.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': XUMM_API_KEY,
        'x-api-secret': XUMM_API_SECRET,
      },
      body: JSON.stringify(payload)
    });

    const xummData = await xummRes.json();

    if (!xummData.uuid) {
      return Response.json({ error: 'Failed to create XUMM payload', details: xummData }, { status: 500 });
    }

    return Response.json({
      success: true,
      uuid: xummData.uuid,
      qr_png: xummData.refs?.qr_png,
      qr_link: xummData.next?.always,
      expires: xummData.payload?.expire_at,
      wallet_address: wallet.classic_address,
      uri,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});