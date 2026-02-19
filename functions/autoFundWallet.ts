import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, xrpToDrops } from 'npm:xrpl@4.2.1';

const MIN_WALLET_BALANCE = 2; // Minimum XRP required (1 base + 0.2 RLUSD + 0.8 buffer)

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { wallet_address, amount } = await req.json();

        if (!wallet_address) {
            return Response.json({ error: 'wallet_address required' }, { status: 400 });
        }

        const fundAmount = amount || MIN_WALLET_BALANCE;

        const client = new Client('wss://xrpl.ws');
        await client.connect();

        const treasurySeed = Deno.env.get('XRPL_SENDER_SEED');
        if (!treasurySeed) {
            throw new Error('XRPL_SENDER_SEED not configured');
        }

        const treasuryWallet = Wallet.fromSeed(treasurySeed);

        const payment = {
            TransactionType: 'Payment',
            Account: treasuryWallet.classicAddress,
            Destination: wallet_address,
            Amount: xrpToDrops(fundAmount.toString())
        };

        const prepared = await client.autofill(payment);
        const signed = treasuryWallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        await client.disconnect();

        if (result.result.meta.TransactionResult === "tesSUCCESS") {
            return Response.json({
                success: true,
                transaction_hash: result.result.hash,
                amount_sent: fundAmount,
                recipient: wallet_address,
                message: `Funded ${wallet_address} with ${fundAmount} XRP`
            });
        } else {
            return Response.json({
                success: false,
                error: result.result.meta.TransactionResult
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error funding wallet:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});