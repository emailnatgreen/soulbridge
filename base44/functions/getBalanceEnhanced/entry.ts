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

    const wallet = await base44.entities.Wallet.get(wallet_id);
    if (!wallet || wallet.owner_id !== user.id) {
      return Response.json({ error: 'Wallet not found or unauthorized' }, { status: 403 });
    }

    const xrplApiUrl = wallet.network === 'testnet'
      ? 'https://s.altnet.rippletest.net:51234'
      : 'https://xrplcluster.com';

    // Get account info for XRP balance
    const accountResponse = await fetch(xrplApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'account_info',
        params: {
          account: wallet.classic_address,
          ledger_index: 'validated',
        },
        id: 1,
      }),
    }).catch(() => null);

    let xrpBalance = 0;
    if (accountResponse?.ok) {
      const accountData = await accountResponse.json();
      xrpBalance = accountData.result?.account_data?.Balance
        ? (parseInt(accountData.result.account_data.Balance) / 1000000).toFixed(2)
        : 0;
    }

    // Get trustlines
    const trustlineResponse = await fetch(xrplApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'account_lines',
        params: {
          account: wallet.classic_address,
          ledger_index: 'validated',
        },
        id: 2,
      }),
    }).catch(() => null);

    let trustlines = [];
    let rlusdBalance = 0;
    let hasRlusdTrustline = false;

    if (trustlineResponse?.ok) {
      const trustlineData = await trustlineResponse.json();
      trustlines = trustlineData.result?.lines || [];
      
      const rlusdLine = trustlines.find(line => line.currency === 'USD');
      if (rlusdLine && parseFloat(rlusdLine.limit) > 0) {
        rlusdBalance = parseFloat(rlusdLine.balance).toFixed(2);
        hasRlusdTrustline = true;
      }
    }

    return Response.json({
      xrp: parseFloat(xrpBalance),
      rlusd: parseFloat(rlusdBalance),
      has_rlusd_trustline: hasRlusdTrustline,
      trustlines: trustlines.map(t => ({
        currency: t.currency,
        balance: t.balance,
        limit: t.limit,
        issuer: t.account,
      })),
      reserve_xrp: 10,
      available_xrp: Math.max(0, parseFloat(xrpBalance) - 10),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});