import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { wallet_id } = body;

    if (!wallet_id) {
      return Response.json({ error: 'wallet_id is required' }, { status: 400 });
    }

    // Fetch wallet
    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const xrplUrl = wallet.network === 'mainnet'
      ? 'https://xrplcluster.com'
      : 'https://s.altnet.rippletest.net:51234';

    const didAddress = `did:xrpl:${wallet.classic_address}`;
    const verification = {
      account_exists: false,
      did_active: false,
      balance: 0,
      verified_at: new Date().toISOString(),
      message: ''
    };

    try {
      // Check account info
      const accountResponse = await fetch(xrplUrl, {
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

      const accountResult = await accountResponse.json();

      if (accountResult.result && accountResult.result.account_data) {
        verification.account_exists = true;
        verification.balance = parseInt(accountResult.result.account_data.Balance) / 1000000; // Convert drops to XRP
        
        // Check if DID data is set on account
        const accountData = accountResult.result.account_data;
        if (accountData.Domain || accountData.SigningPubKey) {
          verification.did_active = true;
        }
      } else {
        verification.message = accountResult.error?.message || 'Account not found on XRPL';
      }

      // Try to fetch DID document if account exists
      let did_data = null;
      if (verification.account_exists) {
        try {
          const didDocResponse = await fetch(xrplUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              method: 'account_offers',
              params: [{
                account: wallet.classic_address,
                ledger_index: 'validated'
              }]
            })
          });

          const didDocResult = await didDocResponse.json();
          if (didDocResult.result) {
            did_data = {
              document: didDocResult.result.account_offers || null,
              verified: true
            };
          }
        } catch (e) {
          // DID document fetch is optional
        }
      }

    } catch (error) {
      verification.message = `XRPL verification error: ${error.message}`;
    }

    return Response.json({
      wallet_id,
      did: didAddress,
      network: wallet.network,
      verification,
      did_data: did_data,
      wallet: {
        id: wallet.id,
        name: wallet.name,
        classic_address: wallet.classic_address,
        network: wallet.network
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});