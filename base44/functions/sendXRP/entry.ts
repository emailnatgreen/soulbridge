import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, Wallet, xrpToDrops } from 'npm:xrpl@3.0.0';

async function decryptSeed(encryptedData, iv, salt) {
    const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    if (!masterKey) throw new Error('WALLET_ENCRYPTION_KEY not configured');

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

    const keyMaterial = await crypto.subtle.importKey(
        'raw', encoder.encode(masterKey), 'PBKDF2', false, ['deriveBits', 'deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, encryptedBytes);
    return decoder.decode(decrypted);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { transaction_id } = await req.json();
        if (!transaction_id) return Response.json({ error: 'transaction_id is required' }, { status: 400 });

        const tx = await base44.asServiceRole.entities.Transaction.get(transaction_id);
        if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 });
        if (!tx.from_wallet_id) return Response.json({ error: 'No from_wallet_id on transaction' }, { status: 400 });

        const walletResults = await base44.asServiceRole.entities.Wallet.filter({ id: tx.from_wallet_id }, '-created_date', 1);
        const fromWalletRecord = walletResults?.[0];
        if (!fromWalletRecord) return Response.json({ error: 'From wallet not found' }, { status: 404 });
        console.log('Wallet fields present:', Object.keys(fromWalletRecord).join(', '));
        console.log('Has encrypted_seed:', !!fromWalletRecord.encrypted_seed, '| Has iv:', !!fromWalletRecord.encryption_iv, '| Has salt:', !!fromWalletRecord.encryption_salt);
        if (!fromWalletRecord.classic_address) return Response.json({ error: 'From wallet has no XRPL address' }, { status: 400 });

        // Get seed: try full decryption if all params present, otherwise treat stored value as plaintext
        let seed;
        if (!fromWalletRecord.encrypted_seed) {
            return Response.json({ error: 'No seed stored for this wallet. Please add the wallet seed via the Wallets page before sending.' }, { status: 400 });
        }
        if (fromWalletRecord.encrypted_seed && fromWalletRecord.encryption_iv && fromWalletRecord.encryption_salt) {
            seed = await decryptSeed(
                fromWalletRecord.encrypted_seed,
                fromWalletRecord.encryption_iv,
                fromWalletRecord.encryption_salt
            );
        } else {
            // Stored as plaintext or partially encrypted — use as-is
            seed = fromWalletRecord.encrypted_seed;
        }

        // Always trim the seed to remove any accidental whitespace/newlines
        seed = seed.trim();

        // Validate seed format before connecting
        if (!seed || seed.length < 10) {
            return Response.json({ error: 'Invalid seed: seed is empty or too short. Please check your XRPL_SENDER_SEED secret.' }, { status: 400 });
        }

        const networkUrl = fromWalletRecord.network === 'mainnet'
            ? 'wss://xrplcluster.com'
            : 'wss://s.altnet.rippletest.net:51233';

        const client = new Client(networkUrl);
        await client.connect();

        // Try fromSeed (family seed starting with 's'), fallback to fromPrivateKey (hex)
        let senderWallet;
        try {
            senderWallet = Wallet.fromSeed(seed);
        } catch (seedErr) {
            try {
                senderWallet = Wallet.fromPrivateKey(seed);
            } catch (pkErr) {
                await client.disconnect();
                return Response.json({ 
                    error: `Invalid wallet seed format. The seed must be a valid XRPL family seed (starts with 's') or a hex private key. Please re-enter XRPL_SENDER_SEED in your app secrets. Details: ${seedErr.message}` 
                }, { status: 400 });
            }
        }

        // Verify the seed matches the stored address
        if (senderWallet.address !== fromWalletRecord.classic_address) {
            await client.disconnect();
            return Response.json({ error: `Seed mismatch: seed generates ${senderWallet.address} but wallet has ${fromWalletRecord.classic_address}` }, { status: 400 });
        }

        const payment = {
            TransactionType: 'Payment',
            Account: senderWallet.address,
            Destination: tx.recipient_address,
            Amount: xrpToDrops(tx.amount.toString()),
        };

        if (tx.destination_tag) {
            payment.DestinationTag = parseInt(tx.destination_tag);
        }

        const { result } = await client.submitAndWait(payment, { wallet: senderWallet });
        await client.disconnect();

        const success = result.meta.TransactionResult === 'tesSUCCESS';
        const hash = result.hash;

        await base44.asServiceRole.entities.Transaction.update(transaction_id, {
            status: success ? 'completed' : 'failed',
            hash: hash,
        });

        // Log the activity
        await base44.asServiceRole.entities.AutomationLog.create({
            automation_name: 'XRP Send',
            function_name: 'sendXRP',
            status: success ? 'success' : 'error',
            message: `${success ? 'Sent' : 'Failed'} ${tx.amount} XRP from ${fromWalletRecord.name} to ${tx.recipient_name || tx.recipient_address}`,
            details: { hash, from: fromWalletRecord.classic_address, to: tx.recipient_address, amount: tx.amount, network: fromWalletRecord.network },
            run_at: new Date().toISOString(),
            triggered_by: 'manual'
        });

        if (!success) {
            return Response.json({ error: `Transaction failed: ${result.meta.TransactionResult}`, hash }, { status: 400 });
        }

        return Response.json({ success: true, hash, result: result.meta.TransactionResult });

    } catch (error) {
        console.error('sendXRP error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});