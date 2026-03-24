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

    // Use XRPScan API to fetch transactions
    const response = await fetch(`https://xrpscan.com/api/v1/account/${wallet_address}/transactions?limit=${Math.min(limit, 100)}`);
    const data = await response.json();

    if (!data.transactions || data.transactions.length === 0) {
      return Response.json({ transactions: [] });
    }

    // Transform transactions for display
    const transactions = data.transactions.map(tx => ({
      hash: tx.hash,
      Account: tx.Account,
      Destination: tx.Destination,
      Amount: tx.Amount || '0',
      TransactionType: tx.TransactionType,
      close_time_iso: tx.close_time_iso,
      Fee: tx.Fee,
      Sequence: tx.Sequence
    }));

    return Response.json({ transactions });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return Response.json({ error: error.message, transactions: [] }, { status: 500 });
  }
});