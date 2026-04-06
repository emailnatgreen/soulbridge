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

    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const isTestnet = wallet.network === 'testnet';
    const rpcUrl = isTestnet
      ? 'https://s.altnet.rippletest.net:51234'
      : 'https://xrplcluster.com';

    // Get account info for XRP balance
    const accountResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_info',
        params: [{ account: wallet.classic_address, ledger_index: 'validated' }],
      }),
      signal: AbortSignal.timeout(10000),
    }).catch(e => { console.log('account_info fetch error:', e.message); return null; });

    let xrpBalance = 0;
    if (accountResponse?.ok) {
      const accountData = await accountResponse.json();
      const rawBalance = accountData.result?.account_data?.Balance;
      if (rawBalance) {
        xrpBalance = parseInt(rawBalance) / 1000000;
      }
    }

    // Get trustlines
    const trustlineResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_lines',
        params: [{ account: wallet.classic_address, ledger_index: 'validated' }],
      }),
      signal: AbortSignal.timeout(10000),
    }).catch(e => { console.log('account_lines fetch error:', e.message); return null; });

    let trustlines = [];
    let rlusdBalance = 0;
    let hasRlusdTrustline = false;

    if (trustlineResponse?.ok) {
      const trustlineData = await trustlineResponse.json();
      trustlines = trustlineData.result?.lines || [];
      
      // Check for rLUSD trustline — currency code is 'USD' or hex-encoded 'RLUSD'
      const rlusdLine = trustlines.find(line => 
        line.currency === 'USD' || 
        line.currency === '524C555344000000000000000000000000000000' ||
        line.currency === 'RLUSD'
      );
      if (rlusdLine) {
        hasRlusdTrustline = true;
        rlusdBalance = parseFloat(rlusdLine.balance || '0');
      }
    }

    // Format trustlines for display
    const decodeHexCurrency = (hex) => {
      if (hex.length <= 3) return hex;
      let str = '';
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substring(i, i + 2), 16);
        if (code === 0) break;
        str += String.fromCharCode(code);
      }
      return str || hex;
    };

    const formattedTrustlines = trustlines.map(t => ({
      currency: decodeHexCurrency(t.currency),
      raw_currency: t.currency,
      balance: t.balance,
      limit: t.limit,
      issuer: t.account,
    }));

    return Response.json({
      xrp: parseFloat(xrpBalance.toFixed(6)),
      rlusd: parseFloat(rlusdBalance.toFixed(2)),
      has_rlusd_trustline: hasRlusdTrustline,
      trustlines: formattedTrustlines,
      reserve_xrp: 10,
      available_xrp: parseFloat(Math.max(0, xrpBalance - 10).toFixed(6)),
      network: wallet.network || 'mainnet',
      classic_address: wallet.classic_address,
    });
  } catch (error) {
    console.error('getBalanceEnhanced error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});