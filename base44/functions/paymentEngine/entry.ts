/**
 * Payment Engine — Core Payment Processing Endpoint
 * 
 * Actions:
 *   POST { action: "charge", service_id, session_id? }
 *     → Validate PaymentDefinition → Check balance → Deduct → Log → Return receipt
 *   
 *   POST { action: "balance" }
 *     → Return current simulated RLUSD balance (auto-creates ledger if missing)
 *   
 *   POST { action: "faucet", amount? }
 *     → Credit simulated RLUSD for testing (max 100 per claim, 1 claim per hour)
 *   
 *   POST { action: "credit", user_email, amount, reason }
 *     → Admin-only: credit RLUSD to any user
 * 
 * This is backend-only — no UI depends on this yet.
 * All balances are SIMULATED — no real XRPL transactions.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FAUCET_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const FAUCET_DEFAULT_AMOUNT = 50;
const FAUCET_MAX_AMOUNT = 100;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    // ── Authentication ──────────────────────────────────────────────────
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return Response.json({ error: 'action is required (charge, balance, faucet, credit)', code: 'MISSING_ACTION' }, { status: 400 });
    }

    // ── Route by action ──────────────────────────────────────────────────
    switch (action) {
      case 'balance':
        return await handleBalance(base44, user);
      case 'faucet':
        return await handleFaucet(base44, user, body.amount);
      case 'charge':
        return await handleCharge(base44, user, body);
      case 'credit':
        return await handleCredit(base44, user, body);
      default:
        return Response.json({ error: `Unknown action: ${action}`, code: 'UNKNOWN_ACTION' }, { status: 400 });
    }

  } catch (error) {
    return Response.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: balance — Return current simulated RLUSD balance
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
// ACTION: faucet — Credit test RLUSD (rate-limited)
// ══════════════════════════════════════════════════════════════════════════════
async function handleFaucet(base44, user, requestedAmount) {
  const ledger = await getOrCreateLedger(base44, user);

  // Rate limit: 1 claim per hour
  if (ledger.last_faucet_claim) {
    const lastClaim = new Date(ledger.last_faucet_claim).getTime();
    const elapsed = Date.now() - lastClaim;
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

  // Log the faucet credit
  await base44.asServiceRole.entities.PaymentUsageLog.create({
    user_id: user.email,
    user_email: user.email,
    service_id: '__faucet__',
    amount: amount,
    currency: 'RLUSD',
    pricing_model: 'free',
    billing_behavior: 'prepay',
    status: 'success',
    balance_before: ledger.balance,
    balance_after: newBalance,
    metadata: { source: 'faucet', claimed_at: new Date().toISOString() },
  });

  return Response.json({
    success: true,
    amount_credited: amount,
    balance: newBalance,
    currency: 'RLUSD',
    message: `Credited ${amount} simulated RLUSD`,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: charge — Deduct RLUSD for a service invocation
// ══════════════════════════════════════════════════════════════════════════════
async function handleCharge(base44, user, body) {
  const { service_id, session_id } = body;

  if (!service_id) {
    return Response.json({ error: 'service_id is required for charge', code: 'MISSING_SERVICE_ID' }, { status: 400 });
  }

  // 1. Look up PaymentDefinition for this service
  const payDefs = await base44.asServiceRole.entities.PaymentDefinition.filter(
    { service_id: service_id, status: 'active' },
    '-created_date',
    1
  );

  if (!payDefs || payDefs.length === 0) {
    // No payment definition = free service, no charge needed
    return Response.json({
      success: true,
      charged: false,
      amount: 0,
      currency: 'RLUSD',
      message: 'No PaymentDefinition found — service is free',
    });
  }

  const payDef = payDefs[0];

  // Free services pass through
  if (payDef.pricing_model === 'free' || payDef.amount <= 0) {
    return Response.json({
      success: true,
      charged: false,
      amount: 0,
      currency: 'RLUSD',
      message: 'Service is free — no charge',
    });
  }

  // 2. Get user's ledger
  const ledger = await getOrCreateLedger(base44, user);

  // Check account status
  if (ledger.status !== 'active') {
    await logPayment(base44, {
      user_id: user.email, user_email: user.email,
      service_id, payment_definition_id: payDef.id,
      amount: payDef.amount, pricing_model: payDef.pricing_model,
      billing_behavior: payDef.billing_behavior,
      status: 'failed', error_detail: `Ledger account is ${ledger.status}`,
      balance_before: ledger.balance, balance_after: ledger.balance,
      session_id,
    });
    return Response.json({
      error: `Account is ${ledger.status}`,
      code: 'ACCOUNT_FROZEN',
    }, { status: 403 });
  }

  // 3. Check spending rate limits
  const rateLimitResult = await checkSpendingLimits(base44, payDef, user.email);
  if (!rateLimitResult.allowed) {
    await logPayment(base44, {
      user_id: user.email, user_email: user.email,
      service_id, payment_definition_id: payDef.id,
      amount: payDef.amount, pricing_model: payDef.pricing_model,
      billing_behavior: payDef.billing_behavior,
      status: 'failed', error_detail: rateLimitResult.reason,
      balance_before: ledger.balance, balance_after: ledger.balance,
      session_id,
    });
    return Response.json({
      error: rateLimitResult.reason,
      code: 'SPENDING_LIMIT_EXCEEDED',
    }, { status: 429 });
  }

  // 4. Check balance
  if (ledger.balance < payDef.amount) {
    await logPayment(base44, {
      user_id: user.email, user_email: user.email,
      service_id, payment_definition_id: payDef.id,
      amount: payDef.amount, pricing_model: payDef.pricing_model,
      billing_behavior: payDef.billing_behavior,
      status: 'insufficient_balance',
      error_detail: `Balance ${ledger.balance} RLUSD < cost ${payDef.amount} RLUSD`,
      balance_before: ledger.balance, balance_after: ledger.balance,
      session_id,
    });
    return Response.json({
      error: 'Insufficient RLUSD balance',
      code: 'INSUFFICIENT_BALANCE',
      balance: ledger.balance,
      required: payDef.amount,
      currency: 'RLUSD',
    }, { status: 402 });
  }

  // 5. Deduct balance
  const newBalance = ledger.balance - payDef.amount;
  await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
    balance: newBalance,
    total_debited: (ledger.total_debited || 0) + payDef.amount,
  });

  // 6. Calculate royalties split
  const royalties = payDef.royalties_config || {};
  const treasuryPct = (royalties.treasury_percent || 50) / 100;
  const creatorPct = (royalties.creator_percent || 40) / 100;
  const referralPct = (royalties.referral_percent || 10) / 100;

  const royaltiesSplit = {
    treasury_amount: Math.round(payDef.amount * treasuryPct * 100) / 100,
    creator_amount: Math.round(payDef.amount * creatorPct * 100) / 100,
    referral_amount: Math.round(payDef.amount * referralPct * 100) / 100,
  };

  // 7. Log the payment
  await logPayment(base44, {
    user_id: user.email, user_email: user.email,
    service_id, payment_definition_id: payDef.id,
    amount: payDef.amount, pricing_model: payDef.pricing_model,
    billing_behavior: payDef.billing_behavior,
    status: 'success',
    balance_before: ledger.balance, balance_after: newBalance,
    royalties_split: royaltiesSplit,
    session_id,
  });

  // 8. Return receipt
  return Response.json({
    success: true,
    charged: true,
    amount: payDef.amount,
    currency: 'RLUSD',
    balance_before: ledger.balance,
    balance_after: newBalance,
    royalties_split: royaltiesSplit,
    pricing_model: payDef.pricing_model,
    billing_behavior: payDef.billing_behavior,
    message: `Charged ${payDef.amount} RLUSD for ${service_id}`,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: credit — Admin-only: credit RLUSD to any user
// ══════════════════════════════════════════════════════════════════════════════
async function handleCredit(base44, user, body) {
  // Admin-only
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required', code: 'ADMIN_REQUIRED' }, { status: 403 });
  }

  const { user_email, amount, reason } = body;
  if (!user_email || !amount || amount <= 0) {
    return Response.json({ error: 'user_email and positive amount required', code: 'INVALID_PARAMS' }, { status: 400 });
  }

  // Find or create ledger for target user
  const existingLedgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
    { user_email: user_email }, '-created_date', 1
  );

  let ledger;
  if (existingLedgers && existingLedgers.length > 0) {
    ledger = existingLedgers[0];
  } else {
    ledger = await base44.asServiceRole.entities.RLUSDLedger.create({
      user_id: user_email, user_email: user_email,
      balance: 0, total_credited: 0, total_debited: 0, status: 'active',
    });
  }

  const newBalance = ledger.balance + amount;
  await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
    balance: newBalance,
    total_credited: (ledger.total_credited || 0) + amount,
  });

  await logPayment(base44, {
    user_id: user_email, user_email: user_email,
    service_id: '__admin_credit__',
    amount: amount, pricing_model: 'free', billing_behavior: 'prepay',
    status: 'success',
    balance_before: ledger.balance, balance_after: newBalance,
    metadata: { credited_by: user.email, reason: reason || 'Admin credit' },
  });

  return Response.json({
    success: true,
    user_email: user_email,
    amount_credited: amount,
    balance: newBalance,
    currency: 'RLUSD',
    message: `Credited ${amount} RLUSD to ${user_email}`,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

async function getOrCreateLedger(base44, user) {
  const existing = await base44.asServiceRole.entities.RLUSDLedger.filter(
    { user_email: user.email }, '-created_date', 1
  );

  if (existing && existing.length > 0) return existing[0];

  // Auto-create ledger with 0 balance
  return await base44.asServiceRole.entities.RLUSDLedger.create({
    user_id: user.email,
    user_email: user.email,
    balance: 0,
    total_credited: 0,
    total_debited: 0,
    status: 'active',
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
    const oneHourAgo = now - (60 * 60 * 1000);
    const hourlySpend = recentPayments
      .filter(p => new Date(p.created_date).getTime() > oneHourAgo)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    if (hourlySpend + payDef.amount > maxPerHour) {
      return { allowed: false, reason: `Hourly spend limit ${maxPerHour} RLUSD exceeded` };
    }
  }

  if (maxPerDay > 0) {
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const dailySpend = recentPayments
      .filter(p => new Date(p.created_date).getTime() > oneDayAgo)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    if (dailySpend + payDef.amount > maxPerDay) {
      return { allowed: false, reason: `Daily spend limit ${maxPerDay} RLUSD exceeded` };
    }
  }

  return { allowed: true };
}

async function logPayment(base44, data) {
  try {
    await base44.asServiceRole.entities.PaymentUsageLog.create({
      user_id: data.user_id,
      user_email: data.user_email,
      service_id: data.service_id,
      payment_definition_id: data.payment_definition_id || null,
      amount: data.amount,
      currency: 'RLUSD',
      pricing_model: data.pricing_model || null,
      billing_behavior: data.billing_behavior || null,
      status: data.status,
      error_detail: data.error_detail || null,
      balance_before: data.balance_before,
      balance_after: data.balance_after,
      royalties_split: data.royalties_split || null,
      service_usage_log_id: data.service_usage_log_id || null,
      session_id: data.session_id || null,
      metadata: data.metadata || null,
    });
  } catch (e) {
    console.error('[PaymentEngine] Failed to log payment:', e.message);
  }
}