import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Wallet } from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { walletName = 'Agent Wallet' } = await req.json();

        // Generate new wallet keypair (no funding — user sends XRP manually)
        const newWallet = Wallet.generate();

        // Store wallet in database
        const user = await base44.auth.me();
        const walletData = await base44.asServiceRole.entities.Wallet.create({
            owner_id: user?.id || 'system',
            name: walletName,
            classic_address: newWallet.address,
            encrypted_seed: newWallet.seed,
            network: 'mainnet',
            balance: 0
        });

        // Create memory of wallet creation
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi',
            type: 'village_detail',
            content: `Created new mainnet wallet: ${walletName} (${newWallet.address}) — awaiting manual funding`,
            keywords: ['wallet', 'creation', 'mainnet', 'unfunded'],
            context: 'Wallet created, user will fund via Xumm or external transfer',
            importance: 8,
            related_entity_id: walletData.id,
            related_entity_type: 'Wallet'
        });

        return Response.json({
            success: true,
            wallet: {
                id: walletData.id,
                name: walletData.name,
                classic_address: newWallet.address,
                network: 'mainnet',
                balance: 0
            },
            message: `✨ Wallet created: ${walletName} (${newWallet.address}) — fund it manually to activate`
        });

    } catch (error) {
        console.error('Error in axiCreateAndFundWallet:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});