import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const XUMM_API_KEY = Deno.env.get('xumm_api_key');
const XUMM_SECRET = Deno.env.get('xume_secret_key');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id, signers, quorum, action } = await req.json();

    if (!wallet_id) {
      return Response.json({ error: 'wallet_id required' }, { status: 400 });
    }

    // Fetch the wallet
    const wallets = await base44.asServiceRole.entities.Wallet.filter({ id: wallet_id });
    const wallet = wallets?.[0];
    if (!wallet || !wallet.classic_address) {
      return Response.json({ error: 'Wallet not found or missing address' }, { status: 404 });
    }

    const account = wallet.classic_address;

    // Action: "remove" — remove signer list entirely
    if (action === 'remove') {
      const txJson = {
        TransactionType: 'SignerListSet',
        Account: account,
        SignerQuorum: 0,
        SignerEntries: []
      };

      const xummRes = await fetch('https://xumm.app/api/v1/platform/payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': XUMM_API_KEY,
          'x-api-secret': XUMM_SECRET,
        },
        body: JSON.stringify({
          txjson: txJson,
          options: { submit: true },
          custom_meta: {
            instruction: `Remove multi-sig signer list from ${wallet.name || account}`
          }
        })
      });

      const xummData = await xummRes.json();
      if (!xummData?.next?.always) {
        return Response.json({ error: 'Xumm payload failed', detail: xummData }, { status: 500 });
      }

      return Response.json({
        success: true,
        action: 'remove',
        xumm_url: xummData.next.always,
        payload_uuid: xummData.uuid,
        account
      });
    }

    // Action: "check" — check current signer list on-chain
    if (action === 'check') {
      const res = await fetch('https://xrplcluster.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_objects',
          params: [{ account, type: 'signer_list' }]
        })
      });

      const data = await res.json();
      const signerList = data?.result?.account_objects?.[0];

      if (!signerList) {
        return Response.json({ has_signer_list: false, account });
      }

      return Response.json({
        has_signer_list: true,
        account,
        quorum: signerList.SignerQuorum,
        total_weight: signerList.SignerEntries.reduce((s, e) => s + e.SignerEntry.SignerWeight, 0),
        signers: signerList.SignerEntries.map(e => ({
          account: e.SignerEntry.Account,
          weight: e.SignerEntry.SignerWeight
        }))
      });
    }

    // Action: "set" (default) — set new signer list
    if (!signers || !Array.isArray(signers) || signers.length < 1) {
      return Response.json({ error: 'signers array required (min 1 signer)' }, { status: 400 });
    }
    if (!quorum || quorum < 1) {
      return Response.json({ error: 'quorum must be >= 1' }, { status: 400 });
    }

    // Validate signers
    for (const s of signers) {
      if (!s.account || !s.account.startsWith('r') || !s.weight || s.weight < 1) {
        return Response.json({ error: `Invalid signer: ${JSON.stringify(s)}. Need {account: "r...", weight: number}` }, { status: 400 });
      }
      if (s.account === account) {
        return Response.json({ error: 'Cannot add self as a signer' }, { status: 400 });
      }
    }

    const totalWeight = signers.reduce((sum, s) => sum + s.weight, 0);
    if (quorum > totalWeight) {
      return Response.json({ error: `Quorum (${quorum}) cannot exceed total weight (${totalWeight})` }, { status: 400 });
    }

    const txJson = {
      TransactionType: 'SignerListSet',
      Account: account,
      SignerQuorum: quorum,
      SignerEntries: signers.map(s => ({
        SignerEntry: { Account: s.account, SignerWeight: s.weight }
      }))
    };

    const xummRes = await fetch('https://xumm.app/api/v1/platform/payload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': XUMM_API_KEY,
        'x-api-secret': XUMM_SECRET,
      },
      body: JSON.stringify({
        txjson: txJson,
        options: { submit: true },
        custom_meta: {
          instruction: `Set multi-sig on ${wallet.name || account}: ${signers.length} signer(s), quorum ${quorum} of ${totalWeight}`
        }
      })
    });

    const xummData = await xummRes.json();
    if (!xummData?.next?.always) {
      return Response.json({ error: 'Xumm payload failed', detail: xummData }, { status: 500 });
    }

    return Response.json({
      success: true,
      action: 'set',
      xumm_url: xummData.next.always,
      qr_url: xummData.refs?.qr_png,
      payload_uuid: xummData.uuid,
      account,
      signers,
      quorum,
      total_weight: totalWeight
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});