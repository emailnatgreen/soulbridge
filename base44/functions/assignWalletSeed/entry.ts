import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
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

  const { wallet_id, seed } = await req.json();
  if (!wallet_id || !seed) {
    return Response.json({ error: 'wallet_id and seed are required' }, { status: 400 });
  }

  // Validate seed by deriving the wallet
  let wallet;
  try {
    wallet = xrpl.Wallet.fromSeed(seed);
  } catch (e) {
    return Response.json({ error: 'Invalid seed — could not derive wallet address' }, { status: 400 });
  }

  // Fetch the wallet entity
  const walletEntity = await base44.asServiceRole.entities.Wallet.get(wallet_id);
  if (!walletEntity) {
    return Response.json({ error: 'Wallet not found' }, { status: 404 });
  }

  // Verify the derived address matches the stored classic_address
  if (walletEntity.classic_address && walletEntity.classic_address !== wallet.classicAddress) {
    return Response.json({
      error: `Seed mismatch: derived address ${wallet.classicAddress} does not match wallet address ${walletEntity.classic_address}`,
    }, { status: 400 });
  }

  // Encrypt and store
  const { encrypted_seed, encryption_iv, encryption_salt } = await encryptSeed(seed);

  await base44.asServiceRole.entities.Wallet.update(wallet_id, {
    encrypted_seed,
    encryption_iv,
    encryption_salt,
    classic_address: wallet.classicAddress,
    last_accessed: new Date().toISOString(),
  });

  return Response.json({
    success: true,
    message: `Seed assigned and encrypted for wallet ${walletEntity.name || wallet_id}`,
    classic_address: wallet.classicAddress,
  });
});