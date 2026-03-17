import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function decodeCurrency(currency) {
  if (!currency) return 'UNKNOWN';
  if (currency.length === 3) return currency;
  try {
    const hex = currency.replace(/^0+|0+$/g, '');
    const decoded = hex.match(/.{1,2}/g)
      ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
      .join('')
      .replace(/\x00/g, '')
      .trim();
    return decoded && decoded.length > 0 ? decoded : currency.slice(0, 8) + '…';
  } catch {
    return currency.slice(0, 8) + '…';
  }
}

function dropsToXrp(drops) {
  if (!drops) return 0;
  return parseFloat(drops) / 1000000;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { address, wallet_id, network } = await req.json();

    let checkAddress = address;
    let walletNetwork = network || 'mainnet';

    if (wallet_id) {
      const wallet = await base44.entities.Wallet.get(wallet_id);
      if (!checkAddress) checkAddress = wallet?.classic_address;
      walletNetwork = wallet?.network || walletNetwork;
    }

    if (!checkAddress) {
      return Response.json({ error: 'address or wallet_id required' }, { status: 400 });
    }

    // Use stable XRPL JSON-RPC HTTP endpoints
    const rpcUrl = walletNetwork === 'testnet'
      ? 'https://s.altnet.rippletest.net:51234'
      : 'https://s1.ripple.com:51234';

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_info',
        params: [{ account: checkAddress, ledger_index: 'validated' }]
      })
    }).catch(() => null);

    if (!response) {
      return Response.json({
        address: checkAddress,
        xrp_balance: 0,
        trustline_count: 0,
        trustlines: [],
        note: 'Could not connect to XRPL node'
      });
    }

    const data = await response.json();
    const result = data.result ?? data;

    let xrp_balance = 0;
    if (result?.account_data?.Balance) {
      xrp_balance = dropsToXrp(result.account_data.Balance);
    } else if (result?.error === 'actNotFound') {
      return Response.json({
        address: checkAddress,
        xrp_balance: 0,
        not_activated: true,
        trustline_count: 0,
        trustlines: []
      });
    }

    // Fetch trustlines
    const linesResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'account_lines',
        params: [{ account: checkAddress, ledger_index: 'validated' }]
      })
    }).catch(() => null);

    let trustlines = [];
    if (linesResponse) {
      const linesData = await linesResponse.json();
      const linesResult = linesData.result ?? linesData;
      trustlines = (linesResult?.lines || []).map(line => ({
        currency_code: line.currency,
        currency_display: decodeCurrency(line.currency),
        issuer: line.account,
        balance: parseFloat(line.balance),
        limit: parseFloat(line.limit),
        limit_peer: parseFloat(line.limit_peer),
        no_ripple: line.no_ripple ?? false,
        freeze: line.freeze ?? false,
        quality_in: line.quality_in,
        quality_out: line.quality_out
      }));
    }

    return Response.json({
      address: checkAddress,
      xrp_balance,
      trustline_count: trustlines.length,
      trustlines
    });

  } catch (error) {
    console.error('getWalletTrustlines error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});