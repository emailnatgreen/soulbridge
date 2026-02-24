import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import xrpl from 'npm:xrpl@3.1.2';
import { Buffer } from 'node:buffer';

// Decrypt wallet seed
async function decryptSeed(encryptedData, iv, salt) {
  const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
  if (!masterKey) throw new Error('WALLET_ENCRYPTION_KEY not set');

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterKey),
    'PBKDF2',
    false,
    ['deriveCBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: Buffer.from(salt, 'hex'),
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
      iv: Buffer.from(iv, 'hex')
    },
    key,
    Buffer.from(encryptedData, 'hex')
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

    const { wallet_id, reason } = await req.json();

    if (!wallet_id) {
      return Response.json({ error: 'wallet_id is required' }, { status: 400 });
    }

    // Get wallet
    const wallet = await base44.entities.Wallet.filter({ id: wallet_id });
    if (!wallet || wallet.length === 0) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const walletData = wallet[0];

    // Verify ownership or permission
    const isOwner = walletData.owner_id === user.id;
    
    if (!isOwner) {
      // Check if user has an agent with permission
      const userAgents = await base44.entities.Agent.filter({ 
        classic_address: user.email // Assuming agents might be linked by email or another identifier
      });
      
      let hasPermission = false;
      
      if (userAgents.length > 0) {
        // Check if any of the user's agents have permission to revoke
        const permissions = await base44.entities.DidPermission.filter({
          did_classic_address: walletData.classic_address,
          action: 'revoke_did',
          status: 'active'
        });
        
        hasPermission = permissions.some(p => 
          userAgents.some(agent => agent.id === p.agent_id)
        );
      }
      
      if (!hasPermission) {
        return Response.json({ error: 'Not authorized to revoke this DID' }, { status: 403 });
      }
    }

    // Decrypt seed
    const seed = await decryptSeed(
      walletData.encrypted_seed,
      walletData.encryption_iv,
      walletData.encryption_salt
    );

    // Connect to XRPL
    const networkUrl = walletData.network === 'mainnet' 
      ? 'wss://xrplcluster.com' 
      : 'wss://s.altnet.rippletest.net:51233';
    
    const client = new xrpl.Client(networkUrl);
    await client.connect();

    // Create wallet from seed
    const xrplWallet = xrpl.Wallet.fromSeed(seed);

    // Submit DIDDelete transaction
    const tx = {
      TransactionType: 'DIDDelete',
      Account: xrplWallet.address
    };

    const prepared = await client.autofill(tx);
    const signed = xrplWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();

    // Update wallet notes to reflect revocation
    const revocationNote = `REVOKED at ${new Date().toISOString()}${reason ? `. Reason: ${reason}` : ''}`;
    await base44.asServiceRole.entities.Wallet.update(wallet_id, {
      notes: revocationNote
    });

    // Log the revocation
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'did_revoked',
        did_classic_address: walletData.classic_address,
        wallet_id: wallet_id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: { reason: reason || 'No reason provided', transaction_hash: result.result.hash },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log revocation:', logError);
    }

    return Response.json({
      success: true,
      message: 'DID successfully revoked on XRPL',
      transaction: result.result.hash,
      wallet_id: wallet_id
    });

  } catch (error) {
    console.error('Error revoking DID:', error);
    return Response.json({ 
      error: 'Failed to revoke DID', 
      message: error.message 
    }, { status: 500 });
  }
});