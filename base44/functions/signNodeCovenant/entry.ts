import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const XUMM_API_KEY = Deno.env.get('xumm_api_key');
const XUMM_API_SECRET = Deno.env.get('xume_secret_key');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { wallet_id, node_address, node_name, action, payload_id, signature_id } = body;

    if (action === 'check_status') {
      if (!payload_id || !signature_id) {
        return Response.json({ error: 'payload_id and signature_id are required' }, { status: 400 });
      }

      const statusRes = await fetch(`https://xumm.app/api/v1/platform/payload/${payload_id}`, {
        headers: {
          'x-api-key': XUMM_API_KEY,
          'x-api-secret': XUMM_API_SECRET,
        },
      });
      const statusData = await statusRes.json();

      const signed = statusData.meta?.signed ?? false;
      const expired = statusData.meta?.expired ?? false;
      const resolved = statusData.meta?.resolved ?? false;
      const txid = statusData.response?.txid || statusData.response?.tx_id || statusData.response?.hash || null;
      const account = statusData.response?.account || null;

      if (signed) {
        await base44.asServiceRole.entities.NodeCovenantSignature.update(signature_id, {
          status: 'signed',
          signed_at: new Date().toISOString(),
          xrpl_account: account,
          xrpl_txid: txid,
          signature_hash: txid || payload_id,
        });
      } else if (expired) {
        await base44.asServiceRole.entities.NodeCovenantSignature.update(signature_id, {
          status: 'expired',
        });
      }

      return Response.json({ signed, expired, resolved, account, txid });
    }

    if (!wallet_id || !node_address || !node_name) {
      return Response.json({ error: 'wallet_id, node_address and node_name are required' }, { status: 400 });
    }

    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
    if (wallet.owner_id !== user.id) {
      return Response.json({ error: 'Access denied: You do not own this wallet' }, { status: 403 });
    }
    if (wallet.classic_address !== node_address) {
      return Response.json({ error: 'This wallet does not control the selected braid node' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.NodeCovenantSignature.filter({ node_address, status: 'signed' }, '-created_date', 1);
    if (existing?.length) {
      return Response.json({ error: 'This node has already signed the covenant' }, { status: 400 });
    }

    const signatureMessage = `SoulBridge Node Covenant | ${node_name} | ${node_address} | I affirm the constitutional duties of the 8-node braid.`;

    const payload = {
      txjson: {
        TransactionType: 'SignIn'
      },
      options: {
        submit: false,
        expire: 15,
      },
      custom_meta: {
        instruction: `Sign the Node Covenant as ${node_name}`,
        identifier: `node_covenant_${wallet.id}`,
        blob: {
          covenant_message: signatureMessage,
          node_address,
          node_name,
        }
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
      return Response.json({ error: 'Failed to create Xaman payload', details: xummData }, { status: 500 });
    }

    const record = await base44.asServiceRole.entities.NodeCovenantSignature.create({
      node_address,
      node_name,
      wallet_id: wallet.id,
      signed_by_user_id: user.id,
      status: 'pending',
      xumm_payload_id: xummData.uuid,
      signature_message: signatureMessage,
      xrpl_account: wallet.classic_address,
    });

    return Response.json({
      success: true,
      signature_id: record.id,
      payload_id: xummData.uuid,
      qr_png: xummData.refs?.qr_png,
      qr_link: xummData.next?.always,
      node_address,
      node_name,
      signature_message: signatureMessage,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});