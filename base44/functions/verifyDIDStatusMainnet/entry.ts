import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// v4 — omit auth header when malformed
function sanitizeRequest(req, bodyStr) {
  const auth = (req.headers.get('authorization') || '').trim();
  const isProperJwt = /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth);

  const h = new Headers();
  h.set('content-type', 'application/json');
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() === 'authorization') continue;
    if (key.startsWith('base44') || key.startsWith('x-base44') || key.startsWith('x-app')) {
      h.set(key, value);
    }
  }
  if (isProperJwt) h.set('authorization', auth);
  return new Request(req.url, { method: req.method, headers: h, body: bodyStr });
}

/**
 * Verify DID by querying XRPL MAINNET directly via RPC.
 * Does NOT rely on is_published database flag — this is the source of truth.
 */
Deno.serve(async (req) => {
  const RPC_ENDPOINTS = [
    'https://xrpl.ws',
    'https://xrplcluster.com',
    'https://s1.ripple.com:51234'
  ];

  const queryXRPL = async (classicAddress) => {
    let lastError;
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const rpcResponse = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'account_info', params: [{ account: classicAddress }] }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!rpcResponse.ok) throw new Error(`HTTP ${rpcResponse.status}`);
        const rpcData = await rpcResponse.json();
        if (rpcData.error) throw new Error(rpcData.error.message || JSON.stringify(rpcData.error));
        const accountData = rpcData.result?.account_data || rpcData.account_data || rpcData.result;
        if (accountData) return { success: true, data: accountData };
        throw new Error('No account data in response');
      } catch (err) {
        lastError = err;
        console.warn(`[verifyDIDStatusMainnet] ${endpoint} failed:`, err.message);
        continue;
      }
    }
    return { success: false, error: lastError?.message || 'All RPC endpoints failed' };
  };

  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr || '{}');

    const base44 = createClientFromRequest(sanitizeRequest(req, bodyStr || '{}'));

    // Check auth
    const authHeader = (req.headers.get('authorization') || '').trim();
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const isValidJwt = rawToken && rawToken.includes('.') && rawToken.length > 20;

    let user = null;
    if (isValidJwt) {
      try { user = await base44.auth.me(); } catch (authErr) {
        console.warn('[verifyDIDStatusMainnet] auth.me() failed:', authErr?.message);
      }
    }

    // If user auth failed, try classic_address from body as fallback
    const bodyAddress = body.classic_address || body.address || null;

    let wallet = null;
    if (user) {
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { owner_id: user.id }, '-updated_date', 1
      );
      wallet = wallets?.[0] || null;
    }

    if (!wallet && bodyAddress) {
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { classic_address: bodyAddress }, '-updated_date', 1
      );
      wallet = wallets?.[0] || null;
    }

    if (!wallet) {
      return Response.json({ isVerified: false, error: 'No wallet found' });
    }

    const classicAddress = wallet.classic_address;

    const xrplResult = await queryXRPL(classicAddress);

    if (!xrplResult.success) {
      console.error('[verifyDIDStatusMainnet] XRPL Query Error:', xrplResult.error);
      return Response.json({ isVerified: false, error: `Failed to query XRPL: ${xrplResult.error}`, classic_address: classicAddress, network: 'mainnet' });
    }

    const accountData = xrplResult.data;

    if (!wallet.is_published) {
      try {
        await base44.asServiceRole.entities.Wallet.update(wallet.id, { is_published: true, published_at: new Date().toISOString() });
      } catch (updateErr) {
        console.error('[verifyDIDStatusMainnet] Failed to update wallet flag:', updateErr);
      }
    }

    const agents = await base44.asServiceRole.entities.Agent.filter({ classic_address: classicAddress }, '', 1);
    const agent = agents?.[0];
    const role = agent?.role || 'citizen';
    const permissions = agent?.permissions || { can_create_agents: false, can_send_xrp: true, can_access_treasury: false, can_vote: true, can_evaluate_agents: false };

    return Response.json({
      isVerified: true,
      userId: user.id,
      email: user.email,
      did: `did:xrpl:${classicAddress}`,
      classic_address: classicAddress,
      walletId: wallet.id,
      network: 'mainnet',
      publishedAt: wallet.published_at || new Date().toISOString(),
      role,
      permissions,
      agentId: agent?.id || null,
      xrplData: {
        sequence: accountData.Sequence,
        balance: accountData.Balance,
        flags: accountData.Flags,
        previousTxnID: accountData.PreviousTxnID,
        previousTxnLgrSeq: accountData.PreviousTxnLgrSeq,
        ledgerEntryType: accountData.LedgerEntryType
      },
      verification: {
        verified: true,
        account_exists: true,
        did_active: true,
        verified_at: new Date().toISOString(),
        balance: (parseInt(accountData.Balance) / 1_000_000).toFixed(2) + ' XRP',
        on_chain_proof: {
          account: classicAddress,
          ledger_sequence: accountData.LedgerIndex || 'current',
          previous_txn: accountData.PreviousTxnID,
          explorer_url: `https://xrpscan.com/account/${classicAddress}`
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[verifyDIDStatusMainnet] Unhandled Error:', error);
    return Response.json({ isVerified: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
});