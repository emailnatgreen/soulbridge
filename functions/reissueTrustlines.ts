import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, dropsToXrp } from 'npm:xrpl@4.0.0';

const RLUSD_CONFIG = {
  currency: "524C555344000000000000000000000000000000",
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

async function reissueTrustlineForWallet(walletRecord, client, base44, maxRetries = 3) {
    const address = walletRecord.classic_address;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${maxRetries} for ${walletRecord.name}`);

            // Check account status
            const accountInfo = await client.request({
                command: "account_info",
                account: address,
                ledger_index: "validated"
            });
            
            const balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));

            // Check existing trustlines
            const lines = await client.request({
                command: "account_lines",
                account: address
            });
            
            const existingRLUSD = lines.result.lines.find(
                line => line.currency === RLUSD_CONFIG.currency
            );

            // Decrypt seed
            const seed = await decryptSeed(
                walletRecord.encrypted_seed,
                walletRecord.encryption_iv,
                walletRecord.encryption_salt
            );
            const wallet = Wallet.fromSeed(seed);

            // If trustline exists with wrong issuer, remove it first
            if (existingRLUSD && existingRLUSD.account !== RLUSD_CONFIG.issuer) {
                console.log(`Removing old trustline from ${existingRLUSD.account}`);
                
                const removeTx = {
                    TransactionType: "TrustSet",
                    Account: address,
                    LimitAmount: {
                        currency: RLUSD_CONFIG.currency,
                        issuer: existingRLUSD.account,
                        value: "0"
                    },
                    Fee: "12"
                };
                
                const preparedRemove = await client.autofill(removeTx);
                const signedRemove = wallet.sign(preparedRemove);
                await client.submitAndWait(signedRemove.tx_blob);
                
                console.log('Old trustline removed, waiting before adding new one...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Check if correct trustline already exists
            if (existingRLUSD && existingRLUSD.account === RLUSD_CONFIG.issuer) {
                return {
                    success: true,
                    wallet_id: walletRecord.id,
                    wallet_name: walletRecord.name,
                    address,
                    attempts: attempt,
                    message: 'RLUSD trustline already exists with correct issuer'
                };
            }

            // Check balance
            if (balance < 1.2) {
                return {
                    success: false,
                    wallet_id: walletRecord.id,
                    wallet_name: walletRecord.name,
                    address,
                    error: `Insufficient XRP (has ${balance.toFixed(2)}, needs 1.2)`,
                    attempts: attempt
                };
            }

            // Add new trustline with Deep Freeze
            const trustlineTx = {
                TransactionType: "TrustSet",
                Account: address,
                LimitAmount: {
                    currency: RLUSD_CONFIG.currency,
                    issuer: RLUSD_CONFIG.issuer,
                    value: RLUSD_CONFIG.limit
                },
                Flags: 0x00500000,
                Fee: "12"
            };
            
            const prepared = await client.autofill(trustlineTx);
            const signed = wallet.sign(prepared);
            const result = await client.submitAndWait(signed.tx_blob);

            if (result.result.meta.TransactionResult === "tesSUCCESS") {
                // Update wallet metadata
                await base44.asServiceRole.entities.Wallet.update(walletRecord.id, {
                    metadata: {
                        ...walletRecord.metadata,
                        has_rlusd_trustline: true,
                        rlusd_reissue_date: new Date().toISOString(),
                        current_issuer: RLUSD_CONFIG.issuer
                    }
                });

                return {
                    success: true,
                    wallet_id: walletRecord.id,
                    wallet_name: walletRecord.name,
                    address,
                    transaction_hash: result.result.hash,
                    attempts: attempt,
                    message: existingRLUSD ? 'Trustline reissued successfully' : 'New trustline created'
                };
            } else {
                throw new Error(result.result.meta.TransactionResult);
            }
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${walletRecord.name}:`, error.message);
            
            if (attempt === maxRetries) {
                return {
                    success: false,
                    wallet_id: walletRecord.id,
                    wallet_name: walletRecord.name,
                    address,
                    error: error.message,
                    attempts: attempt
                };
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { wallet_ids, max_retries = 3 } = await req.json();

        if (!wallet_ids || !Array.isArray(wallet_ids) || wallet_ids.length === 0) {
            return Response.json({ error: 'wallet_ids array required' }, { status: 400 });
        }

        console.log(`Reissuing trustlines for ${wallet_ids.length} wallets...`);

        const client = new Client('wss://xrpl.ws');
        await client.connect();

        const results = [];

        for (const wallet_id of wallet_ids) {
            try {
                const walletRecord = await base44.asServiceRole.entities.Wallet.get(wallet_id);

                if (!walletRecord.encrypted_seed) {
                    results.push({
                        success: false,
                        wallet_id,
                        wallet_name: walletRecord.name,
                        error: 'No seed available (tracking-only wallet)',
                        attempts: 0
                    });
                    continue;
                }

                if (!walletRecord.classic_address) {
                    results.push({
                        success: false,
                        wallet_id,
                        wallet_name: walletRecord.name,
                        error: 'Wallet not activated on XRPL',
                        attempts: 0
                    });
                    continue;
                }

                const result = await reissueTrustlineForWallet(walletRecord, client, base44, max_retries);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    wallet_id,
                    error: error.message,
                    attempts: 0
                });
            }
        }

        await client.disconnect();

        const summary = {
            total: wallet_ids.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };

        console.log('Reissue complete:', summary);

        return Response.json({
            success: true,
            summary,
            results
        });

    } catch (error) {
        console.error('Reissue error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});