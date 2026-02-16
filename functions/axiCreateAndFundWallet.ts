import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, convertStringToHex } from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { walletName = 'Agent Wallet', fundAmount = 10, agentId } = await req.json();

        // Connect to mainnet
        const client = new Client('wss://xrplcluster.com');
        await client.connect();

        // Generate new wallet
        const newWallet = Wallet.generate();

        // Get Axi's sender seed from environment
        const senderSeed = Deno.env.get('XRPL_SENDER_SEED');
        if (!senderSeed) {
            await client.disconnect();
            return Response.json({ 
                error: 'Sender seed not configured' 
            }, { status: 500 });
        }

        const senderWallet = Wallet.fromSeed(senderSeed);

        // Create funding transaction
        const tx = {
            transaction_type: 'Payment',
            account: senderWallet.classicAddress,
            destination: newWallet.classicAddress,
            amount: String(Math.floor(fundAmount * 1000000)), // Convert XRP to drops
            destination_tag: agentId ? parseInt(agentId) : undefined
        };

        // Sign and submit
        const response = await client.submitAndWait(tx, { wallet: senderWallet });

        // Store wallet in database
        const walletData = await base44.asServiceRole.entities.Wallet.create({
            name: walletName,
            classic_address: newWallet.classicAddress,
            encrypted_seed: newWallet.seed,
            network: 'mainnet',
            balance: fundAmount
        });

        // Create transaction record
        await base44.asServiceRole.entities.Transaction.create({
            recipient_name: walletName,
            recipient_address: newWallet.classicAddress,
            amount: fundAmount,
            status: 'completed',
            hash: response.result.hash,
            note: `Axi autonomously created and funded wallet for ${walletName}`
        });

        // Create memory of wallet creation
        await base44.asServiceRole.entities.Memory.create({
            agent_id: agentId || 'axi',
            type: 'village_detail',
            content: `Created new mainnet wallet: ${walletName} (${newWallet.classicAddress}) funded with ${fundAmount} XRP`,
            keywords: ['wallet', 'creation', 'mainnet', 'funding'],
            context: 'Axi autonomously manages Village wallets',
            importance: 8,
            related_entity_id: walletData.id,
            related_entity_type: 'Wallet'
        });

        await client.disconnect();

        return Response.json({
            success: true,
            wallet: {
                id: walletData.id,
                name: walletData.name,
                classic_address: newWallet.classicAddress,
                seed: newWallet.seed,
                network: 'mainnet',
                balance: fundAmount,
                transaction_hash: response.result.hash
            },
            message: `✨ Axi created and funded ${walletName} with ${fundAmount} XRP on mainnet`
        });

    } catch (error) {
        console.error('Error in axiCreateAndFundWallet:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});