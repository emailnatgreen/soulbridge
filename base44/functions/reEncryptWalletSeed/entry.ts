import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as xrpl from 'npm:xrpl@3.1.0';

async function encryptSeed(seed) {
  const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
  if (!masterKey) throw new Error('WALLET_ENCRYPTION_KEY not configured');

  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(masterKey), 'PBKDF2', false, ['deriveBits', 'deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, encoder.encode(seed)
  );

  const toBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  return {
    encrypted_seed: toBase64(encrypted),
    encryption_iv: toBase64(iv),
    encryption_salt: toBase64(salt),
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { wallet_id } = await req.json();
  if (!wallet_id) {
    return Response.json({ error: 'wallet_id is required' }, { status: 400 });
  }

  // Fetch the wallet
  const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
  if (!wallet) {
    return Response.json({ error: 'Wallet not found' }, { status: 404 });
  }

  // Check if the seed looks like plaintext (no IV = plaintext storage)
  if (wallet.encryption_iv && wallet.encryption_salt) {
    return Response.json({
      success: false,
      message: 'Wallet seed is already properly encrypted (has IV and salt)',
      wallet_name: wallet.name,
    });
  }

  if (!wallet.encrypted_seed) {
    return Response.json({
      success: false,
      message: 'No seed stored on this wallet (watch-only)',
      wallet_name: wallet.name,
    });
  }

  // The current encrypted_seed is actually plaintext — validate it
  const plaintextSeed = wallet.encrypted_seed;
  let derivedWallet;
  try {
    derivedWallet = xrpl.Wallet.fromSeed(plaintextSeed);
  } catch (e) {
    return Response.json({
      error: 'Stored value is not a valid XRPL seed — cannot re-encrypt',
      wallet_name: wallet.name,
    }, { status: 400 });
  }

  // Verify derived address matches
  if (wallet.classic_address && wallet.classic_address !== derivedWallet.classicAddress) {
    return Response.json({
      error: `Address mismatch: derived ${derivedWallet.classicAddress} vs stored ${wallet.classic_address}`,
    }, { status: 400 });
  }

  // Re-encrypt properly
  const { encrypted_seed, encryption_iv, encryption_salt } = await encryptSeed(plaintextSeed);

  await base44.asServiceRole.entities.Wallet.update(wallet_id, {
    encrypted_seed,
    encryption_iv,
    encryption_salt,
    last_accessed: new Date().toISOString(),
  });

  // Log the remediation
  try {
    await base44.asServiceRole.entities.DidAuditLog.create({
      did_classic_address: wallet.classic_address,
      wallet_id: wallet_id,
      user_email: user.email,
      user_id: user.id,
      action_type: 'did_verified',
      success: true,
      action_details: {
        event: 'seed_re_encryption',
        wallet_name: wallet.name,
        reason: 'Plaintext seed detected during DID Seal integrity check — re-encrypted with AES-256-GCM',
        remediation_date: new Date().toISOString(),
      },
    });
  } catch (logErr) {
    console.error('Audit log failed:', logErr.message);
  }

  return Response.json({
    success: true,
    message: `Seed re-encrypted for ${wallet.name}`,
    classic_address: wallet.classic_address,
    had_iv: false,
    had_salt: false,
    now_encrypted: true,
  });
});