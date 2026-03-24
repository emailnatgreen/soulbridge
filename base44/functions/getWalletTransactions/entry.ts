import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_address, limit = 50 } = await req.json();

    if (!wallet_address) {
      return Response.json({ error: 'wallet_address required' }, { status: 400 });
    }

    // Query XRPL testnet for account transactions
    const xrplUrl = 'https://s.altnet.rippletest.net:51234/';
    const payload = {
      method: 'account_tx',
      params: {
        account: wallet_address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit: Math.min(limit, 100)
      }
    };

    const response = await fetch(xrplUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.result || !data.result.transactions) {
      return Response.json({ transactions: [] });
    }

    // Transform transactions for display
    const transactions = data.result.transactions.map(txObj => {
      const tx = txObj.tx || {};
      return {
        hash: txObj.hash,
        Account: tx.Account,
        Destination: tx.Destination,
        Amount: tx.Amount,
        TransactionType: tx.TransactionType,
        close_time_iso: txObj.close_time_iso || new Date().toISOString(),
        Fee: tx.Fee,
        Sequence: tx.Sequence
      };
    });

    return Response.json({ transactions });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return Response.json({ error: error.message, transactions: [] }, { status: 500 });
  }
});