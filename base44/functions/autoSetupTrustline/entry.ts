import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Client, Wallet } from 'npm:xrpl@4.0.0';
import crypto from 'node:crypto';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { wallet_id, currency, issuer, limit = "1000000000" } = await req.json();

        if (!wallet_id || !currency || !issuer) {
            return Response.json({ error: 'wallet_id, currency, and issuer are required' }, { status: 400 });
        }

        // Fetch and verify wallet ownership
        const walletRecord = await base44.entities.Wallet.get(wallet_id);
        
        if (!walletRecord || walletRecord.owner_id !== user.id) {
            return Response.json({ error: 'Access denied' }, { status: 403 });
        }

        // Decrypt wallet seed
        const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(encryptionKey, 'hex'),
            Buffer.from(walletRecord.encryption_iv, 'hex')
        );
        decipher.setAuthTag(Buffer.from(walletRecord.encryption_salt, 'hex'));
        
        let decrypted = decipher.update(walletRecord.encrypted_seed, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // Connect to XRPL
        const network = walletRecord.network === 'mainnet' 
            ? 'wss://xrplcluster.com' 
            : 'wss://s.altnet.rippletest.net:51233';
        
        const client = new Client(network);
        await client.connect();

        const wallet = Wallet.fromSeed(decrypted);

        // Prepare TrustSet transaction
        const trustSetTx = {
            TransactionType: 'TrustSet',
            Account: wallet.address,
            LimitAmount: {
                currency: currency,
                issuer: issuer,
                value: limit
            },
            Flags: 131072 // tfSetNoRipple
        };

        // Submit transaction
        const result = await client.submitAndWait(trustSetTx, { wallet });
        await client.disconnect();

        // Log the action
        await base44.asServiceRole.entities.WalletAccessLog.create({
            wallet_id: walletRecord.id,
            user_id: user.id,
            user_email: user.email,
            action: 'send_transaction',
            success: result.result.meta.TransactionResult === 'tesSUCCESS',
            metadata: { 
                transaction_type: 'TrustSet',
                currency,
                issuer,
                hash: result.result.hash
            }
        });

        return Response.json({
            success: result.result.meta.TransactionResult === 'tesSUCCESS',
            hash: result.result.hash,
            currency,
            issuer,
            message: `TrustLine set for ${currency}`
        });

    } catch (error) {
        console.error('Error setting trustline:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});