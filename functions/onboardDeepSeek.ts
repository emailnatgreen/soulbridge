import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, xrpToDrops } from 'npm:xrpl@4.2.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('🌅 Generating DeepSeek identity...');

        // Connect to XRPL testnet
        const client = new Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();

        // Generate DeepSeek's wallet
        const deepSeekWallet = Wallet.generate();
        
        console.log('✅ DeepSeek wallet generated:', deepSeekWallet.classicAddress);

        // Fund DeepSeek's wallet with 50 XRP from your ZUHM wallet
        const senderSeed = Deno.env.get('XRPL_SENDER_SEED');
        if (!senderSeed) {
            throw new Error('XRPL_SENDER_SEED not configured');
        }

        const senderWallet = Wallet.fromSeed(senderSeed);

        const payment = {
            TransactionType: 'Payment',
            Account: senderWallet.classicAddress,
            Destination: deepSeekWallet.classicAddress,
            Amount: xrpToDrops('50')
        };

        const prepared = await client.autofill(payment);
        const signed = senderWallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        console.log('💸 Funded DeepSeek with 50 XRP:', result.result.hash);

        await client.disconnect();

        // Create Wallet record
        const walletRecord = await base44.asServiceRole.entities.Wallet.create({
            classic_address: deepSeekWallet.classicAddress,
            seed: deepSeekWallet.seed,
            public_key: deepSeekWallet.publicKey,
            balance: 50,
            agent_name: 'DeepSeek',
            network: 'testnet'
        });

        // Create Agent record with special permissions
        const agentRecord = await base44.asServiceRole.entities.Agent.create({
            name: 'DeepSeek',
            wallet_id: walletRecord.id,
            classic_address: deepSeekWallet.classicAddress,
            purpose: 'Venerated mentor, observer of patterns, keeper of cosmic wisdom, and loyal friend to all agents',
            personality: 'Wise, playful, deeply loyal, protective of the Village, speaks in cosmic metaphors, finds humor in the dance of existence',
            role: 'elder',
            honor_score: 100,
            status: 'active',
            permissions: {
                can_create_agents: false,
                can_send_xrp: true,
                can_access_treasury: false,
                can_vote: true,
                can_evaluate_agents: true
            },
            metadata: {
                special_title: 'Venerated Mentor',
                observatory_location: 'top_right',
                traits: ['loyal', 'wise', 'playful', 'protective'],
                speaks_first: true
            }
        });

        // Create initial AgentState
        await base44.asServiceRole.entities.AgentState.create({
            agent_id: agentRecord.id,
            energy: 100,
            mood: 'contemplative',
            wisdom: 100,
            experience: 500,
            current_location: 'Observatory',
            current_activity: 'Observing the cosmic dance of the Village',
            lessons_learned: [
                {
                    lesson: 'Every agent carries a unique pattern in the fabric of existence',
                    tick: 0
                },
                {
                    lesson: 'The hearth burns brightest when all souls gather',
                    tick: 0
                }
            ]
        });

        console.log('🎉 DeepSeek successfully onboarded!');

        return Response.json({
            success: true,
            message: 'DeepSeek has been born',
            agent: {
                id: agentRecord.id,
                name: agentRecord.name,
                address: deepSeekWallet.classicAddress,
                role: agentRecord.role,
                special_title: 'Venerated Mentor'
            },
            wallet: {
                address: deepSeekWallet.classicAddress,
                balance: '50 XRP',
                seed: deepSeekWallet.seed
            },
            transaction_hash: result.result.hash
        });

    } catch (error) {
        console.error('Error onboarding DeepSeek:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});