import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, dropsToXrp } from 'npm:xrpl@3.0.0';

const RLUSD_HEX = "524C555344000000000000000000000000000000";

function parseTransaction(tx, accountAddress) {
  const raw = tx.tx || tx;
  const meta = tx.meta || tx.metaData || {};

  const txType = raw.TransactionType || 'Unknown';
  const hash = raw.hash;
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
      // XRP in drops
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
      return Response.json({ 
        success: true, 
        transactions: [], 
        wallet_address: null, 
        network: walletRecord.network || 'testnet' 
      });
    }

    const networkUrl = walletRecord.network === 'mainnet'
      ? 'wss://xrpl.ws'
      : 'wss://s.altnet.rippletest.net:51233';

    const client = new Client(networkUrl);
    let transactions = [];
    
    try {
      await client.connect();
      try {
        const response = await client.request({
          command: 'account_tx',
          account: walletRecord.classic_address,
          limit: Math.min(limit, 200),
          ledger_index_min: -1,
          ledger_index_max: -1,
          forward: false,
        });
        transactions = (response.result.transactions || []).map(tx =>
          parseTransaction(tx, walletRecord.classic_address)
        );
      } catch (err) {
        // Account not found / not activated / malformed — return empty
        console.log('account_tx failed:', err.message);
      } finally {
        try { await client.disconnect(); } catch (_) { /* ignore disconnect errors */ }
      }
    } catch (connectErr) {
      console.error('Client connection error:', connectErr.message);
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