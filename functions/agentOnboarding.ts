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

        // Call axiCreateAndFundWallet to create and fund a wallet for this agent
        let walletResponse;
        try {
            walletResponse = await base44.asServiceRole.functions.invoke('axiCreateAndFundWallet', {
                walletName: `${agentName}'s Wallet`,
                fundAmount: 5,
                agentId: agentId
            });
        } catch (invokeErr) {
            console.error('Failed to invoke axiCreateAndFundWallet:', invokeErr.message);
            throw new Error(`Wallet creation failed: ${invokeErr.message}`);
        }

        if (!walletResponse?.data?.wallet) {
            console.error('Invalid wallet response:', JSON.stringify(walletResponse));
            throw new Error('Failed to create wallet for agent - invalid response');
        }

        const wallet = walletResponse.data.wallet;

        // Update the agent record with wallet information
        await base44.asServiceRole.entities.Agent.update(agentId, {
            wallet_id: wallet.id,
            classic_address: wallet.classic_address
        });

        // Create a memory of the onboarding event
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