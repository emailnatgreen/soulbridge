import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet, dropsToXrp } from 'npm:xrpl@4.2.1';

const RLUSD_CONFIG = {
  currency: "RLUSD",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  limit: "1000000000"
};

async function decryptSeed(encryptedData, iv, salt) {
    const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
    if (!masterKey) {
        throw new Error('WALLET_ENCRYPTION_KEY not configured');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

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

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        encryptedBytes
    );

    return decoder.decode(decrypted);
}

async function setupTrustline(base44, walletRecord) {
  try {
    const address = walletRecord.classic_address;
    
    // Decrypt the seed
    const seed = await decryptSeed(
        walletRecord.encrypted_seed,
        walletRecord.encryption_iv,
        walletRecord.encryption_salt
    );

    const client = new Client('wss://xrpl.ws');
    await client.connect();

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
        return { success: true, already_exists: true };
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
        await base44.asServiceRole.entities.Wallet.update(walletRecord.id, {
            metadata: {
                ...walletRecord.metadata,
                has_rlusd_trustline: true,
                rlusd_setup_date: new Date().toISOString()
            }
        });

        return { success: true, transaction_hash: result.result.hash };
    } else {
        return { success: false, error: result.result.meta.TransactionResult };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🔄 Starting batch trustline setup for mainnet wallets...');

    // Get all mainnet wallets
    const wallets = await base44.asServiceRole.entities.Wallet.filter({
      network: 'mainnet'
    });

    const results = {
      processed: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    for (const wallet of wallets) {
      // Skip wallets without address or with insufficient balance
      if (!wallet.classic_address || !wallet.balance || wallet.balance < 1.2) {
        console.log(`⏭️ Skipping ${wallet.name}: insufficient balance (${wallet.balance} XRP)`);
        results.skipped++;
        continue;
      }

      // Skip if trustline already exists
      if (wallet.metadata?.has_rlusd_trustline) {
        console.log(`⏭️ Skipping ${wallet.name}: trustline already exists`);
        results.skipped++;
        continue;
      }

      // Skip if no seed (tracking-only wallet)
      if (!wallet.encrypted_seed) {
        console.log(`⏭️ Skipping ${wallet.name}: no seed (tracking only)`);
        results.skipped++;
        continue;
      }

      results.processed++;

      try {
        console.log(`🔧 Setting up trustline for ${wallet.name} (${wallet.classic_address})...`);
        
        // Setup trustline directly
        const result = await setupTrustline(base44, wallet);

        if (result.success) {
          console.log(`✅ Trustline set up for ${wallet.name}`);
          results.successful++;
        } else {
          console.log(`❌ Failed for ${wallet.name}: ${result.error}`);
          results.failed++;
          results.errors.push({ wallet: wallet.name, error: result.error });
        }
      } catch (error) {
        console.error(`❌ Error processing ${wallet.name}:`, error);
        results.failed++;
        results.errors.push({ wallet: wallet.name, error: error.message });
      }
    }

    console.log('✨ Batch trustline setup complete:', results);

    return Response.json({
      success: true,
      summary: {
        total_wallets: wallets.length,
        processed: results.processed,
        successful: results.successful,
        skipped: results.skipped,
        failed: results.failed
      },
      errors: results.errors
    });

  } catch (error) {
    console.error('Batch setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});