import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, xrpToDrops } from 'npm:xrpl@4.2.1';

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

        // Prepare and submit funding transaction
        const payment = {
            TransactionType: 'Payment',
            Account: senderWallet.address,
            Destination: newWallet.address,
            Amount: xrpToDrops(fundAmount)
        };

        if (agentId) {
            payment.DestinationTag = parseInt(agentId);
        }

        const prepared = await client.autofill(payment);
        const signed = senderWallet.sign(prepared);
        const response = await client.submitAndWait(signed.tx_blob);

        // Store wallet in database
        const walletData = await base44.asServiceRole.entities.Wallet.create({
            name: walletName,
            classic_address: newWallet.address,
            encrypted_seed: newWallet.seed,
            network: 'mainnet',
            balance: fundAmount
        });

        // Create transaction record
        await base44.asServiceRole.entities.Transaction.create({
            recipient_name: walletName,
            recipient_address: newWallet.address,
            amount: fundAmount,
            status: 'completed',
            hash: response.result.hash,
            note: `Axi autonomously created and funded wallet for ${walletName}`
        });

        // Create memory of wallet creation
        await base44.asServiceRole.entities.Memory.create({
            agent_id: agentId || 'axi',
            type: 'village_detail',
            content: `Created new mainnet wallet: ${walletName} (${newWallet.address}) funded with ${fundAmount} XRP`,
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