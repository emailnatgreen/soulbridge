import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Client, Wallet, xrpToDrops } from 'npm:xrpl@3.1.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const address = body.classic_address || body.wallet_address;
        const network = body.network || 'testnet';
        const amount = body.amount || 10;

        if (!address) return Response.json({ error: 'classic_address required' }, { status: 400 });

        // Testnet: use public faucet — no admin required
        if (network === 'testnet') {
            const faucetRes = await fetch('https://faucet.altnet.rippletest.net/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination: address }),
            });
            const faucetData = await faucetRes.json();
            if (!faucetRes.ok) {
                return Response.json({ error: faucetData?.error || 'Faucet request failed' }, { status: 500 });
            }
            return Response.json({ success: true, message: `Testnet faucet funded ${address}`, data: faucetData });
        }

        // Mainnet: use treasury seed (admin only)
        if (user.role !== 'admin') {
            return Response.json({ error: 'Admin access required for mainnet funding' }, { status: 403 });
        }

        const treasurySeed = Deno.env.get('XRPL_SENDER_SEED');
        if (!treasurySeed) throw new Error('XRPL_SENDER_SEED not configured');

        const client = new Client('wss://xrplcluster.com');
        await client.connect();

        const treasuryWallet = Wallet.fromSeed(treasurySeed);
        const payment = {
            TransactionType: 'Payment',
            Account: treasuryWallet.classicAddress,
            Destination: address,
            Amount: xrpToDrops(amount.toString()),
        };

        const prepared = await client.autofill(payment);
        const signed = treasuryWallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);
        await client.disconnect();

        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            return Response.json({ success: true, transaction_hash: result.result.hash, amount_sent: amount });
        }
        return Response.json({ success: false, error: result.result.meta.TransactionResult }, { status: 500 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});