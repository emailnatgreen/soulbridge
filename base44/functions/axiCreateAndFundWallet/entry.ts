import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { Wallet } from 'npm:xrpl@3.0.0';

async function encryptSeed(seed) {
  const masterKey = Deno.env.get('WALLET_ENCRYPTION_KEY');
  if (!masterKey) return { encrypted_seed: seed, encryption_iv: null, encryption_salt: null };

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
    try {
        const base44 = createClientFromRequest(req);
        const { walletName = 'Agent Wallet' } = await req.json();

        // Generate new wallet keypair (no funding — user sends XRP manually)
        const newWallet = Wallet.generate();

        // Store wallet in database
        const user = await base44.auth.me();
        const seedData = await encryptSeed(newWallet.seed);

        const walletData = await base44.asServiceRole.entities.Wallet.create({
            owner_id: user?.id || 'system',
            name: walletName,
            classic_address: newWallet.address,
            encrypted_seed: seedData.encrypted_seed,
            encryption_iv: seedData.encryption_iv,
            encryption_salt: seedData.encryption_salt,
            network: 'mainnet',
            balance: 0
        });

        // Create memory of wallet creation
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi',
            type: 'village_detail',
            content: `Created new mainnet wallet: ${walletName} (${newWallet.address}) — awaiting manual funding`,
            keywords: ['wallet', 'creation', 'mainnet', 'unfunded'],
            context: 'Wallet created, user will fund via Xumm or external transfer',
            importance: 8,
            related_entity_id: walletData.id,
            related_entity_type: 'Wallet'
        });

        return Response.json({
            success: true,
            wallet: {
                id: walletData.id,
                name: walletData.name,
                classic_address: newWallet.address,
                network: 'mainnet',
                balance: 0
            },
            message: `✨ Wallet created: ${walletName} (${newWallet.address}) — fund it manually to activate`
        });

    } catch (error) {
        console.error('Error in axiCreateAndFundWallet:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});