import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as xrpl from 'npm:xrpl@3.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const treasurySeed = Deno.env.get('XRPL_TREASURY_SEED');
        if (!treasurySeed) {
            return Response.json({ error: 'XRPL_TREASURY_SEED not configured' }, { status: 500 });
        }

        // Connect to XRPL Testnet
        const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();

        // Derive wallet from seed
        const wallet = xrpl.Wallet.fromSeed(treasurySeed);
        const classicAddress = wallet.classicAddress;

        // Fetch live balance
        let balance = 0;
        try {
            const accountInfo = await client.request({
                command: 'account_info',
                account: classicAddress,
                ledger_index: 'validated',
            });
            balance = Number(accountInfo.result.account_data.Balance) / 1_000_000;
        } catch (e) {
            // Account may not be activated yet
            balance = 0;
        }

        await client.disconnect();

        // Upsert Treasury record in DB
        const existing = await base44.asServiceRole.entities.Treasury.filter({ classic_address: classicAddress });

        let treasury;
        if (existing && existing.length > 0) {
            treasury = await base44.asServiceRole.entities.Treasury.update(existing[0].id, {
                total_balance: balance,
            });
        } else {
            treasury = await base44.asServiceRole.entities.Treasury.create({
                name: 'SoulBridge Main Treasury',
                classic_address: classicAddress,
                total_balance: balance,
                purpose: 'Primary treasury for SoulBridge Village — holds project funds, rewards, and service charges.',
                access_level: 'admin_only',
                manager_agent_id: 'axi_main_001',
                total_deposits: 0,
                total_withdrawals: 0,
                transaction_count: 0,
            });
        }

        return Response.json({
            success: true,
            classic_address: classicAddress,
            balance_xrp: balance,
            network: 'testnet',
            treasury,
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});