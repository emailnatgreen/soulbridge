import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { wallet_id } = await req.json();
    if (!wallet_id) return Response.json({ error: 'wallet_id is required' }, { status: 400 });

    const walletRecord = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!walletRecord) return Response.json({ error: 'Wallet not found' }, { status: 404 });

    if (!walletRecord.classic_address) {
      return Response.json({ error: 'Wallet has no classic_address' }, { status: 400 });
    }

    const rpcUrl = walletRecord.network === 'mainnet'
      ? 'https://xrplcluster.com'
      : 'https://s.altnet.rippletest.net:51234';

    let balance = 0;
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_info',
          params: [{ account: walletRecord.classic_address, ledger_index: 'validated' }]
        }),
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json();
      if (data?.result?.account_data?.Balance) {
        balance = parseFloat(data.result.account_data.Balance) / 1_000_000;
      }
    } catch (err) {
      console.log('account_info fetch failed:', err.message);
      // Return stored balance if live fetch fails
      return Response.json({
        success: true,
        balance: walletRecord.balance ?? 0,
        classic_address: walletRecord.classic_address,
        cached: true,
      });
    }

    // Persist updated balance
    await base44.asServiceRole.entities.Wallet.update(wallet_id, {
      balance,
      last_accessed: new Date().toISOString()
    });

    return Response.json({ success: true, balance, classic_address: walletRecord.classic_address });

  } catch (error) {
    console.error('getBalance error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});