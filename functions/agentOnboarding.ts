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

        // Generate new wallet locally (XRPL funding requires valid sender credentials)
        const { Wallet } = await import('npm:xrpl@3.0.0');
        const newWallet = Wallet.generate();
        
        // Store wallet in database (service role)
        // owner_id should be the agent's user_id, but we'll use the agent_id as placeholder
        const walletData = await base44.asServiceRole.entities.Wallet.create({
            owner_id: agentId,
            name: `${agentName}'s Wallet`,
            classic_address: newWallet.address,
            encrypted_seed: newWallet.seed,
            network: 'testnet',
            balance: 0
        });
        
        const wallet = {
            id: walletData.id,
            classic_address: newWallet.address,
            balance: 0
        };

        // Update the agent record with wallet information (using service role)
        try {
            await base44.asServiceRole.entities.Agent.update(agentId, {
                wallet_id: wallet.id,
                classic_address: wallet.classic_address
            });
        } catch (updateErr) {
            console.error(`Failed to update agent ${agentId}:`, updateErr.message);
            // Don't fail the whole automation if agent update fails
        }

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