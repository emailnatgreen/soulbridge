import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        // Only process agent creation events
        if (event.type !== 'create' || event.entity_name !== 'Agent') {
            return Response.json({ 
                success: false, 
                message: 'Not an Agent creation event' 
            });
        }

        const agentId = event.entity_id;
        const agentName = data?.name;

        if (!agentId || !agentName) {
            return Response.json({ 
                error: 'Missing agent ID or name',
                success: false 
            }, { status: 400 });
        }

        // Inline wallet creation with XRPL integration - testnet for now
        const { Wallet, Client, xrpToDrops } = await import('npm:xrpl@3.0.0');
        
        const xrplClient = new Client('wss://s.altnet.rippletest.net:51233');
        await xrplClient.connect();
        
        const newWallet = Wallet.generate();
        const senderSeed = Deno.env.get('XRPL_SENDER_SEED');
        if (!senderSeed) {
            await xrplClient.disconnect();
            throw new Error('XRPL sender seed not configured');
        }
        
        let senderWallet;
        try {
            senderWallet = Wallet.fromSeed(senderSeed);
        } catch (seedErr) {
            await xrplClient.disconnect();
            throw new Error(`Invalid XRPL seed: ${seedErr.message}`);
        }
        const payment = {
            TransactionType: 'Payment',
            Account: senderWallet.address,
            Destination: newWallet.address,
            Amount: xrpToDrops(5)
        };
        
        const prepared = await xrplClient.autofill(payment);
        const signed = senderWallet.sign(prepared);
        const xrplResponse = await xrplClient.submitAndWait(signed.tx_blob);
        await xrplClient.disconnect();
        
        // Store wallet in database (service role)
        const walletData = await base44.asServiceRole.entities.Wallet.create({
            name: `${agentName}'s Wallet`,
            classic_address: newWallet.address,
            encrypted_seed: newWallet.seed,
            network: 'testnet',
            balance: 5
        });
        
        const wallet = {
            id: walletData.id,
            classic_address: newWallet.address,
            balance: 5,
            transaction_hash: xrplResponse.result.hash
        };

        // Update the agent record with wallet information (using service role)
        await base44.asServiceRole.entities.Agent.update(agentId, {
            wallet_id: wallet.id,
            classic_address: wallet.classic_address
        });

        // Create a memory of the onboarding event (using service role)
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi',
            type: 'village_detail',
            content: `Agent ${agentName} (${agentId}) onboarded and assigned mainnet wallet ${wallet.classic_address} with 5 XRP`,
            keywords: ['onboarding', 'agent', 'wallet', 'creation'],
            context: 'Axi automated agent onboarding process',
            importance: 9,
            related_entity_id: agentId,
            related_entity_type: 'Agent'
        });

        return Response.json({
            success: true,
            agent_id: agentId,
            agent_name: agentName,
            wallet: {
                id: wallet.id,
                classic_address: wallet.classic_address,
                balance: wallet.balance,
                transaction_hash: wallet.transaction_hash
            },
            message: `✨ Agent ${agentName} successfully onboarded with wallet ${wallet.classic_address}`
        });

    } catch (error) {
        console.error('Error in agentOnboarding:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});