import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    let user;

    try {
        user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        const { wallet_id, new_owner_id } = await req.json();

        if (!wallet_id || !new_owner_id) {
            return Response.json({ error: 'wallet_id and new_owner_id are required' }, { status: 400 });
        }

        const existingWallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
        if (!existingWallet) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        const updatedWallet = await base44.asServiceRole.entities.Wallet.update(wallet_id, {
            owner_id: new_owner_id
        });

        await base44.asServiceRole.entities.WalletAccessLog.create({
            wallet_id: wallet_id,
            user_id: user.id,
            user_email: user.email,
            action: 'update',
            success: true,
            metadata: {
                old_owner_id: existingWallet.owner_id,
                new_owner_id: new_owner_id,
                reason: 'Admin re-assigned ownership'
            }
        });

        return Response.json({
            success: true,
            message: `Wallet reassigned to new owner`,
            wallet: updatedWallet
        });

    } catch (error) {
        console.error('Error reassigning wallet:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});