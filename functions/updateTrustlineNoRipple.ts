import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { Client, Wallet } from 'npm:xrpl@3.0.0';

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
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { wallet_id, currency, issuer, no_ripple, limit } = await req.json();

    if (!wallet_id || !currency || !issuer) {
      return Response.json({ error: 'Missing required fields: wallet_id, currency, issuer' }, { status: 400 });
    }

    const walletRecord = await base44.entities.Wallet.get(wallet_id);
    if (!walletRecord) return Response.json({ error: 'Wallet not found' }, { status: 404 });
    if (walletRecord.owner_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (!walletRecord.encrypted_seed || !walletRecord.encryption_iv || !walletRecord.encryption_salt) {
      return Response.json({ error: 'Wallet has no signing key — tracking-only wallet cannot sign transactions' }, { status: 400 });
    }

    const seed = await decryptSeed(walletRecord.encrypted_seed, walletRecord.encryption_iv, walletRecord.encryption_salt);

    const endpoint = walletRecord.network === 'mainnet' ? 'wss://xrpl.ws' : 'wss://s.altnet.rippletest.net:51233';
    const client = new Client(endpoint);
    await client.connect();

    try {
      // tfSetNoRipple = 131072 (0x20000), tfClearNoRipple = 262144 (0x40000)
      const flags = no_ripple ? 131072 : 262144;

      const xrplWallet = Wallet.fromSeed(seed);
      const prepared = await client.autofill({
        TransactionType: 'TrustSet',
        Account: walletRecord.classic_address,
        LimitAmount: {
          currency,
          issuer,
          value: limit || '1000000000'
        },
        Flags: flags,
        Fee: '12'
      });

      const signed = xrplWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);
      await client.disconnect();

      const txResult = result.result.meta.TransactionResult;
      if (txResult === 'tesSUCCESS') {
        console.log(`✅ NoRipple flag ${no_ripple ? 'SET' : 'CLEARED'} for ${currency} on ${walletRecord.classic_address}`);
        return Response.json({ success: true, transaction_hash: result.result.hash, no_ripple });
      } else {
        return Response.json({ success: false, error: txResult }, { status: 500 });
      }
    } catch (err) {
      await client.disconnect();
      throw err;
    }
  } catch (error) {
    console.error('updateTrustlineNoRipple error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});