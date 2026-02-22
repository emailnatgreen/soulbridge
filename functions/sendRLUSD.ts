import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet } from 'npm:xrpl@4.0.0';

const RLUSD_CONFIG = {
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De"
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id, recipient_address, amount, destination_tag, note } = await req.json();

    if (!wallet_id || !recipient_address || !amount) {
      return Response.json({ 
        error: 'wallet_id, recipient_address, and amount are required' 
      }, { status: 400 });
    }

    const walletRecord = await base44.entities.Wallet.get(wallet_id);
    
    // Verify wallet ownership
    if (walletRecord.owner_id !== user.id) {
      return Response.json({ error: 'Wallet not owned by current user' }, { status: 403 });
    }

    if (!walletRecord.encrypted_seed) {
      return Response.json({ 
        error: 'Cannot send from tracking-only wallet' 
      }, { status: 400 });
    }

    if (!walletRecord?.metadata?.has_rlusd_trustline) {
      return Response.json({ 
        error: 'Wallet does not have RLUSD trustline activated' 
      }, { status: 400 });
    }

    // Decrypt seed
    let seed;
    try {
      seed = await decryptSeed(
        walletRecord.encrypted_seed,
        walletRecord.encryption_iv,
        walletRecord.encryption_salt
      );
    } catch (error) {
      return Response.json({
        error: 'Failed to decrypt wallet seed'
      }, { status: 400 });
    }

    const client = new Client('wss://xrpl.ws');
    await client.connect();

    try {
      const wallet = Wallet.fromSeed(seed);
      const address = walletRecord.classic_address;

      // Create payment transaction
      const paymentTx = {
        TransactionType: "Payment",
        Account: address,
        Destination: recipient_address,
        Amount: {
          currency: RLUSD_CONFIG.currency,
          issuer: RLUSD_CONFIG.issuer,
          value: amount.toString()
        },
        Fee: "12"
      };

      if (destination_tag) {
        paymentTx.DestinationTag = destination_tag;
      }

      const prepared = await client.autofill(paymentTx);
      const signed = wallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);

      await client.disconnect();

      if (result.result.meta.TransactionResult === "tesSUCCESS") {
        return Response.json({
          success: true,
          transaction_hash: result.result.hash,
          amount: amount,
          recipient: recipient_address,
          message: `Successfully sent ${amount} RLUSD`
        });
      } else {
        const txResult = result.result.meta.TransactionResult;
        return Response.json({
          success: false,
          error: txResult,
          message: `Transaction failed: ${txResult}`
        }, { status: 500 });
      }
    } finally {
      await client.disconnect();
    }

  } catch (error) {
    console.error('Error sending RLUSD:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});