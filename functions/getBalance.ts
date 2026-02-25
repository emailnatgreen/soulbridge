import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client } from 'npm:xrpl@3.0.0';

async function logWalletAccess(base44, walletId, userId, userEmail, action, success = true, error = null) {
    try {
        await base44.asServiceRole.entities.WalletAccessLog.create({
            wallet_id: walletId,
            user_id: userId,
            user_email: userEmail,
            action: action,
            success: success,
            error_message: error
        });
    } catch (err) {
        console.error('Failed to log wallet access:', err);
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    let user;
    
    try {
        user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { wallet_id } = await req.json();

        // Get wallet from database
        const walletData = await base44.entities.Wallet.get(wallet_id);
        
        if (!walletData) {
            await logWalletAccess(base44, wallet_id, user.id, user.email, 'balance_check', false, 'Wallet not found');
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        // Verify ownership (allow admins and Treasury wallet access)
        const isTreasury = walletData.name === 'Treasury' || walletData.wallet_type === 'treasury';
        const isAdmin = user.role === 'admin';
        const isOwner = walletData.owner_id === user.id;
        
        if (!isOwner && !isAdmin && !isTreasury) {
            await logWalletAccess(base44, wallet_id, user.id, user.email, 'balance_check', false, 'Access denied - not owner');
            return Response.json({ error: 'Access denied: You do not own this wallet' }, { status: 403 });
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

        // Update balance and last accessed
        await base44.asServiceRole.entities.Wallet.update(wallet_id, { 
            balance,
            last_accessed: new Date().toISOString()
        });

        // Log successful access
        await logWalletAccess(base44, wallet_id, user.id, user.email, 'balance_check', true);

        return Response.json({
            success: true,
            balance: balance,
            classic_address: walletData.classic_address
        });

    } catch (error) {
        if (user) {
            await logWalletAccess(base44, null, user.id, user.email, 'balance_check', false, error.message);
        }
        
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});