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

    // Query XRPL for account lines (trustlines)
    const rpcRes = await fetch('https://xrplcluster.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_lines',
        params: [{ account: classicAddress, ledger_index: 'validated' }]
      })
    });

    const rpcData = await rpcRes.json();

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