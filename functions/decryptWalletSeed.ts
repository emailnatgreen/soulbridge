import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

async function logWalletAccess(base44, walletId, userId, userEmail, action, success = true, error = null) {
    try {
        await base44.asServiceRole.entities.WalletAccessLog.create({
            wallet_id: walletId,
            user_id: userId,
            user_email: userEmail,
            action: action,
            success: success,
            error_message: error
        });
    } catch (err) {
        console.error('Failed to log wallet access:', err);
    }
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    let user;
    
    try {
        user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { wallet_id, reason } = await req.json();

        // Get wallet from database
        const walletData = await base44.asServiceRole.entities.Wallet.get(wallet_id);
        
        if (!walletData) {
            await logWalletAccess(base44, wallet_id, user.id, user.email, 'decrypt', false, 'Wallet not found');
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        // Verify ownership
        if (walletData.owner_id !== user.id) {
            await logWalletAccess(base44, wallet_id, user.id, user.email, 'decrypt', false, 'Access denied - not owner');
            return Response.json({ error: 'Access denied: You do not own this wallet' }, { status: 403 });
        }

        // Decrypt the seed
        const seed = await decryptSeed(
            walletData.encrypted_seed,
            walletData.encryption_iv,
            walletData.encryption_salt
        );

        // Update last accessed
        await base44.asServiceRole.entities.Wallet.update(wallet_id, {
            last_accessed: new Date().toISOString()
        });

        // Log decryption access
        await logWalletAccess(
            base44,
            wallet_id,
            user.id,
            user.email,
            'decrypt',
            true,
            null,
            { reason: reason || 'Not specified' }
        );

        return Response.json({
            success: true,
            seed: seed,
            classic_address: walletData.classic_address
        });

    } catch (error) {
        if (user) {
            await logWalletAccess(base44, null, user.id, user.email, 'decrypt', false, error.message);
        }
        
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});