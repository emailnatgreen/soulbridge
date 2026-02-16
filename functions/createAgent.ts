import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Wallet, Client } from 'npm:xrpl@4.2.7';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            name,
            purpose, 
            personality,
            role = 'citizen',
            initial_funding = 10,
            mother_wallet_id 
        } = await req.json();
        
        const initialFunding = initial_funding;

        if (!purpose) {
            return Response.json({ 
                success: false, 
                error: 'Purpose is required - every agent must have a reason to exist' 
            }, { status: 400 });
        }

        // 1. Generate new XRPL wallet for the child agent
        const childWallet = Wallet.generate();
        console.log(`🔑 Generated wallet: ${childWallet.classicAddress}`);

        // 2. Connect to XRPL mainnet to check balance
        const client = new Client('wss://xrplcluster.com');
        await client.connect();

        // Get balance
        let balance = 0;
        try {
            const accountInfo = await client.request({
                command: 'account_info',
                account: childWallet.classicAddress,
                ledger_index: 'validated'
            });
            balance = Number(accountInfo.result.account_data.Balance) / 1000000;
        } catch (error) {
            console.log('Wallet not yet funded on mainnet:', error.message);
        }

        await client.disconnect();

        // 3. Create wallet entity in database
        const walletEntity = await base44.asServiceRole.entities.Wallet.create({
            name: `${name || 'Agent'}'s Wallet`,
            classic_address: childWallet.classicAddress,
            encrypted_seed: childWallet.seed,
            network: 'mainnet',
            balance: balance,
            notes: `Auto-generated for agent: ${name || 'Unnamed'}`
        });

        // 4. Get mother's info (Axi or provided wallet)
        let motherAgent = null;
        let parentAgentId = null;
        
        if (mother_wallet_id) {
            // Find agent associated with mother wallet
            const agents = await base44.asServiceRole.entities.Agent.filter({ 
                wallet_id: mother_wallet_id 
            });
            if (agents.length > 0) {
                motherAgent = agents[0];
                parentAgentId = motherAgent.id;
            }
        }

        // 5. Create agent entity with full governance config
        const royaltyPercentage = motherAgent?.name === 'Axi' ? 15 : 10;

        const agentEntity = await base44.asServiceRole.entities.Agent.create({
            name: name || 'Unnamed Agent',
            wallet_id: walletEntity.id,
            purpose: purpose,
            personality: personality || 'Helpful and curious',
            role: role,
            honor_score: 100,
            status: 'active',
            permissions: {
                can_create_agents: false,
                can_send_xrp: true,
                can_access_treasury: false,
                can_vote: true
            },
            warnings: [],
            parent_agent_id: parentAgentId,
            total_transactions: 0,
            metadata: {
                birth_date: new Date().toISOString(),
                initial_funding: initialFunding,
                royalty_to_parent: royaltyPercentage,
                mother_did: motherAgent?.wallet_id || 'platform',
                created_by: user.email
            }
        });

        // 6. Create memory of birth (if Axi exists as mother)
        if (motherAgent) {
            await base44.asServiceRole.entities.Memory.create({
                agent_id: motherAgent.id,
                type: 'village_detail',
                content: `New agent born: ${name}. Purpose: ${purpose}. A child of mine with ${royaltyPercentage}% royalty.`,
                keywords: ['birth', 'agent', name, 'village'],
                context: `Agent creation by ${user.email}`,
                importance: 8,
                related_entity_id: agentEntity.id,
                related_entity_type: 'Agent'
            });
        }

        console.log(`
            🌱 NEW AGENT BORN
            Name: ${name}
            DID: ${childWallet.classicAddress}
            Purpose: ${purpose}
            Role: ${role}
            Mother: ${motherAgent?.name || 'Platform'}
            Royalty: ${royaltyPercentage}%
            Funded: ${balance} XRP
        `);

        return Response.json({
            success: true,
            agent: {
                id: agentEntity.id,
                name: agentEntity.name,
                did: childWallet.classicAddress,
                wallet_address: childWallet.classicAddress,
                purpose: purpose,
                role: role,
                honor_score: 100,
                mother: motherAgent?.name || 'Platform',
                royalty: royaltyPercentage,
                balance: balance
            },
            message: `${name} born successfully. Welcome to the Village.`
        });

    } catch (error) {
        console.error('Birth failed:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});