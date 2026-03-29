import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { wallet_id, new_owner_id } = await req.json();
        if (!wallet_id || !new_owner_id) {
            return Response.json({ error: 'wallet_id and new_owner_id are required' }, { status: 400 });
        }

        const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
        if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });

        await base44.asServiceRole.entities.Wallet.update(wallet_id, {
            owner_id: new_owner_id
        });

        return Response.json({ success: true, wallet_id, new_owner_id });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});