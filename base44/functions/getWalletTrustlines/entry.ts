import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { wallet_id, address } = await req.json();

    let classicAddress = address;

    // Resolve address from wallet_id if needed
    if (!classicAddress && wallet_id) {
      const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
      if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
      classicAddress = wallet.classic_address;
    }

    if (!classicAddress) return Response.json({ error: 'wallet_id or address required' }, { status: 400 });

    // Query XRPL for account lines (trustlines) with retry on rate limit
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