import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, Wallet, dropsToXrp } from 'npm:xrpl@3.0.0';

const RLUSD_CONFIG = {
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  limit: "1000000000",
};

async function decryptSeed(encryptedData, iv, salt) {
  const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
  if (!masterKey) throw new Error('WALLET_ENCRYPTION_KEY not configured');
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(masterKey), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
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
    const body = await req.json();
    const { event, payload_too_large } = body;

    // Always fetch fresh wallet record directly from DB to avoid stale payload data
    const wallet_id = event?.entity_id;
    if (!wallet_id) return Response.json({ skipped: true, reason: 'No entity_id in event' });

    const walletRecord = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!walletRecord) return Response.json({ skipped: true, reason: 'Wallet not found' });

    // Only process mainnet wallets with sufficient balance
    if (walletRecord.network !== 'mainnet') {
      return Response.json({ skipped: true, reason: 'Testnet wallet — no RLUSD trustline needed' });
    }
    if (!walletRecord.classic_address) {
      return Response.json({ skipped: true, reason: 'No classic_address yet' });
    }
    if (!walletRecord.balance || walletRecord.balance < 1.2) {
      return Response.json({ skipped: true, reason: `Balance ${walletRecord.balance} XRP insufficient (need ≥1.2)` });
    }
    if (walletRecord.metadata?.has_rlusd_trustline) {
      return Response.json({ skipped: true, reason: 'RLUSD trustline already recorded in metadata' });
    }
    // Prevent re-triggering loop: if we already attempted, skip until manually cleared
    if (walletRecord.metadata?.rlusd_setup_attempted) {
      return Response.json({ skipped: true, reason: 'Already attempted — check wallet manually' });
    }
    if (!walletRecord.encrypted_seed || !walletRecord.encryption_iv || !walletRecord.encryption_salt) {
      return Response.json({ skipped: true, reason: 'Wallet missing encryption fields — tracking-only wallet' });
    }

    console.log(`🤖 Setting up RLUSD trustline for wallet ${wallet_id} (${walletRecord.classic_address})`);

    // Mark as attempted FIRST to prevent re-triggering on subsequent wallet updates
    await base44.asServiceRole.entities.Wallet.update(wallet_id, {
      metadata: { ...walletRecord.metadata, rlusd_setup_attempted: true }
    });

    // Decrypt seed
    let seed;
    try {
      seed = await decryptSeed(walletRecord.encrypted_seed, walletRecord.encryption_iv, walletRecord.encryption_salt);
    } catch (decryptErr) {
      console.error('Seed decrypt failed:', decryptErr.name, decryptErr.message);
      return Response.json({ success: false, error: `Seed decryption failed: ${decryptErr.name || decryptErr.message}` }, { status: 500 });
    }

    const address = walletRecord.classic_address;
    const client = new Client('wss://xrpl.ws');
    await client.connect();

    try {
      // Verify on-chain balance
      const accountInfo = await client.request({ command: 'account_info', account: address, ledger_index: 'validated' });
      const onChainBalance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));
      if (onChainBalance < 1.2) {
        await client.disconnect();
        return Response.json({ success: false, error: `On-chain balance ${onChainBalance} XRP insufficient` });
      }

      // Check if trustline already exists on-chain
      const lines = await client.request({ command: 'account_lines', account: address, peer: RLUSD_CONFIG.issuer });
      const hasRLUSD = lines.result.lines.some(l => l.currency === RLUSD_CONFIG.currency);
      if (hasRLUSD) {
        await client.disconnect();
        // Update metadata so we don't check again
        await base44.asServiceRole.entities.Wallet.update(wallet_id, {
          metadata: { ...walletRecord.metadata, has_rlusd_trustline: true }
        });
        return Response.json({ success: true, already_exists: true, message: 'RLUSD trustline already exists on-chain' });
      }

      // Submit TrustSet transaction
      const xrplWallet = Wallet.fromSeed(seed);
      const prepared = await client.autofill({
        TransactionType: 'TrustSet',
        Account: address,
        LimitAmount: { currency: RLUSD_CONFIG.currency, issuer: RLUSD_CONFIG.issuer, value: RLUSD_CONFIG.limit },
        Flags: 131072, // tfSetNoRipple
        Fee: '12'
      });
      const signed = xrplWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);
      await client.disconnect();

      const txResult = result.result.meta.TransactionResult;
      if (txResult === 'tesSUCCESS') {
        await base44.asServiceRole.entities.Wallet.update(wallet_id, {
          metadata: { ...walletRecord.metadata, has_rlusd_trustline: true, rlusd_setup_date: new Date().toISOString() }
        });
        console.log(`✅ RLUSD trustline activated for ${address}`);
        return Response.json({ success: true, transaction_hash: result.result.hash, address });
      } else {
        return Response.json({ success: false, error: txResult }, { status: 500 });
      }

    } catch (err) {
      await client.disconnect();
      throw err;
    }

  } catch (error) {
    console.error('autoSetupRLUSDTrustline error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});