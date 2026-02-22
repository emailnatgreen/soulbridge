import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, dropsToXrp } from 'npm:xrpl@4.0.0';

const RLUSD_CONFIG = {
  currency: "RLUSD",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  limit: "1000000000",
  reserveCost: 0.2
};

async function decryptSeed(encryptedData, iv, salt) {
    const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    if (!masterKey) {
        throw new Error('WALLET_ENCRYPTION_KEY not configured');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Convert from base64
    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

    // Derive same key
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(masterKey),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        encryptedBytes
    );

    return decoder.decode(decrypted);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { wallet_id } = await req.json();
        console.log('Adding RLUSD trustline for wallet:', wallet_id);

        if (!wallet_id) {
            return Response.json({ error: 'wallet_id required' }, { status: 400 });
        }

        const walletRecord = await base44.asServiceRole.entities.Wallet.get(wallet_id);
        const address = walletRecord.classic_address;
        
        if (!walletRecord.encrypted_seed) {
            return Response.json({ 
                success: false, 
                error: 'No seed available (tracking-only wallet)' 
            }, { status: 400 });
        }
        
        // Decrypt the seed directly
        const seed = await decryptSeed(
            walletRecord.encrypted_seed,
            walletRecord.encryption_iv,
            walletRecord.encryption_salt
        );

        const client = new Client('wss://xrpl.ws');
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