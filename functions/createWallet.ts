import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet } from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, network = 'mainnet', fund_from_treasury = true } = await req.json();

        // Connect to XRPL Mainnet
        const networkUrl = 'wss://xrpl.ws';
        
        const client = new Client(networkUrl);
        await client.connect();

        // Generate new wallet
        const wallet = Wallet.generate();

        // Fund new wallet from treasury if requested
        if (fund_from_treasury && network === 'mainnet') {
            const treasurySeed = Deno.env.get('XRPL_SENDER_SEED');
            if (treasurySeed) {
                try {
                    const treasuryWallet = Wallet.fromSeed(treasurySeed);
                    const payment = {
                        TransactionType: 'Payment',
                        Account: treasuryWallet.classicAddress,
                        Destination: wallet.classicAddress,
                        Amount: '2000000' // 2 XRP (enough for base + RLUSD reserve)
                    };
                    const prepared = await client.autofill(payment);
                    const signed = treasuryWallet.sign(prepared);
                    await client.submitAndWait(signed.tx_blob);
                    console.log(`✅ Funded ${wallet.classicAddress} with 2 XRP from treasury`);
                } catch (error) {
                    console.log('Treasury funding failed:', error.message);
                }
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

        // Store wallet info in database
        const walletData = await base44.asServiceRole.entities.Wallet.create({
            name: name || `Wallet ${wallet.classicAddress.slice(0, 8)}`,
            classic_address: wallet.classicAddress,
            encrypted_seed: wallet.seed,
            seed: wallet.seed,
            network: 'mainnet',
            balance: balance,
            metadata: {
                has_rlusd_trustline: false,
                created_date: new Date().toISOString()
            }
        });

        // Auto-add RLUSD trustline if wallet has enough XRP
        if (balance >= 1.2) {
            try {
                const rlusdResult = await base44.asServiceRole.functions.invoke('addRLUSDTrustline', {
                    wallet_id: walletData.id
                });
                console.log(`✅ RLUSD auto-configured for ${walletData.name}`);
            } catch (error) {
                console.log(`⚠️ RLUSD auto-config will be done later for ${walletData.name}`);
            }
        }

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