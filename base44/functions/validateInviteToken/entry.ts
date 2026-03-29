import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Client, Wallet } from 'npm:xrpl@3.0.0';

async function encryptSeed(seed) {
  const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
  if (!masterKey) {
    throw new Error('WALLET_ENCRYPTION_KEY not configured');
  }

  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

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
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(seed)
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt))
  };
}

async function createPrefundedInviteWallet(base44, token) {
  const client = new Client('wss://s.altnet.rippletest.net:51233');
  await client.connect();

  const wallet = Wallet.generate();
  const sponsorSeed = Deno.env.get('XRPL_SENDER_SEED') || Deno.env.get('NATHAN_GREEN_TESTNET_SEED');

  if (!sponsorSeed) {
    await client.disconnect();
    throw new Error('Sponsor wallet seed not configured');
  }

  const sponsorWallet = Wallet.fromSeed(sponsorSeed);
  const payment = {
    TransactionType: 'Payment',
    Account: sponsorWallet.classicAddress,
    Destination: wallet.classicAddress,
    Amount: '13000000'
  };

  const prepared = await client.autofill(payment);
  const signed = sponsorWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  if (result.result.meta?.TransactionResult !== 'tesSUCCESS') {
    await client.disconnect();
    throw new Error(`Funding failed: ${result.result.meta?.TransactionResult || 'unknown error'}`);
  }

  let accountInfo = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      accountInfo = await client.request({
        command: 'account_info',
        account: wallet.classicAddress,
        ledger_index: 'validated'
      });
      break;
    } catch (error) {
      if (attempt === 7) {
        await client.disconnect();
        throw new Error('Wallet was funded but is not yet visible on the network. Please try the invite again in a moment.');
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  const balance = Number(accountInfo.result.account_data.Balance) / 1000000;
  await client.disconnect();

  const encrypted = await encryptSeed(wallet.seed);

  const walletRecord = await base44.asServiceRole.entities.Wallet.create({
    owner_id: token.id,
    name: `${token.recipient_nickname || 'Invited'} Wallet`,
    classic_address: wallet.classicAddress,
    encrypted_seed: encrypted.encrypted,
    encryption_iv: encrypted.iv,
    encryption_salt: encrypted.salt,
    network: 'testnet',
    balance,
    notes: `Invite wallet for ${token.token_id}`,
    last_accessed: new Date().toISOString()
  });

  return {
    id: walletRecord.id,
    classic_address: walletRecord.classic_address,
    network: walletRecord.network,
    balance: walletRecord.balance
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token_id } = body;

    if (!token_id) {
      return Response.json({ error: 'token_id required' }, { status: 400 });
    }

    const tokens = await base44.asServiceRole.entities.InvitationToken.filter({
      token_id: token_id.trim().toUpperCase()
    });

    if (!tokens || tokens.length === 0) {
      return Response.json({ valid: false, error: 'Invalid invite code' });
    }

    const token = tokens[0];

    if (token.status !== 'active') {
      return Response.json({ valid: false, error: 'This invite has already been used or revoked' });
    }

    if (token.expiration_date && new Date(token.expiration_date) < new Date()) {
      return Response.json({ valid: false, error: 'This invite has expired' });
    }

    const wallet = await createPrefundedInviteWallet(base44, token);

    if (token.usage_type === 'single') {
      await base44.asServiceRole.entities.InvitationToken.update(token.id, {
        status: 'claimed',
        claimed_count: (token.claimed_count || 0) + 1
      });
    } else {
      const newCount = (token.claimed_count || 0) + 1;
      if (newCount >= (token.max_claims || 1)) {
        await base44.asServiceRole.entities.InvitationToken.update(token.id, {
          status: 'claimed',
          claimed_count: newCount
        });
      } else {
        await base44.asServiceRole.entities.InvitationToken.update(token.id, {
          claimed_count: newCount
        });
      }
    }

    return Response.json({
      valid: true,
      token_id: token.token_id,
      recipient_nickname: token.recipient_nickname || 'New Soul',
      kinetic_weight: token.kinetic_weight || 10,
      notes: token.notes || null,
      wallet
    });
  } catch (error) {
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
});