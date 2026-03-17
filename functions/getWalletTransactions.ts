import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

function dropsToXrp(drops) {
  return (parseInt(drops) / 1_000_000).toString();
}

function parseTransaction(tx, accountAddress) {
  const raw = tx.tx_json || tx.tx || tx;
  const meta = tx.meta || tx.metaData || {};

  const txType = raw.TransactionType || 'Unknown';
  const hash = tx.hash || raw.hash;
  const date = raw.date
    ? new Date((raw.date + 946684800) * 1000).toISOString()
    : null;

  const txResult = meta.TransactionResult || '';
  const status = txResult === 'tesSUCCESS' ? 'success' : 'failed';

  let amount = '0';
  let currency = 'XRP';
  let direction = 'other';
  let counterparty = null;

  if (txType === 'Payment') {
    const amt = raw.Amount;
    if (typeof amt === 'string') {
      amount = dropsToXrp(amt);
      currency = 'XRP';
    } else if (typeof amt === 'object' && amt !== null) {
      amount = amt.value;
      currency = amt.currency?.length > 6 ? 'RLUSD' : (amt.currency || 'UNKNOWN');
    }

    if (raw.Account === accountAddress) {
      direction = 'sent';
      counterparty = raw.Destination;
    } else if (raw.Destination === accountAddress) {
      direction = 'received';
      counterparty = raw.Account;
    }
  } else if (txType === 'TrustSet') {
    const limit = raw.LimitAmount;
    currency = limit?.currency?.length > 6 ? 'RLUSD' : (limit?.currency || 'UNKNOWN');
    amount = limit?.value || '0';
    direction = 'other';
    counterparty = limit?.issuer || null;
  } else {
    direction = 'other';
    counterparty = raw.Account !== accountAddress ? raw.Account : null;
  }

  return { hash, date, type: txType === 'TrustSet' ? 'TrustLine' : txType, direction, amount: String(amount), currency, counterparty, status };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { wallet_id, limit = 50 } = body;
    if (!wallet_id) return Response.json({ error: 'wallet_id required' }, { status: 400 });

    const walletRecord = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!walletRecord) return Response.json({ error: 'Wallet not found' }, { status: 404 });

    if (!walletRecord.classic_address) {
      return Response.json({ success: true, transactions: [], wallet_address: null, network: walletRecord.network || 'testnet' });
    }

    // Use multiple fallback RPC endpoints to avoid rate limits
    const mainnetRpcs = ['https://xrpl.ws/', 'https://xrplcluster.com', 'https://s1.ripple.com'];
    const testnetRpcs = ['https://s.altnet.rippletest.net:51234'];
    const rpcUrls = walletRecord.network === 'mainnet' ? mainnetRpcs : testnetRpcs;

    let transactions = [];

    const payload = JSON.stringify({
      method: 'account_tx',
      params: [{
        account: walletRecord.classic_address,
        limit: Math.min(limit, 200),
        ledger_index_min: -1,
        ledger_index_max: -1,
        forward: false,
      }]
    });

    for (const rpcUrl of rpcUrls) {
      try {
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: AbortSignal.timeout(10000),
        });
        const text = await response.text();
        const data = JSON.parse(text);
        if (data?.result?.transactions) {
          transactions = data.result.transactions.map(tx =>
            parseTransaction(tx, walletRecord.classic_address)
          );
          break; // success, stop trying
        }
      } catch (err) {
        console.log('account_tx fetch failed:', err.message);
      }
    }

    return Response.json({
      success: true,
      transactions,
      wallet_address: walletRecord.classic_address,
      network: walletRecord.network,
      count: transactions.length,
    });

  } catch (error) {
    console.error('getWalletTransactions error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});