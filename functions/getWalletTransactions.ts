import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

        const wallet = await base44.entities.Wallet.get(wallet_id);
        
        if (!wallet) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        if (wallet.owner_id !== user.id) {
            return Response.json({ error: 'Access denied' }, { status: 403 });
        }

        const network = wallet.network === 'mainnet' 
            ? 'wss://xrplcluster.com' 
            : 'wss://s.altnet.rippletest.net:51233';

        // Use WebSocket directly to avoid xrpl package version issues
        const wsResponse = await new Promise((resolve, reject) => {
            const ws = new WebSocket(network);
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('WebSocket timeout'));
            }, 15000);

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    id: 1,
                    command: 'account_tx',
                    account: wallet.classic_address,
                    limit: limit,
                    ledger_index_min: -1,
                    ledger_index_max: -1
                }));
            };

            ws.onmessage = (event) => {
                clearTimeout(timeout);
                ws.close();
                resolve(JSON.parse(event.data));
            };

            ws.onerror = (err) => {
                clearTimeout(timeout);
                reject(new Error('WebSocket error'));
            };
        });

        if (wsResponse.status !== 'success') {
            throw new Error(wsResponse.error?.message || 'XRPL request failed');
        }

        const rawTxs = wsResponse.result?.transactions || [];

        const transactions = rawTxs.map(tx => {
            const meta = tx.meta;
            const txData = tx.tx_json || tx.tx || {};
            const isSuccess = meta?.TransactionResult === 'tesSUCCESS';
            const txHash = tx.hash || txData.hash;
            const txDate = tx.close_time_iso 
                ? new Date(tx.close_time_iso).toISOString()
                : (txData.date ? new Date((txData.date + 946684800) * 1000).toISOString() : null);

            let type = txData.TransactionType || 'Unknown';
            let amount = '0';
            let currency = 'XRP';
            let counterparty = '';
            let direction = 'unknown';

            if (txData.TransactionType === 'Payment') {
                const isSender = txData.Account === wallet.classic_address;
                direction = isSender ? 'sent' : 'received';
                counterparty = isSender ? txData.Destination : txData.Account;

                if (typeof txData.Amount === 'string') {
                    amount = (parseInt(txData.Amount) / 1000000).toString();
                    currency = 'XRP';
                } else if (typeof txData.Amount === 'object' && txData.Amount) {
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
                hash: txHash,
                type,
                direction,
                date: txDate,
                amount,
                currency,
                counterparty,
                status: isSuccess ? 'success' : 'failed',
                ledger_index: tx.ledger_index,
                fee: txData.Fee ? (parseInt(txData.Fee) / 1000000).toString() : '0'
            };
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