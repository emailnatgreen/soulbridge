import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, Wallet, dropsToXrp } from 'npm:xrpl@4.0.0';

const RLUSD_CONFIG = {
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  limit: "1000000000",
  reserveCost: 0.2
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
    const { event, data } = await req.json();

    // Only process mainnet wallets with an address and sufficient balance
    if (data.network !== 'mainnet') {
      return Response.json({ skipped: true, reason: 'Testnet wallets do not require RLUSD trustline' });
    }
    if (!data.classic_address || !data.balance || data.balance < 1.2) {
      return Response.json({ skipped: true, reason: 'Wallet not ready (no address or insufficient balance)' });
    }
    if (data.metadata?.has_rlusd_trustline) {
      return Response.json({ skipped: true, reason: 'RLUSD trustline already exists' });
    }
    if (!data.encrypted_seed) {
      return Response.json({ skipped: true, reason: 'No seed available (tracking-only wallet)' });
    }

    const wallet_id = event.entity_id;
    console.log(`🤖 Auto-setting up RLUSD trustline for wallet ${wallet_id}`);

    // Fetch full wallet record for encryption fields
    const walletRecord = await base44.asServiceRole.entities.Wallet.get(wallet_id);

    if (!walletRecord.encrypted_seed || !walletRecord.encryption_iv || !walletRecord.encryption_salt) {
      return Response.json({ skipped: true, reason: 'Wallet is missing encryption fields, cannot decrypt seed' });
    }

    let seed;
    try {
      seed = await decryptSeed(walletRecord.encrypted_seed, walletRecord.encryption_iv, walletRecord.encryption_salt);
    } catch (decryptErr) {
      console.error('Decrypt error:', decryptErr.message);
      return Response.json({ success: false, error: `Cannot decrypt wallet seed: ${decryptErr.message}` }, { status: 500 });
    }

    const address = walletRecord.classic_address;
    const client = new Client('wss://xrpl.ws');
    await client.connect();

    try {
      // Verify balance on-chain
      const accountInfo = await client.request({ command: 'account_info', account: address, ledger_index: 'validated' });
      const balance = parseFloat(dropsToXrp(accountInfo.result.account_data.Balance));

      if (balance < 1.2) {
        await client.disconnect();
        return Response.json({ success: false, error: 'Insufficient XRP on-chain' });
      }

      // Check if trustline already exists
      const lines = await client.request({ command: 'account_lines', account: address, peer: RLUSD_CONFIG.issuer });
      const hasRLUSD = lines.result.lines.some(line => line.currency === RLUSD_CONFIG.currency);
      if (hasRLUSD) {
        await client.disconnect();
        return Response.json({ success: true, already_exists: true, message: 'RLUSD trustline already exists' });
      }

      // Create trustline
      const xrplWallet = Wallet.fromSeed(seed);
      const trustlineTx = {
        TransactionType: 'TrustSet',
        Account: address,
        LimitAmount: { currency: RLUSD_CONFIG.currency, issuer: RLUSD_CONFIG.issuer, value: RLUSD_CONFIG.limit },
        Flags: 131072, // tfSetNoRipple
        Fee: '12'
      };
      const prepared = await client.autofill(trustlineTx);
      const signed = xrplWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);
      await client.disconnect();

      if (result.result.meta.TransactionResult === 'tesSUCCESS') {
        await base44.asServiceRole.entities.Wallet.update(wallet_id, {
          metadata: { ...walletRecord.metadata, has_rlusd_trustline: true, rlusd_setup_date: new Date().toISOString() }
        });
        console.log(`✅ RLUSD trustline auto-configured for ${address}`);
        return Response.json({ success: true, transaction_hash: result.result.hash, message: `RLUSD trustline activated for ${address}` });
      } else {
        return Response.json({ success: false, error: result.result.meta.TransactionResult }, { status: 500 });
      }
    } catch (err) {
      await client.disconnect();
      throw err;
    }

  } catch (error) {
    console.error('Auto trustline setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});