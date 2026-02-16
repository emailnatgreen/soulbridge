import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client } from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { wallet_id } = await req.json();

        // Get wallet from database
        const walletData = await base44.entities.Wallet.get(wallet_id);
        
        if (!walletData) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        // Connect to XRPL
        const networkUrl = walletData.network === 'mainnet' 
            ? 'wss://xrplcluster.com' 
            : 'wss://s.altnet.rippletest.net:51233';
        
        const client = new Client(networkUrl);
        await client.connect();

        // Get balance
        const response = await client.request({
            command: 'account_info',
            account: walletData.classic_address,
            ledger_index: 'validated'
        });

        const balance = Number(response.result.account_data.Balance) / 1000000;

        await client.disconnect();

        // Update balance in database
        await base44.entities.Wallet.update(wallet_id, { balance });

        return Response.json({
            success: true,
            balance: balance,
            classic_address: walletData.classic_address
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});