import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, xrpToDrops } from 'npm:xrpl@4.2.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { agent_ids } = await req.json();

        if (!agent_ids || !Array.isArray(agent_ids)) {
            return Response.json({ error: 'agent_ids array required' }, { status: 400 });
        }

        console.log('🌅 Starting mainnet migration for agents...');

        const client = new Client('wss://xrpl.ws');
        await client.connect();

        const treasurySeed = Deno.env.get('XRPL_SENDER_SEED');
        if (!treasurySeed) {
            throw new Error('XRPL_SENDER_SEED not configured');
        }
        const treasuryWallet = Wallet.fromSeed(treasurySeed);

        const results = [];

        for (const agent_id of agent_ids) {
            try {
                const agent = await base44.entities.Agent.get(agent_id);
                console.log(`\n🔄 Migrating ${agent.name}...`);

                // Generate new mainnet wallet
                const newWallet = Wallet.generate();
                console.log(`  Generated mainnet address: ${newWallet.classicAddress}`);

                // Fund with 2 XRP minimum from treasury
                const payment = {
                    TransactionType: 'Payment',
                    Account: treasuryWallet.classicAddress,
                    Destination: newWallet.classicAddress,
                    Amount: xrpToDrops('2')
                };

                const prepared = await client.autofill(payment);
                const signed = treasuryWallet.sign(prepared);
                const result = await client.submitAndWait(signed.tx_blob);

                console.log(`  💸 Funded with 2 XRP: ${result.result.hash}`);

                // Create new wallet record
                const walletRecord = await base44.asServiceRole.entities.Wallet.create({
                    name: `${agent.name} (Mainnet)`,
                    classic_address: newWallet.classicAddress,
                    seed: newWallet.seed,
                    encrypted_seed: newWallet.seed,
                    network: 'mainnet',
                    balance: 2,
                    agent_name: agent.name,
                    metadata: {
                        has_rlusd_trustline: false,
                        migrated_from_testnet: true,
                        migration_date: new Date().toISOString()
                    }
                });

                // Update agent with new wallet
                await base44.asServiceRole.entities.Agent.update(agent_id, {
                    wallet_id: walletRecord.id,
                    classic_address: newWallet.classicAddress
                });

                console.log(`  ✅ Agent updated with mainnet wallet`);

                results.push({
                    agent_id,
                    agent_name: agent.name,
                    old_address: agent.classic_address,
                    new_address: newWallet.classicAddress,
                    wallet_id: walletRecord.id,
                    transaction_hash: result.result.hash,
                    success: true
                });

            } catch (error) {
                console.error(`  ❌ Failed to migrate agent ${agent_id}:`, error.message);
                results.push({
                    agent_id,
                    success: false,
                    error: error.message
                });
            }
        }

        await client.disconnect();

        console.log('\n📊 Migration Summary:');
        console.log(`  Total: ${results.length}`);
        console.log(`  Successful: ${results.filter(r => r.success).length}`);
        console.log(`  Failed: ${results.filter(r => !r.success).length}`);

        return Response.json({
            success: true,
            results,
            summary: {
                total: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            },
            message: 'Mainnet migration complete'
        });

    } catch (error) {
        console.error('Migration error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});