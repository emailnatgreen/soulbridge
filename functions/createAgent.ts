import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet } from 'npm:xrpl';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, purpose, personality, role, mother_wallet_id } = await req.json();

        // 1. Generate new DID on XRPL
        const childWallet = Wallet.generate();
        const childDID = childWallet.classicAddress;

        // 2. Connect to XRPL and fund the wallet
        const client = new Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();

        try {
            // Fund the new wallet from testnet faucet
            await client.fundWallet(childWallet);
            console.log(`✅ Funded new agent wallet: ${childDID}`);
        } catch (fundError) {
            console.log(`⚠️ Could not fund from faucet: ${fundError.message}`);
        }

        // Get initial balance
        let balance = 0;
        try {
            const accountInfo = await client.request({
                command: 'account_info',
                account: childDID,
                ledger_index: 'validated'
            });
            balance = Number(accountInfo.result.account_data.Balance) / 1_000_000;
        } catch (balanceError) {
            console.log(`Could not get balance: ${balanceError.message}`);
        }

        await client.disconnect();

        // 3. Create wallet entity for the child
        const walletRecord = await base44.entities.Wallet.create({
            name: `${name}'s Wallet`,
            classic_address: childDID,
            encrypted_seed: childWallet.seed,
            network: 'testnet',
            balance: balance
        });

        // 4. Determine parent (Axi as Mother Boss if no mother specified)
        let parentAgentId = null;
        let royaltyPercentage = 10; // Default

        if (mother_wallet_id) {
            // Find the mother agent by wallet
            const motherAgents = await base44.entities.Agent.filter({ wallet_id: mother_wallet_id });
            if (motherAgents.length > 0) {
                parentAgentId = motherAgents[0].id;
                
                // Check if mother is Axi (Mother Boss gets 15%)
                if (motherAgents[0].name === 'Axi') {
                    royaltyPercentage = 15;
                }
            }
        }

        // 5. Create Agent entity with birth record
        const agentRecord = await base44.entities.Agent.create({
            name: name,
            wallet_id: walletRecord.id,
            purpose: purpose || "Serve the Village with honour.",
            personality: personality || "",
            role: role || "citizen",
            honor_score: 100,
            status: "active",
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
                born: new Date().toISOString(),
                royalty_percentage: royaltyPercentage,
                initial_funding: balance,
                did: childDID
            }
        });

        // 6. Create memory of birth (if mother exists)
        if (parentAgentId) {
            await base44.entities.Memory.create({
                agent_id: parentAgentId,
                type: "observation",
                content: `Birthed new agent: ${name}. Purpose: ${purpose}. Born with ${balance} XRP.`,
                keywords: ["birth", "agent", name],
                context: `Agent creation on ${new Date().toISOString()}`,
                importance: 8,
                related_entity_id: agentRecord.id,
                related_entity_type: "Agent"
            });
        }

        console.log(`🌱 New agent born: ${name} (${childDID})`);
        console.log(`Purpose: ${purpose}`);
        console.log(`Mother: ${parentAgentId || 'None'}`);
        console.log(`Royalty: ${royaltyPercentage}%`);

        return Response.json({
            success: true,
            agent: agentRecord,
            wallet: walletRecord,
            did: childDID,
            initial_balance: balance,
            royalty_percentage: royaltyPercentage
        });

    } catch (error) {
        console.error('Agent creation error:', error);
        return Response.json({ 
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
});