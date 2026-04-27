/**
 * Seed Golden Acorn — Multi-Wallet Creator
 * 
 * NFT-gated wallet creation with RLUSD pricing:
 *   - First wallet: 12 RLUSD
 *   - Each additional wallet: 2 RLUSD
 * 
 * Checks user's existing wallet count to determine price.
 * Deducts from RLUSDLedger balance.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Wallet } from 'npm:xrpl@3.0.0';

const FIRST_WALLET_COST = 12;
const ADDITIONAL_WALLET_COST = 2;
const SERVICE_ID = 'seed-golden-acorn-wallet';

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
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(seed));

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action = 'create', name } = body;

    // ── Price Check ──
    if (action === 'price_check') {
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { owner_id: user.id }, '-created_date', 200
      );
      const count = wallets.length;
      const cost = count === 0 ? FIRST_WALLET_COST : ADDITIONAL_WALLET_COST;

      // Get RLUSD balance
      const ledgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
        { user_email: user.email }, '-created_date', 1
      );
      const balance = ledgers?.[0]?.balance || 0;

      return Response.json({
        wallet_count: count,
        next_cost: cost,
        balance,
        can_afford: balance >= cost,
        first_wallet_cost: FIRST_WALLET_COST,
        additional_wallet_cost: ADDITIONAL_WALLET_COST,
      });
    }

    // ── Create Wallet ──
    if (action === 'create') {
      // 1. Count existing wallets
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { owner_id: user.id }, '-created_date', 200
      );
      const count = wallets.length;
      const cost = count === 0 ? FIRST_WALLET_COST : ADDITIONAL_WALLET_COST;

      // 2. Check & deduct RLUSD balance
      const ledgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
        { user_email: user.email }, '-created_date', 1
      );
      let ledger = ledgers?.[0];
      if (!ledger) {
        ledger = await base44.asServiceRole.entities.RLUSDLedger.create({
          user_id: user.email, user_email: user.email,
          balance: 0, total_credited: 0, total_debited: 0, status: 'active',
        });
      }

      if (ledger.balance < cost) {
        return Response.json({
          error: `Insufficient RLUSD balance. Need ${cost} RLUSD, have ${ledger.balance}.`,
          code: 'INSUFFICIENT_BALANCE',
          balance: ledger.balance,
          required: cost,
        }, { status: 402 });
      }

      // 3. Deduct
      const newBalance = ledger.balance - cost;
      await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
        balance: newBalance,
        total_debited: (ledger.total_debited || 0) + cost,
      });

      // 4. Log payment
      try {
        await base44.asServiceRole.entities.PaymentUsageLog.create({
          user_id: user.email, user_email: user.email,
          service_id: SERVICE_ID,
          amount: cost, currency: 'RLUSD',
          pricing_model: count === 0 ? 'flat' : 'per_use',
          billing_behavior: 'prepay',
          status: 'success',
          balance_before: ledger.balance,
          balance_after: newBalance,
          metadata: { wallet_number: count + 1, name: name || 'Unnamed' },
        });
      } catch (_) {}

      // 5. Generate XRPL wallet on mainnet (unfunded — user pays activation)
      const wallet = Wallet.generate();

      // 6. Encrypt seed & store wallet
      const enc = await encryptSeed(wallet.seed);
      const walletData = await base44.asServiceRole.entities.Wallet.create({
        owner_id: user.id,
        name: name || `Node Wallet #${count + 1}`,
        classic_address: wallet.classicAddress,
        encrypted_seed: enc.encrypted,
        encryption_iv: enc.iv,
        encryption_salt: enc.salt,
        network: 'mainnet',
        balance: 0,
        last_accessed: new Date().toISOString(),
      });

      // 7. Log wallet access
      try {
        await base44.asServiceRole.entities.WalletAccessLog.create({
          wallet_id: walletData.id,
          user_id: user.id,
          user_email: user.email,
          action: 'create',
          success: true,
          metadata: { source: 'seed_golden_acorn', wallet_number: count + 1, cost },
        });
      } catch (_) {}

      return Response.json({
        success: true,
        wallet: {
          id: walletData.id,
          name: walletData.name,
          classic_address: wallet.classicAddress,
          balance: 0,
          network: 'mainnet',
        },
        cost_charged: cost,
        balance_after: newBalance,
        wallet_number: count + 1,
        message: `Wallet #${count + 1} created! Charged ${cost} RLUSD. Fund it with 13 XRP to activate and publish DID.`,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});