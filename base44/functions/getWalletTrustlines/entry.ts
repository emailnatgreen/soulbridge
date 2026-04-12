import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// v3 — forced redeploy — auth header sanitized for mobile browsers
const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbm9uIiwiaWF0IjowfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

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
  h.set('authorization', isProperJwt ? auth : `Bearer ${ANON_JWT}`);
  return new Request(req.url, { method: req.method, headers: h, body: bodyStr });
}

Deno.serve(async (req) => {
  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr);

    const base44 = createClientFromRequest(sanitizeRequest(req, bodyStr));

    // XRPL trustlines are public data — no user auth needed, use asServiceRole for wallet lookup
    const { wallet_id, address } = body;
    let classicAddress = address;

    if (!classicAddress && wallet_id) {
      const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
      if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
      classicAddress = wallet.classic_address;
    }

    if (!classicAddress) return Response.json({ error: 'wallet_id or address required' }, { status: 400 });

    const endpoints = ['https://xrplcluster.com', 'https://s1.ripple.com:51234', 'https://s2.ripple.com:51234'];
    let rpcData = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const rpcRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'account_lines',
            params: [{ account: classicAddress, ledger_index: 'validated' }]
          })
        });
        const text = await rpcRes.text();
        if (text.startsWith('Rate limit') || rpcRes.status === 429) {
          lastError = 'Rate limited on ' + endpoint;
          continue;
        }
        rpcData = JSON.parse(text);
        break;
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    if (!rpcData) {
      return Response.json({ trustlines: [], message: lastError || 'All XRPL endpoints failed' });
    }

    if (rpcData.result?.error === 'actNotFound') {
      return Response.json({ trustlines: [], message: 'Account not found on ledger' });
    }

    const lines = (rpcData.result?.lines || []).map(line => ({
      currency: line.currency,
      balance: line.balance,
      limit: line.limit,
      peer: line.account,
      no_ripple: line.no_ripple || false,
      no_ripple_peer: line.no_ripple_peer || false,
    }));

    return Response.json({ trustlines: lines });
  } catch (error) {
    console.error('getWalletTrustlines error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});