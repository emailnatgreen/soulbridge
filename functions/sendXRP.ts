import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, xrpToDrops } from 'npm:xrpl@4.2.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { transaction_id } = await req.json();

        if (!transaction_id) {
            return Response.json({ error: 'transaction_id is required' }, { status: 400 });
        }

        // Get the transaction from the database
        const transaction = await base44.asServiceRole.entities.Transaction.list();
        const txn = transaction.find(t => t.id === transaction_id);

        if (!txn) {
            return Response.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // Get the XRPL sender seed from environment
        const senderSeed = Deno.env.get('XRPL_SENDER_SEED');
        if (!senderSeed) {
            return Response.json({ error: 'XRPL sender seed not configured' }, { status: 500 });
        }

        // Create wallet from seed
        const wallet = Wallet.fromSeed(senderSeed);

        // Connect to XRPL Testnet
        const client = new Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();

        // Prepare payment transaction
        const payment = {
            TransactionType: 'Payment',
            Account: wallet.address,
            Destination: txn.recipient_address,
            Amount: xrpToDrops(txn.amount),
        };

        // Add destination tag if provided
        if (txn.destination_tag) {
            payment.DestinationTag = txn.destination_tag;
        }

        // Submit the transaction
        const prepared = await client.autofill(payment);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        await client.disconnect();

        // Update transaction with result
        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            await base44.asServiceRole.entities.Transaction.update(transaction_id, {
                status: 'completed',
                hash: result.result.hash,
            });

            return Response.json({
                success: true,
                hash: result.result.hash,
                status: 'completed'
            });
        } else {
            await base44.asServiceRole.entities.Transaction.update(transaction_id, {
                status: 'failed',
            });

            return Response.json({
                success: false,
                error: result.result.meta.TransactionResult
            }, { status: 400 });
        }

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});