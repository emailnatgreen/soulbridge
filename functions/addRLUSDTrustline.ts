import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, dropsToXrp } from 'npm:xrpl@4.2.1';

const RLUSD_CONFIG = {
  currency: "RLUSD",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  limit: "1000000000",
  reserveCost: 0.2
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { wallet_id } = await req.json();

        if (!wallet_id) {
            return Response.json({ error: 'wallet_id required' }, { status: 400 });
        }

        const walletRecord = await base44.entities.Wallet.get(wallet_id);
        const address = walletRecord.classic_address;
        const seed = walletRecord.seed;

        const client = new Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();

        // Check current status
        const accountInfo = await client.request({
            command: "account_info",
            account: address,
            ledger_index: "validated"
        });
        
        const balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));
        
        // Check existing trustlines
        const lines = await client.request({
            command: "account_lines",
            account: address,
            peer: RLUSD_CONFIG.issuer
        });
        
        const hasRLUSD = lines.result.lines.some(
            line => line.currency === RLUSD_CONFIG.currency
        );
        
        if (hasRLUSD) {
            await client.disconnect();
            return Response.json({
                success: true,
                already_exists: true,
                message: 'RLUSD trustline already exists',
                address
            });
        }
        
        if (balance < 1.2) {
            await client.disconnect();
            return Response.json({
                success: false,
                error: 'Insufficient XRP',
                needs_funding: 1.2 - balance,
                message: `Need ${(1.2 - balance).toFixed(2)} more XRP for reserve`
            }, { status: 400 });
        }

        // Create trustline
        const wallet = Wallet.fromSeed(seed);
        
        const trustlineTx = {
            TransactionType: "TrustSet",
            Account: address,
            LimitAmount: {
                currency: RLUSD_CONFIG.currency,
                issuer: RLUSD_CONFIG.issuer,
                value: RLUSD_CONFIG.limit
            },
            Fee: "12"
        };
        
        const prepared = await client.autofill(trustlineTx);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);
        
        await client.disconnect();

        if (result.result.meta.TransactionResult === "tesSUCCESS") {
            // Update wallet record
            await base44.asServiceRole.entities.Wallet.update(wallet_id, {
                metadata: {
                    ...walletRecord.metadata,
                    has_rlusd_trustline: true,
                    rlusd_setup_date: new Date().toISOString()
                }
            });

            return Response.json({
                success: true,
                transaction_hash: result.result.hash,
                reserve_locked: RLUSD_CONFIG.reserveCost,
                new_balance: balance - 0.000012,
                message: `RLUSD trustline activated for ${address}`
            });
        } else {
            return Response.json({
                success: false,
                error: result.result.meta.TransactionResult
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error adding RLUSD trustline:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});