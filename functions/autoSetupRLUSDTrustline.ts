import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process wallets with classic_address and sufficient balance
    if (!data.classic_address || !data.balance || data.balance < 1.2) {
      return Response.json({ 
        skipped: true, 
        reason: 'Wallet not ready (no address or insufficient balance)' 
      });
    }

    // Only process mainnet wallets
    if (data.network !== 'mainnet') {
      return Response.json({ 
        skipped: true, 
        reason: 'Testnet wallets do not require RLUSD trustline' 
      });
    }

    // Check if trustline already exists
    if (data.metadata?.has_rlusd_trustline) {
      return Response.json({ 
        skipped: true, 
        reason: 'RLUSD trustline already exists' 
      });
    }

    console.log(`🤖 Auto-setting up RLUSD trustline for wallet ${event.entity_id}`);

    // Call the addRLUSDTrustline function
    const result = await base44.asServiceRole.functions.invoke('addRLUSDTrustline', {
      wallet_id: event.entity_id
    });

    if (result.data.success) {
      console.log(`✅ RLUSD trustline auto-configured for ${data.classic_address}`);
      return Response.json({ 
        success: true, 
        message: 'RLUSD trustline automatically configured',
        transaction_hash: result.data.transaction_hash
      });
    } else {
      return Response.json({ 
        success: false, 
        error: result.data.error 
      });
    }

  } catch (error) {
    console.error('Auto trustline setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});