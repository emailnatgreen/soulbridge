import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet } from 'npm:xrpl@4.2.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { wallet_id, limit = 50 } = await req.json();

        if (!wallet_id) {
            return Response.json({ error: 'wallet_id is required' }, { status: 400 });
        }

        // Fetch wallet and verify ownership
        const wallet = await base44.entities.Wallet.get(wallet_id);
        
        if (!wallet) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        if (wallet.owner_id !== user.id) {
            return Response.json({ error: 'Access denied' }, { status: 403 });
        }

        // Connect to XRPL
        const network = wallet.network === 'mainnet' 
            ? 'wss://xrplcluster.com' 
            : 'wss://s.altnet.rippletest.net:51233';
        
        const client = new Client(network);
        await client.connect();

        // Fetch account transactions
        const response = await client.request({
            command: 'account_tx',
            account: wallet.classic_address,
            limit: limit,
            ledger_index_min: -1,
            ledger_index_max: -1
        });

        // Parse transactions
        const transactions = response.result.transactions.map(tx => {
            const meta = tx.meta;
            const txData = tx.tx;
            const isSuccess = meta.TransactionResult === 'tesSUCCESS';
            
            // Determine transaction type and details
            let type = txData.TransactionType;
            let amount = '0';
            let currency = 'XRP';
            let counterparty = '';
            let direction = 'unknown';

            if (txData.TransactionType === 'Payment') {
                const isSender = txData.Account === wallet.classic_address;
                direction = isSender ? 'sent' : 'received';
                counterparty = isSender ? txData.Destination : txData.Account;

                // Check if it's XRP or token payment
                if (typeof txData.Amount === 'string') {
                    // XRP payment
                    amount = (parseInt(txData.Amount) / 1000000).toString();
                    currency = 'XRP';
                } else if (typeof txData.Amount === 'object') {
                    // Token payment (RLUSD)
                    amount = txData.Amount.value;
                    currency = txData.Amount.currency;
                }
            } else if (txData.TransactionType === 'TrustSet') {
                type = 'TrustLine';
                if (txData.LimitAmount) {
                    currency = txData.LimitAmount.currency;
                    amount = txData.LimitAmount.value;
                }
            }

            return {
                hash: txData.hash,
                type,
                direction,
                date: txData.date ? new Date((txData.date + 946684800) * 1000).toISOString() : null,
                amount,
                currency,
                counterparty,
                status: isSuccess ? 'success' : 'failed',
                ledger_index: tx.ledger_index,
                fee: txData.Fee ? (parseInt(txData.Fee) / 1000000).toString() : '0'
            };
        });

        await client.disconnect();

        // Log access
        await base44.asServiceRole.entities.WalletAccessLog.create({
            wallet_id: wallet.id,
            user_id: user.id,
            user_email: user.email,
            action: 'view',
            success: true,
            metadata: { transactions_fetched: transactions.length }
        });

        return Response.json({
            success: true,
            wallet_address: wallet.classic_address,
            network: wallet.network,
            transactions
        });

    } catch (error) {
        console.error('Error fetching transactions:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});