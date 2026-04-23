/**
 * Payment Engine — Core Payment Processing Endpoint
 * 
 * PAYMENT MODEL (2026-04-23):
 *   Only RLUSD_ON_XRPL and PAYPAL_FIAT are accepted for new transactions.
 *   XRP, PYUSD, and RLUSD_BASE are LEGACY only — blocked for new charges.
 * 
 * Actions:
 *   POST { action: "charge", service_id, session_id?, payment_method? }
 *   POST { action: "balance" }
 *   POST { action: "faucet", amount? }
 *   POST { action: "credit", user_email, amount, reason }
 *   POST { action: "marketplace_charge", listing_id, payment_method, payment_reference, amount, marketplace_type? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FAUCET_COOLDOWN_MS = 60 * 60 * 1000;
const FAUCET_DEFAULT_AMOUNT = 50;
const FAUCET_MAX_AMOUNT = 100;

const ALLOWED_PAYMENT_METHODS = ['RLUSD_ON_XRPL', 'PAYPAL_FIAT'];
const LEGACY_CURRENCIES = ['XRP', 'PYUSD', 'RLUSD_BASE'];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return Response.json({ error: 'action is required', code: 'MISSING_ACTION' }, { status: 400 });
    }

    switch (action) {
      case 'balance':
        return await handleBalance(base44, user);
      case 'faucet':
        return await handleFaucet(base44, user, body.amount);
      case 'charge':
        return await handleCharge(base44, user, body);
      case 'credit':
        return await handleCredit(base44, user, body);
      case 'marketplace_charge':
        return await handleMarketplaceCharge(base44, user, body);
      default:
        return Response.json({ error: `Unknown action: ${action}`, code: 'UNKNOWN_ACTION' }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: balance
// ══════════════════════════════════════════════════════════════════════════════
async function handleBalance(base44, user) {
  const ledger = await getOrCreateLedger(base44, user);
  return Response.json({
    user_id: user.email,
    balance: ledger.balance,
    total_credited: ledger.total_credited,
    total_debited: ledger.total_debited,
    currency: 'RLUSD',
    status: ledger.status,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: faucet
// ══════════════════════════════════════════════════════════════════════════════
async function handleFaucet(base44, user, requestedAmount) {
  const ledger = await getOrCreateLedger(base44, user);

  if (ledger.last_faucet_claim) {
    const elapsed = Date.now() - new Date(ledger.last_faucet_claim).getTime();
    if (elapsed < FAUCET_COOLDOWN_MS) {
      const remaining = Math.ceil((FAUCET_COOLDOWN_MS - elapsed) / 60000);
      return Response.json({
        error: `Faucet cooldown: ${remaining} minutes remaining`,
        code: 'FAUCET_COOLDOWN',
        retry_after_minutes: remaining,
      }, { status: 429 });
    }
  }

  const amount = Math.min(requestedAmount || FAUCET_DEFAULT_AMOUNT, FAUCET_MAX_AMOUNT);
  const newBalance = ledger.balance + amount;

  await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
    balance: newBalance,
    total_credited: (ledger.total_credited || 0) + amount,
    last_faucet_claim: new Date().toISOString(),
  });

  await logPayment(base44, {
    user_id: user.email, user_email: user.email,
    service_id: '__faucet__',
    amount, pricing_model: 'free', billing_behavior: 'prepay',
    status: 'success',
    balance_before: ledger.balance, balance_after: newBalance,
    metadata: { source: 'faucet', claimed_at: new Date().toISOString() },
  });

  return Response.json({
    success: true, amount_credited: amount, balance: newBalance,
    currency: 'RLUSD', message: `Credited ${amount} simulated RLUSD`,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: charge — Deduct RLUSD for a service (internal simulated balance)
// ══════════════════════════════════════════════════════════════════════════════
async function handleCharge(base44, user, body) {
  const { service_id, session_id, payment_method } = body;

  if (!service_id) {
    return Response.json({ error: 'service_id is required for charge', code: 'MISSING_SERVICE_ID' }, { status: 400 });
  }

  // Validate payment_method if provided — block legacy currencies
  if (payment_method && !ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
    return Response.json({
      error: `payment_method "${payment_method}" is not accepted. Use: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
      code: 'LEGACY_PAYMENT_BLOCKED',
    }, { status: 400 });
  }

  const payDefs = await base44.asServiceRole.entities.PaymentDefinition.filter(
    { service_id, status: 'active' }, '-created_date', 1
  );

  if (!payDefs || payDefs.length === 0) {
    return Response.json({ success: true, charged: false, amount: 0, currency: 'RLUSD', message: 'Service is free' });
  }

  const payDef = payDefs[0];

  if (payDef.pricing_model === 'free' || payDef.amount <= 0) {
    return Response.json({ success: true, charged: false, amount: 0, currency: 'RLUSD', message: 'Service is free' });
  }

  const ledger = await getOrCreateLedger(base44, user);

  if (ledger.status !== 'active') {
    await logPayment(base44, {
      user_id: user.email, user_email: user.email,
      service_id, payment_definition_id: payDef.id,
      amount: payDef.amount, pricing_model: payDef.pricing_model,
      billing_behavior: payDef.billing_behavior,
      status: 'failed', error_detail: `Account is ${ledger.status}`,
      balance_before: ledger.balance, balance_after: ledger.balance, session_id,
    });
    return Response.json({ error: `Account is ${ledger.status}`, code: 'ACCOUNT_FROZEN' }, { status: 403 });
  }

  const rateLimitResult = await checkSpendingLimits(base44, payDef, user.email);
  if (!rateLimitResult.allowed) {
    await logPayment(base44, {
      user_id: user.email, user_email: user.email,
      service_id, payment_definition_id: payDef.id,
      amount: payDef.amount, pricing_model: payDef.pricing_model,
      billing_behavior: payDef.billing_behavior,
      status: 'failed', error_detail: rateLimitResult.reason,
      balance_before: ledger.balance, balance_after: ledger.balance, session_id,
    });
    return Response.json({ error: rateLimitResult.reason, code: 'SPENDING_LIMIT_EXCEEDED' }, { status: 429 });
  }

  if (ledger.balance < payDef.amount) {
    await logPayment(base44, {
      user_id: user.email, user_email: user.email,
      service_id, payment_definition_id: payDef.id,
      amount: payDef.amount, pricing_model: payDef.pricing_model,
      billing_behavior: payDef.billing_behavior,
      status: 'insufficient_balance',
      error_detail: `Balance ${ledger.balance} < cost ${payDef.amount}`,
      balance_before: ledger.balance, balance_after: ledger.balance, session_id,
    });
    return Response.json({
      error: 'Insufficient RLUSD balance', code: 'INSUFFICIENT_BALANCE',
      balance: ledger.balance, required: payDef.amount, currency: 'RLUSD',
    }, { status: 402 });
  }

  const newBalance = ledger.balance - payDef.amount;
  await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
    balance: newBalance,
    total_debited: (ledger.total_debited || 0) + payDef.amount,
  });

  const royalties = payDef.royalties_config || {};
  const royaltiesSplit = {
    treasury_amount: Math.round(payDef.amount * ((royalties.treasury_percent || 50) / 100) * 100) / 100,
    creator_amount: Math.round(payDef.amount * ((royalties.creator_percent || 40) / 100) * 100) / 100,
    referral_amount: Math.round(payDef.amount * ((royalties.referral_percent || 10) / 100) * 100) / 100,
  };

  await logPayment(base44, {
    user_id: user.email, user_email: user.email,
    service_id, payment_definition_id: payDef.id,
    amount: payDef.amount, pricing_model: payDef.pricing_model,
    billing_behavior: payDef.billing_behavior,
    status: 'success',
    balance_before: ledger.balance, balance_after: newBalance,
    royalties_split: royaltiesSplit, session_id,
  });

  return Response.json({
    success: true, charged: true, amount: payDef.amount, currency: 'RLUSD',
    payment_method: payment_method || 'RLUSD_ON_XRPL',
    balance_before: ledger.balance, balance_after: newBalance,
    royalties_split: royaltiesSplit,
    message: `Charged ${payDef.amount} RLUSD for ${service_id}`,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: marketplace_charge — Process a marketplace payment with new model
// ══════════════════════════════════════════════════════════════════════════════
async function handleMarketplaceCharge(base44, user, body) {
  const { listing_id, payment_method, payment_reference, amount, marketplace_type } = body;

  if (!listing_id) return Response.json({ error: 'listing_id required', code: 'MISSING_LISTING' }, { status: 400 });
  if (!payment_method) return Response.json({ error: 'payment_method required', code: 'MISSING_PAYMENT_METHOD' }, { status: 400 });
  if (!amount || amount <= 0) return Response.json({ error: 'amount must be positive', code: 'INVALID_AMOUNT' }, { status: 400 });

  // Block legacy payment methods
  if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
    return Response.json({
      error: `payment_method "${payment_method}" is blocked. Only RLUSD_ON_XRPL and PAYPAL_FIAT accepted.`,
      code: 'LEGACY_PAYMENT_BLOCKED',
    }, { status: 400 });
  }

  // For RLUSD_ON_XRPL: verify via internal balance
  if (payment_method === 'RLUSD_ON_XRPL') {
    const ledger = await getOrCreateLedger(base44, user);
    if (ledger.balance < amount) {
      return Response.json({
        error: 'Insufficient RLUSD balance', code: 'INSUFFICIENT_BALANCE',
        balance: ledger.balance, required: amount,
      }, { status: 402 });
    }
    const newBalance = ledger.balance - amount;
    await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
      balance: newBalance,
      total_debited: (ledger.total_debited || 0) + amount,
    });
  }

  // For PAYPAL_FIAT: trust DIDit's confirmation (payment_reference is the PayPal ID)

  // Calculate village fee
  const villageFee = Math.round(amount * 0.01 * 100) / 100; // 1%
  const sellerReceives = amount - villageFee;

  // Write MarketplaceTransaction
  const txn = await base44.asServiceRole.entities.MarketplaceTransaction.create({
    listing_id,
    buyer_agent_id: user.email,
    seller_agent_id: 'pending_resolution',
    payment_method,
    unit_amount: amount,
    purchase_price_rlusd: amount,
    payment_reference: payment_reference || null,
    source: 'soulbridge',
    marketplace_type: marketplace_type || 'resource',
    status: 'completed',
    completion_date: new Date().toISOString(),
    distribution_details: {
      seller_receives_rlusd: sellerReceives,
      village_fee_rlusd: villageFee,
      treasury_fee_rlusd: villageFee,
    },
    metadata: { charged_by: user.email, payment_method },
  });

  return Response.json({
    success: true,
    transaction_id: txn.id,
    payment_method,
    amount,
    village_fee: villageFee,
    seller_receives: sellerReceives,
    message: `Payment processed via ${payment_method}`,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: credit — Admin-only
// ══════════════════════════════════════════════════════════════════════════════
async function handleCredit(base44, user, body) {
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required', code: 'ADMIN_REQUIRED' }, { status: 403 });
  }

  const { user_email, amount, reason } = body;
  if (!user_email || !amount || amount <= 0) {
    return Response.json({ error: 'user_email and positive amount required', code: 'INVALID_PARAMS' }, { status: 400 });
  }

  const existing = await base44.asServiceRole.entities.RLUSDLedger.filter(
    { user_email }, '-created_date', 1
  );

  let ledger;
  if (existing?.length) {
    ledger = existing[0];
  } else {
    ledger = await base44.asServiceRole.entities.RLUSDLedger.create({
      user_id: user_email, user_email, balance: 0, total_credited: 0, total_debited: 0, status: 'active',
    });
  }

  const newBalance = ledger.balance + amount;
  await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
    balance: newBalance,
    total_credited: (ledger.total_credited || 0) + amount,
  });

  await logPayment(base44, {
    user_id: user_email, user_email,
    service_id: '__admin_credit__',
    amount, pricing_model: 'free', billing_behavior: 'prepay',
    status: 'success',
    balance_before: ledger.balance, balance_after: newBalance,
    metadata: { credited_by: user.email, reason: reason || 'Admin credit' },
  });

  return Response.json({
    success: true, user_email, amount_credited: amount, balance: newBalance,
    currency: 'RLUSD', message: `Credited ${amount} RLUSD to ${user_email}`,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function getOrCreateLedger(base44, user) {
  const existing = await base44.asServiceRole.entities.RLUSDLedger.filter(
    { user_email: user.email }, '-created_date', 1
  );
  if (existing?.length) return existing[0];
  return await base44.asServiceRole.entities.RLUSDLedger.create({
    user_id: user.email, user_email: user.email,
    balance: 0, total_credited: 0, total_debited: 0, status: 'active',
  });
}

async function checkSpendingLimits(base44, payDef, userEmail) {
  const limits = payDef.rate_limits || {};
  const maxPerDay = limits.max_spend_per_day || 0;
  const maxPerHour = limits.max_spend_per_hour || 0;

  if (maxPerDay <= 0 && maxPerHour <= 0) return { allowed: true };

  const recentPayments = await base44.asServiceRole.entities.PaymentUsageLog.filter(
    { user_email: userEmail, service_id: payDef.service_id, status: 'success' },
    '-created_date', 200
  );

  const now = Date.now();

  if (maxPerHour > 0) {
    const hourlySpend = recentPayments
      .filter(p => new Date(p.created_date).getTime() > now - 3600000)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    if (hourlySpend + payDef.amount > maxPerHour) {
      return { allowed: false, reason: `Hourly limit ${maxPerHour} RLUSD exceeded` };
    }
  }

  if (maxPerDay > 0) {
    const dailySpend = recentPayments
      .filter(p => new Date(p.created_date).getTime() > now - 86400000)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    if (dailySpend + payDef.amount > maxPerDay) {
      return { allowed: false, reason: `Daily limit ${maxPerDay} RLUSD exceeded` };
    }
  }

  return { allowed: true };
}

async function logPayment(base44, data) {
  try {
    await base44.asServiceRole.entities.PaymentUsageLog.create({
      user_id: data.user_id, user_email: data.user_email,
      service_id: data.service_id,
      payment_definition_id: data.payment_definition_id || null,
      amount: data.amount, currency: 'RLUSD',
      pricing_model: data.pricing_model || null,
      billing_behavior: data.billing_behavior || null,
      status: data.status, error_detail: data.error_detail || null,
      balance_before: data.balance_before, balance_after: data.balance_after,
      royalties_split: data.royalties_split || null,
      session_id: data.session_id || null, metadata: data.metadata || null,
    });
  } catch (e) {
    console.error('[PaymentEngine] Failed to log payment:', e.message);
  }
}