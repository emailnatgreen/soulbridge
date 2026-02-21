import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet } from 'npm:xrpl@3.0.0';

// Encryption utilities using Web Crypto API
async function encryptSeed(seed) {
    const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    if (!masterKey) {
        throw new Error('WALLET_ENCRYPTION_KEY not configured');
    }

    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive encryption key from master key
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
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    // Encrypt the seed
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(seed)
    );

    return {
        encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt))
    };
}

async function logWalletAccess(base44, walletId, userId, userEmail, action, success = true, error = null, metadata = {}) {
    try {
        await base44.asServiceRole.entities.WalletAccessLog.create({
            wallet_id: walletId,
            user_id: userId,
            user_email: userEmail,
            action: action,
            success: success,
            error_message: error,
            metadata: metadata
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

        const { name, network = 'mainnet', fund_from_treasury = true } = await req.json();

        // Connect to XRPL
        const networkUrl = 'wss://xrpl.ws';
        const client = new Client(networkUrl);
        await client.connect();

        // Generate new wallet
        const wallet = Wallet.generate();

        // Fund new wallet from treasury if requested
        if (fund_from_treasury && network === 'mainnet') {
            const treasurySeed = Deno.env.get('XRPL_SENDER_SEED');
            if (treasurySeed) {
                try {
                    const treasuryWallet = Wallet.fromSeed(treasurySeed);
                    const payment = {
                        TransactionType: 'Payment',
                        Account: treasuryWallet.classicAddress,
                        Destination: wallet.classicAddress,
                        Amount: '2000000' // 2 XRP
                    };
                    const prepared = await client.autofill(payment);
                    const signed = treasuryWallet.sign(prepared);
                    await client.submitAndWait(signed.tx_blob);
                    console.log(`✅ Funded ${wallet.classicAddress} with 2 XRP from treasury`);
                } catch (error) {
                    console.log('Treasury funding failed:', error.message);
                }
            }
        }

        // Get balance
        let balance = 0;
        try {
            const response = await client.request({
                command: 'account_info',
                account: wallet.classicAddress,
                ledger_index: 'validated'
            });
            balance = Number(response.result.account_data.Balance) / 1000000;
        } catch (error) {
            console.log('Could not fetch balance:', error.message);
        }

        await client.disconnect();

        // Encrypt the seed
        const { encrypted, iv, salt } = await encryptSeed(wallet.seed);

        // Store wallet in database with encryption
        const walletData = await base44.asServiceRole.entities.Wallet.create({
            owner_id: user.id,
            name: name || `Wallet ${wallet.classicAddress.slice(0, 8)}`,
            classic_address: wallet.classicAddress,
            encrypted_seed: encrypted,
            encryption_iv: iv,
            encryption_salt: salt,
            network: 'mainnet',
            balance: balance,
            last_accessed: new Date().toISOString()
        });

        // Log wallet creation
        await logWalletAccess(
            base44,
            walletData.id,
            user.id,
            user.email,
            'create',
            true,
            null,
            { classic_address: wallet.classicAddress, network: 'mainnet' }
        );

        // Auto-add RLUSD trustline if wallet has enough XRP
        if (balance >= 1.2) {
            try {
                await base44.asServiceRole.functions.invoke('addRLUSDTrustline', {
                    wallet_id: walletData.id
                });
                console.log(`✅ RLUSD auto-configured for ${walletData.name}`);
            } catch (error) {
                console.log(`⚠️ RLUSD auto-config will be done later for ${walletData.name}`);
            }
        }

        return Response.json({
            success: true,
            wallet: {
                id: walletData.id,
                name: walletData.name,
                classic_address: wallet.classicAddress,
                network: network,
                balance: balance
            },
            message: '🪪 Wallet created successfully with encryption!'
        });

    } catch (error) {
        if (user) {
            await logWalletAccess(
                base44,
                null,
                user.id,
                user.email,
                'create',
                false,
                error.message
            );
        }
        
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});