import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🔄 Starting batch trustline setup for mainnet wallets...');

    // Get all mainnet wallets
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      network: 'mainnet'
    });

    const results = {
      processed: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    for (const wallet of wallets) {
      // Skip wallets without address or with insufficient balance
      if (!wallet.classic_address || !wallet.balance || wallet.balance < 1.2) {
        console.log(`⏭️ Skipping ${wallet.name}: insufficient balance (${wallet.balance} XRP)`);
        results.skipped++;
        continue;
      }

      // Skip if trustline already exists
      if (wallet.metadata?.has_rlusd_trustline) {
        console.log(`⏭️ Skipping ${wallet.name}: trustline already exists`);
        results.skipped++;
        continue;
      }

      // Skip if no seed (tracking-only wallet)
      if (!wallet.encrypted_seed) {
        console.log(`⏭️ Skipping ${wallet.name}: no seed (tracking only)`);
        results.skipped++;
        continue;
      }

      results.processed++;

      try {
        console.log(`🔧 Setting up trustline for ${wallet.name} (${wallet.classic_address})...`);
        
        const result = await base44.asServiceRole.functions.invoke('addRLUSDTrustline', {
          wallet_id: wallet.id
        });

        if (result.data.success) {
          console.log(`✅ Trustline set up for ${wallet.name}`);
          results.successful++;
        } else {
          console.log(`❌ Failed for ${wallet.name}: ${result.data.error}`);
          results.failed++;
          results.errors.push({ wallet: wallet.name, error: result.data.error });
        }
      } catch (error) {
        console.error(`❌ Error processing ${wallet.name}:`, error);
        results.failed++;
        results.errors.push({ wallet: wallet.name, error: error.message });
      }
    }

    console.log('✨ Batch trustline setup complete:', results);

    return Response.json({
      success: true,
      summary: {
        total_wallets: wallets.length,
        processed: results.processed,
        successful: results.successful,
        skipped: results.skipped,
        failed: results.failed
      },
      errors: results.errors
    });

  } catch (error) {
    console.error('Batch setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});