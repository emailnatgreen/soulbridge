import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Client, Wallet as XRPLWallet } from 'npm:xrpl@3.0.0';

async function decryptSeed(encryptedData, iv, salt) {
  const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
  if (!masterKey) throw new Error('WALLET_ENCRYPTION_KEY not configured');

  const encoder = new TextEncoder();
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
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes }, key, encryptedBytes
  );
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  let client;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { wallet_id } = await req.json();
    if (!wallet_id) {
      return Response.json({ error: 'wallet_id is required' }, { status: 400 });
    }

    const wallet = await base44.asServiceRole.entities.Wallet.get(wallet_id);
    if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });

    // Allow re-publishing (DID updates are valid on XRPL)

    if (!wallet.encrypted_seed) {
      return Response.json({ error: 'No seed stored for this wallet — cannot auto-publish' }, { status: 400 });
    }

    // Decrypt the seed (or use plain seed if not encrypted)
    let seed;
    if (wallet.encryption_iv && wallet.encryption_salt) {
      seed = await decryptSeed(wallet.encrypted_seed, wallet.encryption_iv, wallet.encryption_salt);
    } else {
      // Legacy: seed stored unencrypted (starts with 's')
      seed = wallet.encrypted_seed;
    }
    const xrplWallet = XRPLWallet.fromSeed(seed);

    // Connect to mainnet
    client = new Client('wss://xrplcluster.com');
    await client.connect();

    // Build URI for the DID
    const uri = `https://soulbridge.base44.app/SharedDidView?address=${wallet.classic_address}`;
    const uriHex = Array.from(new TextEncoder().encode(uri))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    // Build and submit DIDSet transaction
    const tx = {
      TransactionType: 'DIDSet',
      Account: xrplWallet.classicAddress,
      URI: uriHex,
    };

    const prepared = await client.autofill(tx);
    const signed = xrplWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();
    client = null;

    const txResult = result.result.meta?.TransactionResult || result.result.engine_result;

    if (txResult === 'tesSUCCESS') {
      await base44.asServiceRole.entities.Wallet.update(wallet_id, {
        is_published: true,
        published_at: new Date().toISOString(),
        published_txid: result.result.hash,
      });

      // Log a memory of the publication
      await base44.asServiceRole.entities.Memory.create({
        agent_id: 'axi',
        type: 'village_detail',
        content: `DID published on mainnet for wallet ${wallet.name || wallet_id} (${wallet.classic_address}). TX: ${result.result.hash}`,
        keywords: ['did', 'publish', 'mainnet', 'vip'],
        context: 'Auto-published DID from VIP Dashboard',
        importance: 9,
        related_entity_id: wallet_id,
        related_entity_type: 'Wallet',
      });

      return Response.json({
        success: true,
        txid: result.result.hash,
        message: 'DID published successfully on XRPL Mainnet',
        xrpscan_link: `https://xrpscan.com/tx/${result.result.hash}`,
      });
    } else {
      return Response.json({
        success: false,
        message: `Transaction failed: ${txResult}`,
        details: result.result,
      }, { status: 500 });
    }

  } catch (error) {
    if (client) { try { await client.disconnect(); } catch (_) {} }
    console.error('publishDIDAuto error:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});