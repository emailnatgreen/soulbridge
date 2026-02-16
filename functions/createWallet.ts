import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet } from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, network = 'testnet' } = await req.json();

        // Connect to XRPL
        const networkUrl = network === 'mainnet' 
            ? 'wss://xrplcluster.com' 
            : 'wss://s.altnet.rippletest.net:51233';
        
        const client = new Client(networkUrl);
        await client.connect();

        // Generate new wallet
        const wallet = Wallet.generate();

        // Fund testnet wallet if needed
        if (network === 'testnet') {
            try {
                await client.fundWallet(wallet);
            } catch (error) {
                console.log('Testnet funding not available, continuing...');
            }
        }

        // Get balance
        let balance = 0;
        try {
            const response = await client.request({
                command: 'account_info',
                account: wallet.classicAddress,
                ledger_index: 'validated'
            });
            balance = Number(response.result.account_data.Balance) / 1000000;
        } catch (error) {
            console.log('Could not fetch balance:', error.message);
        }

        await client.disconnect();

        // Store wallet info in database (in production, encrypt the seed properly)
        const walletData = await base44.entities.Wallet.create({
            name: name || `Wallet ${wallet.classicAddress.slice(0, 8)}`,
            classic_address: wallet.classicAddress,
            encrypted_seed: wallet.seed, // In production: encrypt this!
            network: network,
            balance: balance
        });

        return Response.json({
            success: true,
            wallet: {
                id: walletData.id,
                name: walletData.name,
                classic_address: wallet.classicAddress,
                seed: wallet.seed,
                network: network,
                balance: balance
            },
            message: '🪪 Wallet created successfully!'
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});