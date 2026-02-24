import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import xrpl from 'npm:xrpl@3.1.2';

// Decrypt wallet seed using AES-GCM
async function decryptSeed(encryptedSeed, iv, salt) {
  const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
  if (!masterKey) {
    throw new Error('Encryption key not configured');
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterKey),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16))),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
    },
    key,
    new Uint8Array(encryptedSeed.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
  );

  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id } = await req.json();

    if (!wallet_id) {
      return Response.json({ error: 'wallet_id is required' }, { status: 400 });
    }

    // Get wallet
    const wallets = await base44.entities.Wallet.filter({ id: wallet_id });
    if (!wallets || wallets.length === 0) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const wallet = wallets[0];

    // Verify ownership
    if (wallet.owner_id !== user.id) {
      return Response.json({ error: 'Not authorized to reverse this DID' }, { status: 403 });
    }

    // Check if wallet is actually revoked
    if (!wallet.notes?.includes('REVOKED')) {
      return Response.json({ error: 'DID is not revoked' }, { status: 400 });
    }

    // Decrypt wallet seed
    const seed = await decryptSeed(
      wallet.encrypted_seed,
      wallet.encryption_iv,
      wallet.encryption_salt
    );

    // Connect to XRPL
    const networkUrl = wallet.network === 'mainnet' 
      ? 'wss://xrplcluster.com' 
      : 'wss://s.altnet.rippletest.net:51233';
    
    const client = new xrpl.Client(networkUrl);
    await client.connect();

    // Create wallet from seed
    const xrplWallet = xrpl.Wallet.fromSeed(seed);

    // Build minimal DID document
    const didDocument = {
      "@context": "https://www.w3.org/ns/did/v1",
      "id": `did:xrpl:${wallet.classic_address}`,
      "alsoKnownAs": [wallet.name || 'SoulBridge Citizen'],
      "service": [{
        "id": `did:xrpl:${wallet.classic_address}#village`,
        "type": "SoulBridgeProfile",
        "serviceEndpoint": "https://soulbridge.base44.app"
      }]
    };

    // Create DIDSet transaction to recreate the DID
    const tx = {
      TransactionType: "DIDSet",
      Account: wallet.classic_address,
      DIDDocument: Buffer.from(JSON.stringify(didDocument)).toString('hex').toUpperCase(),
      Data: Buffer.from("DID recreated via SoulBridge").toString('hex').toUpperCase(),
      URI: Buffer.from("https://soulbridge.base44.app").toString('hex').toUpperCase(),
      Fee: "12"
    };

    // Prepare and sign transaction
    const prepared = await client.autofill(tx);
    const signed = xrplWallet.sign(prepared);

    // Submit transaction
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();

    if (result.result.meta.TransactionResult !== 'tesSUCCESS') {
      return Response.json({ 
        error: 'Transaction failed', 
        details: result.result.meta.TransactionResult 
      }, { status: 500 });
    }

    // Update wallet notes to remove revocation and add reversal timestamp
    const revocationInfo = wallet.notes.match(/REVOKED at (.*?)(?:\. Reason: (.*))?$/);
    const previousRevocation = revocationInfo 
      ? `Previously revoked at ${revocationInfo[1]}. Reason: ${revocationInfo[2] || 'None'}` 
      : 'Previously revoked';
    
    await base44.asServiceRole.entities.Wallet.update(wallet_id, {
      notes: `${previousRevocation}. Revocation reversed at ${new Date().toISOString()}`
    });

    return Response.json({
      success: true,
      message: 'DID revocation reversed successfully',
      transaction_hash: result.result.hash,
      did: `did:xrpl:${wallet.classic_address}`
    });

  } catch (error) {
    console.error('Error reversing DID revocation:', error);
    return Response.json({ 
      error: 'Failed to reverse DID revocation', 
      message: error.message 
    }, { status: 500 });
  }
});