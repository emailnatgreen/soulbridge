import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Client, Wallet, dropsToXrp } from 'npm:xrpl@3.0.0';

const RLUSD_CURRENCY = "524C555344000000000000000000000000000000";
const RLUSD_ISSUER = "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De";
const RLUSD_LIMIT = "1000000000";

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
        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, encryptedBytes);
    return decoder.decode(decrypted);
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { wallet_id } = await req.json();
        if (!wallet_id) return Response.json({ error: 'wallet_id required' }, { status: 400 });

        const walletRecord = await base44.asServiceRole.entities.Wallet.get(wallet_id);
        if (!walletRecord) return Response.json({ error: 'Wallet not found' }, { status: 404 });

        const address = walletRecord.classic_address;

        if (!walletRecord.encrypted_seed) {
            return Response.json({ success: false, error: 'No seed available (tracking-only wallet)' }, { status: 400 });
        }

        let seed;
        try {
            seed = await decryptSeed(walletRecord.encrypted_seed, walletRecord.encryption_iv, walletRecord.encryption_salt);
        } catch (error) {
            return Response.json({ success: false, error: 'Cannot decrypt wallet seed' }, { status: 400 });
        }

        const client = new Client('wss://xrplcluster.com');
        await client.connect();

        // Check balance
        let balance = 0;
        try {
            const accountInfo = await client.request({ command: "account_info", account: address, ledger_index: "validated" });
            balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));
        } catch (e) {
            await client.disconnect();
            return Response.json({ success: false, error: 'Account not found on XRPL. Ensure it is funded first.' }, { status: 400 });
        }

        // Check existing trustlines
        let hasRLUSD = false;
        try {
            const lines = await client.request({ command: "account_lines", account: address, peer: RLUSD_ISSUER });
            hasRLUSD = lines.result.lines.some(line => line.currency === RLUSD_CURRENCY);
        } catch (_) {}

        if (hasRLUSD) {
            await client.disconnect();
            return Response.json({ success: true, already_exists: true, message: 'RLUSD trustline already active', address });
        }

        if (balance < 1.2) {
            await client.disconnect();
            return Response.json({ success: false, error: `Insufficient XRP. Need at least 1.2 XRP, have ${balance.toFixed(4)} XRP.` }, { status: 400 });
        }

        // Create trustline with tfSetNoRipple flag
        const wallet = Wallet.fromSeed(seed);
        const trustlineTx = {
            TransactionType: "TrustSet",
            Account: address,
            LimitAmount: { currency: RLUSD_CURRENCY, issuer: RLUSD_ISSUER, value: RLUSD_LIMIT },
            Flags: 131072,
            Fee: "12"
        };

        const prepared = await client.autofill(trustlineTx);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);
        await client.disconnect();

        const txResult = result.result.meta.TransactionResult;
        if (txResult === "tesSUCCESS") {
            console.log(`✅ RLUSD trustline manually activated for ${address}`);
            return Response.json({
                success: true,
                transaction_hash: result.result.hash,
                message: `RLUSD trustline activated for ${address}`
            });
        } else {
            return Response.json({ success: false, error: txResult }, { status: 500 });
        }
    } catch (error) {
        console.error('Manual trustline error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});