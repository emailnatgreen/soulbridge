import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all wallets
    const wallets = await base44.asServiceRole.entities.Wallet.list('-created_date', 100);
    
    if (!wallets || wallets.length === 0) {
      return Response.json({ 
        message: 'No wallets found',
        verified: [],
        failing: [],
        total: 0
      });
    }

    const verified = [];
    const failing = [];

    // Check each wallet's DID validity on XRPL
    for (const wallet of wallets) {
      try {
        if (!wallet.classic_address) {
          failing.push({
            id: wallet.id,
            name: wallet.name,
            owner_id: wallet.owner_id,
            reason: 'No classic address stored',
            address: null
          });
          continue;
        }

        // Try to resolve the DID on XRPL
        const xrplUrl = wallet.network === 'mainnet' 
          ? 'https://xrplcluster.com'
          : 'https://s.altnet.rippletest.net:51234';

        const response = await fetch(xrplUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'account_info',
            params: [{
              account: wallet.classic_address,
              ledger_index: 'validated'
            }]
          })
        });

        const result = await response.json();

        if (result.result && result.result.account_data) {
          verified.push({
            id: wallet.id,
            name: wallet.name,
            owner_id: wallet.owner_id,
            address: wallet.classic_address,
            network: wallet.network,
            balance: result.result.account_data.Balance,
            flags: result.result.account_data.Flags,
            verified_at: new Date().toISOString()
          });
        } else {
          failing.push({
            id: wallet.id,
            name: wallet.name,
            owner_id: wallet.owner_id,
            address: wallet.classic_address,
            network: wallet.network,
            reason: 'Account not found on XRPL',
            error: result.error?.message || 'Unknown error'
          });
        }
      } catch (error) {
        failing.push({
          id: wallet.id,
          name: wallet.name,
          owner_id: wallet.owner_id,
          address: wallet.classic_address,
          network: wallet.network,
          reason: 'XRPL verification failed',
          error: error.message
        });
      }
    }

    return Response.json({
      total: wallets.length,
      verified_count: verified.length,
      failing_count: failing.length,
      verified,
      failing,
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});