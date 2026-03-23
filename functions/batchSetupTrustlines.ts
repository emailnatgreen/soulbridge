import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet } from 'npm:xrpl@4.0.0';

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
        
        // Call the addRLUSDTrustline function with service role
        const response = await fetch(`${Deno.env.get('BASE44_API_URL')}/apps/${Deno.env.get('BASE44_APP_ID')}/functions/addRLUSDTrustline/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ wallet_id: wallet.id })
        });

        const result = await response.json();

        if (result.success) {
          console.log(`✅ Trustline set up for ${wallet.name}`);
          results.successful++;
        } else {
          console.log(`❌ Failed for ${wallet.name}: ${result.error}`);
          results.failed++;
          results.errors.push({ wallet: wallet.name, error: result.error });
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