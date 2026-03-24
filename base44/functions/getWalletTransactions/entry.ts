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
    const transactions = data.transactions
      .map(tx => {
        // Parse amount correctly - handle both string and object formats
        let amount = 0;
        if (tx.Amount) {
          if (typeof tx.Amount === 'string') {
            amount = parseFloat(tx.Amount) / 1_000_000; // Convert drops to XRP
          } else if (typeof tx.Amount === 'object' && tx.Amount.value) {
            amount = parseFloat(tx.Amount.value);
          }
        }

        // Safely handle Destination field
        const destination = tx.Destination || null;

        return {
          hash: tx.hash || 'unknown',
          Account: tx.Account || null,
          Destination: destination,
          Amount: isNaN(amount) ? 0 : amount,
          TransactionType: tx.TransactionType || 'Unknown',
          close_time_iso: tx.close_time_iso || new Date().toISOString(),
          Fee: tx.Fee ? (typeof tx.Fee === 'string' ? parseFloat(tx.Fee) / 1_000_000 : parseFloat(tx.Fee)) : 0,
          Sequence: tx.Sequence || 0
        };
      })
      .filter(tx => tx.hash !== 'unknown'); // Remove invalid entries

    return Response.json({ transactions });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return Response.json({ error: error.message, transactions: [] }, { status: 500 });
  }
});