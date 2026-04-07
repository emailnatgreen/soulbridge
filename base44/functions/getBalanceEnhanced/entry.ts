import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAINNET_NODES = [
  'https://xrplcluster.com',
  'https://s1.ripple.com:51234',
  'https://s2.ripple.com:51234',
];

const TESTNET_NODES = [
  'https://s.altnet.rippletest.net:51234',
  'https://testnet.xrpl-labs.com',
];

async function xrplRequest(nodes, body) {
  for (const node of nodes) {
    try {
      const resp = await fetch(node, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.log(`Node ${node} HTTP ${resp.status}: ${text.slice(0, 100)}`);
        continue;
      }

      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        const text = await resp.text().catch(() => '');
        console.log(`Node ${node} non-JSON response: ${text.slice(0, 100)}`);
        continue;
      }

      const data = await resp.json();
      if (data.result?.error === 'rateLimited' || data.result?.error === 'slowDown') {
        console.log(`Node ${node} rate limited, trying next`);
        continue;
      }

      return data;
    } catch (e) {
      console.log(`Node ${node} error: ${e.message}`);
      continue;
    }
  }
  return null;
}

function decodeHexCurrency(hex) {
  if (hex.length <= 3) return hex;
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substring(i, i + 2), 16);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str || hex;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      console.log('Auth check failed, trying service role:', authErr.message);
    }
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
    const nodes = isTestnet ? TESTNET_NODES : MAINNET_NODES;

    // Get account info for XRP balance
    const accountData = await xrplRequest(nodes, {
      method: 'account_info',
      params: [{ account: wallet.classic_address, ledger_index: 'validated' }],
    });

    let xrpBalance = 0;
    if (accountData?.result?.account_data?.Balance) {
      xrpBalance = parseInt(accountData.result.account_data.Balance) / 1000000;
    }

    // Small delay between calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));

    // Get trustlines
    const trustlineData = await xrplRequest(nodes, {
      method: 'account_lines',
      params: [{ account: wallet.classic_address, ledger_index: 'validated' }],
    });

    let trustlines = [];
    let rlusdBalance = 0;
    let hasRlusdTrustline = false;

    if (trustlineData?.result?.lines) {
      trustlines = trustlineData.result.lines;

      // Check for RLUSD trustline — match all known representations
      const rlusdLine = trustlines.find(line => {
        const c = (line.currency || '').toUpperCase();
        const decoded = decodeHexCurrency(c);
        return c === '524C555344000000000000000000000000000000' ||
               decoded === 'RLUSD' ||
               c === 'RLUSD' ||
               c === 'USD';
      });
      if (rlusdLine) {
        hasRlusdTrustline = true;
        rlusdBalance = parseFloat(rlusdLine.balance || '0');
        console.log(`[getBalanceEnhanced] RLUSD found: balance=${rlusdBalance}, currency=${rlusdLine.currency}, issuer=${rlusdLine.account}`);
      } else {
        console.log(`[getBalanceEnhanced] No RLUSD trustline found. Trustline currencies: ${trustlines.map(t => decodeHexCurrency(t.currency)).join(', ')}`);
      }
    }

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