/**
 * activateRLUSDGate — 1 wallet = 1 RLUSD trustline
 * 
 * Actions:
 *   POST { action: "check_wallet", wallet_id }  — check if wallet already has trustline
 *   POST { action: "activate", wallet_id }       — charge 12 RLUSD, create Xumm TrustSet payload
 *   POST { action: "verify", uuid, wallet_id }   — check Xumm payload status after signing
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RLUSD_CONFIG = {
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  limit: "1000000000",
};

const TRUSTLINE_COST_RLUSD = 12;

async function checkOnChainTrustline(address) {
  const endpoints = ['https://xrplcluster.com', 'https://s1.ripple.com:51234'];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_lines',
          params: [{ account: address, peer: RLUSD_CONFIG.issuer, ledger_index: 'validated' }]
        })
      });
      const data = await res.json();
      if (data.result?.error === 'actNotFound') {
        return { exists: false, funded: false };
      }
      const hasRLUSD = (data.result?.lines || []).some(
        l => l.currency === RLUSD_CONFIG.currency
      );
      return { exists: hasRLUSD, funded: true };
    } catch (_) { continue; }
  }
  return { exists: false, funded: true, error: 'XRPL unreachable' };
}



Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, wallet_id, uuid } = body;

    if (!action) return Response.json({ error: 'action required' }, { status: 400 });

    // === CHECK WALLET ===
    if (action === 'check_wallet') {
      if (!wallet_id) return Response.json({ error: 'wallet_id required' }, { status: 400 });

      const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
      if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });

      const address = wallet.classic_address;
      const onChain = await checkOnChainTrustline(address);

      // Get user RLUSD ledger balance
      const ledgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
        { user_email: user.email }, '-created_date', 1
      );
      const ledger = ledgers?.[0];

      return Response.json({
        wallet_id,
        address,
        has_trustline: onChain.exists,
        can_afford: (ledger?.balance || 0) >= TRUSTLINE_COST_RLUSD,
        rlusd_balance: ledger?.balance || 0,
        cost: TRUSTLINE_COST_RLUSD,
      });
    }

    // === ACTIVATE — charge RLUSD + create Xumm TrustSet payload ===
    if (action === 'activate') {
      if (!wallet_id) return Response.json({ error: 'wallet_id required' }, { status: 400 });

      const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
      if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });

      const address = wallet.classic_address;

      // 1) Check if already has trustline (1 wallet = 1 trustline policy)
      const onChain = await checkOnChainTrustline(address);
      if (onChain.exists) {
        return Response.json({
          error: 'This wallet already has an RLUSD trustline active',
          already_active: true,
        }, { status: 409 });
      }

      // 2) Get or create RLUSD ledger
      const ledgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
        { user_email: user.email }, '-created_date', 1
      );
      let ledger = ledgers?.[0];
      if (!ledger) {
        ledger = await base44.asServiceRole.entities.RLUSDLedger.create({
          user_id: user.email, user_email: user.email,
          balance: 0, total_credited: 0, total_debited: 0, status: 'active',
        });
      }

      // 4) Check RLUSD balance
      if (ledger.balance < TRUSTLINE_COST_RLUSD) {
        return Response.json({
          error: `Insufficient RLUSD. Need ${TRUSTLINE_COST_RLUSD}, have ${ledger.balance}.`,
          balance: ledger.balance,
          required: TRUSTLINE_COST_RLUSD,
        }, { status: 402 });
      }

      // 5) Deduct RLUSD
      const newBalance = ledger.balance - TRUSTLINE_COST_RLUSD;
      await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
        balance: newBalance,
        total_debited: (ledger.total_debited || 0) + TRUSTLINE_COST_RLUSD,
      });

      // 6) Log payment
      try {
        await base44.asServiceRole.entities.PaymentUsageLog.create({
          user_id: user.email, user_email: user.email,
          service_id: 'rlusd_trustline_gate',
          amount: TRUSTLINE_COST_RLUSD, currency: 'RLUSD',
          pricing_model: 'per_invocation',
          billing_behavior: 'prepay',
          status: 'success',
          balance_before: ledger.balance,
          balance_after: newBalance,
          metadata: { wallet_id, address, action: 'trustline_activation' },
        });
      } catch (_) {}

      // 7) Create Xumm TrustSet payload for the user to sign
      const xummApiKey = Deno.env.get('xumm_api_key');
      const xummApiSecret = Deno.env.get('xume_secret_key');
      if (!xummApiKey || !xummApiSecret) {
        // Refund on config error
        await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
          balance: ledger.balance,
          total_debited: (ledger.total_debited || 0),
        });
        return Response.json({ error: 'Xaman API keys not configured' }, { status: 500 });
      }

      const trustSetTx = {
        TransactionType: 'TrustSet',
        Account: address,
        LimitAmount: {
          currency: RLUSD_CONFIG.currency,
          issuer: RLUSD_CONFIG.issuer,
          value: RLUSD_CONFIG.limit,
        },
        Flags: 131072, // tfSetNoRipple
      };

      const xummRes = await fetch('https://xaman.app/api/v1/platform/payload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': xummApiKey,
          'X-API-Secret': xummApiSecret,
        },
        body: JSON.stringify({
          txjson: trustSetTx,
          options: { submit: true, expire: 15 },
          custom_meta: {
            instruction: `Activate RLUSD trustline for ${address.slice(0, 8)}…`,
            blob: JSON.stringify({ wallet_id, address, cost: TRUSTLINE_COST_RLUSD }),
          },
        }),
      });

      const xummData = await xummRes.json();
      if (!xummData?.uuid) {
        // Refund if Xumm fails
        await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
          balance: ledger.balance,
          total_debited: (ledger.total_debited || 0),
        });
        return Response.json({ error: 'Xaman payload creation failed', details: xummData }, { status: 500 });
      }

      return Response.json({
        success: true,
        uuid: xummData.uuid,
        qr_png: xummData.refs?.qr_png,
        deeplink: xummData.next?.always,
        cost_charged: TRUSTLINE_COST_RLUSD,
        balance_after: newBalance,
        wallet_id,
        address,
      });
    }

    // === VERIFY — check if Xumm payload was signed ===
    if (action === 'verify') {
      if (!uuid) return Response.json({ error: 'uuid required' }, { status: 400 });

      const xummApiKey = Deno.env.get('xumm_api_key');
      const xummApiSecret = Deno.env.get('xume_secret_key');

      const res = await fetch(`https://xaman.app/api/v1/platform/payload/${uuid}`, {
        headers: {
          'X-API-Key': xummApiKey,
          'X-API-Secret': xummApiSecret,
        },
      });
      const data = await res.json();

      const signed = data?.meta?.signed === true;
      const resolved = data?.meta?.resolved === true;
      const txHash = data?.response?.txid;

      if (signed && txHash) {
        // Update wallet metadata
        if (wallet_id) {
          try {
            const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
            await base44.asServiceRole.entities.Wallet.update(wallet_id, {
              metadata: {
                ...(wallet.metadata || {}),
                has_rlusd_trustline: true,
                rlusd_setup_date: new Date().toISOString(),
                rlusd_gate_tx: txHash,
              }
            });
          } catch (_) {}
        }

        return Response.json({
          success: true,
          signed: true,
          tx_hash: txHash,
          message: 'RLUSD trustline activated on-chain!',
        });
      }

      if (resolved && !signed) {
        // User rejected — refund RLUSD
        if (wallet_id) {
          try {
            const blobStr = data?.custom_meta?.blob;
            const blob = blobStr ? JSON.parse(blobStr) : {};
            const cost = blob.cost || TRUSTLINE_COST_RLUSD;

            const ledgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
              { user_email: user.email }, '-created_date', 1
            );
            if (ledgers?.[0]) {
              await base44.asServiceRole.entities.RLUSDLedger.update(ledgers[0].id, {
                balance: ledgers[0].balance + cost,
                total_debited: Math.max(0, (ledgers[0].total_debited || 0) - cost),
              });
            }
          } catch (_) {}
        }

        return Response.json({
          success: false,
          signed: false,
          rejected: true,
          message: 'Transaction was rejected. RLUSD has been refunded.',
        });
      }

      return Response.json({
        success: false,
        signed: false,
        pending: true,
        message: 'Waiting for signature…',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('[activateRLUSDGate] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});