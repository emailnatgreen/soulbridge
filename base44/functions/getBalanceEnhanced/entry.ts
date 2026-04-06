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
      ? 'https://s.altnet.rippletest.net'
      : 'https://s1.ripple.com';

    // Get account info for XRP balance
    const accountRequest = {
      method: 'account_info',
      account: wallet.classic_address,
      ledger_index: 'validated',
    };

    const accountResponse = await fetch(xrplApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'account_info', params: { account: wallet.classic_address, ledger_index: 'validated' }, id: 1 }),
    });

    const accountData = await accountResponse.json();
    const xrpBalance = accountData.result?.account_data?.Balance
      ? (parseInt(accountData.result.account_data.Balance) / 1000000).toFixed(2)
      : 0;

    // Get trustlines for rLUSD
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
        id: 1,
      }),
    });

    const trustlineData = await trustlineResponse.json();
    const rlusdLine = trustlineData.result?.lines?.find(
      line => line.currency === 'USD' && line.account === 'rN7n7otQDd6FczFgLdlqtyMVrn3MtAj58'
    );
    const rlusdBalance = rlusdLine?.balance ? parseFloat(rlusdLine.balance).toFixed(2) : 0;
    const hasRlusdTrustline = !!rlusdLine;

    return Response.json({
      xrp: xrpBalance,
      rlusd: rlusdBalance,
      has_rlusd_trustline: hasRlusdTrustline,
      reserve_xrp: 10,
      available_xrp: Math.max(0, parseFloat(xrpBalance) - 10),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});