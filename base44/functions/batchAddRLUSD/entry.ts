import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { wallet_ids } = await req.json();

        if (!wallet_ids || !Array.isArray(wallet_ids)) {
            return Response.json({ error: 'wallet_ids array required' }, { status: 400 });
        }

        console.log(`🔄 Batch adding RLUSD to ${wallet_ids.length} wallets...`);
        
        const results = [];
        
        for (const wallet_id of wallet_ids) {
            try {
                const wallet = await base44.entities.Wallet.get(wallet_id);
                
                const addResult = await base44.functions.invoke('addRLUSDTrustline', {
                    wallet_id
                });
                
                results.push({
                    wallet_id,
                    address: wallet.classic_address,
                    name: wallet.name || wallet.agent_name,
                    success: addResult.data?.success || false,
                    already_exists: addResult.data?.already_exists || false,
                    transaction_hash: addResult.data?.transaction_hash,
                    error: addResult.data?.error,
                    message: addResult.data?.message
                });
                
                console.log(`${addResult.data?.success ? '✅' : '❌'} ${wallet.name || wallet.agent_name}`);
            } catch (error) {
                results.push({
                    wallet_id,
                    success: false,
                    error: error.message
                });
                console.log(`❌ Wallet ${wallet_id}: ${error.message}`);
            }
        }
        
        const summary = {
            total: results.length,
            successful: results.filter(r => r.success).length,
            already_existed: results.filter(r => r.already_exists).length,
            failed: results.filter(r => !r.success && !r.already_exists).length
        };

        console.log(`\n📊 Summary: ${summary.successful} added, ${summary.already_existed} existed, ${summary.failed} failed`);

        return Response.json({
            summary,
            results,
            message: `Processed ${results.length} wallets`
        });
    } catch (error) {
        console.error('Error in batch RLUSD setup:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});