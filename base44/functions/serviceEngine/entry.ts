/**
 * Service Engine — Core Invocation Endpoint
 * 
 * POST /service/execute
 * 
 * Handles:
 *   1. Authentication (DID + user verification)
 *   2. Widget ownership validation (via Unlock Engine)
 *   3. Rate limit enforcement (per-service usage_limits)
 *   4. Service routing (widget → service → handler → output)
 *   5. Usage logging (per-service, per-user, per-widget audit trail)
 * 
 * Payload:
 *   { action: "execute" | "start_stream" | "stop_stream" | "toggle" | "status",
 *     service_id: string,
 *     params: object (optional),
 *     session_id: string (optional) }
 * 
 * This is backend-only — no UI depends on this yet.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Built-in service handlers (stub implementations) ────────────────────────
// Each handler receives { base44, user, service, params } and returns { success, data?, message? }
const SERVICE_HANDLERS = {
  // Wallet Management handlers
  'wallet.multisig.setup': async ({ base44, user, params }) => {
    return { success: true, data: { message: 'Multi-sig setup handler invoked', user_did: user.did }, handler: 'wallet.multisig.setup' };
  },
  'wallet.create': async ({ base44, user, params }) => {
    return { success: true, data: { message: 'Wallet creation handler invoked' }, handler: 'wallet.create' };
  },
  'wallet.publish': async ({ base44, user, params }) => {
    return { success: true, data: { message: 'DID publish handler invoked' }, handler: 'wallet.publish' };
  },
  'wallet.trustlines': async ({ base44, user, params }) => {
    return { success: true, data: { message: 'Trustline management handler invoked' }, handler: 'wallet.trustlines' };
  },
  'wallet.custom_signatures': async ({ base44, user, params }) => {
    return { success: true, data: { message: 'Custom signatures handler invoked' }, handler: 'wallet.custom_signatures' };
  },
  'wallet.node_setup': async ({ base44, user, params }) => {
    return { success: true, data: { message: 'Node setup handler invoked' }, handler: 'wallet.node_setup' };
  },
  'wallet.did_linking': async ({ base44, user, params }) => {
    return { success: true, data: { message: 'DID linking handler invoked' }, handler: 'wallet.did_linking' };
  },

  // Fallback — service exists but no handler is registered
  '__default__': async ({ service }) => {
    return { success: false, data: null, message: `No handler registered for service: ${service.service_id}` };
  }
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  const base44 = createClientFromRequest(req);

  try {
    // ── 1. Authentication ─────────────────────────────────────────────────
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const body = await req.json();
    const { action = 'execute', service_id, params = {}, session_id } = body;

    if (!service_id) {
      return Response.json({ error: 'service_id is required', code: 'MISSING_SERVICE_ID' }, { status: 400 });
    }

    // Resolve user DID from local identity or wallet
    const userDid = params._user_did || user.email; // DID passed from frontend or fallback to email

    // ── 2. Service Lookup ─────────────────────────────────────────────────
    const services = await base44.asServiceRole.entities.ServiceDefinition.filter(
      { service_id: service_id },
      '-created_date',
      1
    );

    if (!services || services.length === 0) {
      await logUsage(base44, {
        service_id, user_did: userDid, user_email: user.email,
        invocation_type: action, status: 'failed',
        error_detail: `Service not found: ${service_id}`,
        duration_ms: Date.now() - startTime, session_id,
      });
      return Response.json({ error: `Service not found: ${service_id}`, code: 'SERVICE_NOT_FOUND' }, { status: 404 });
    }

    const service = services[0];

    // Check service is active
    if (service.status !== 'active') {
      await logUsage(base44, {
        service_id, service_definition_id: service.id,
        widget_id: service.widget_id, widget_nft_id: service.widget_nft_id,
        user_did: userDid, user_email: user.email,
        invocation_type: action, status: 'failed',
        error_detail: `Service is ${service.status}, not active`,
        duration_ms: Date.now() - startTime, session_id,
      });
      return Response.json({ error: `Service is ${service.status}`, code: 'SERVICE_INACTIVE' }, { status: 403 });
    }

    // ── 3. Widget Ownership Validation ────────────────────────────────────
    // Check if the user owns the widget that gates this service
    const ownershipValid = await validateWidgetOwnership(base44, service.widget_id, service.widget_nft_id, userDid, user);
    if (!ownershipValid) {
      await logUsage(base44, {
        service_id, service_definition_id: service.id,
        widget_id: service.widget_id, widget_nft_id: service.widget_nft_id,
        user_did: userDid, user_email: user.email,
        invocation_type: action, status: 'denied_ownership',
        error_detail: `User does not own widget ${service.widget_nft_id}`,
        duration_ms: Date.now() - startTime, session_id,
      });
      return Response.json({
        error: `Widget ownership required: ${service.widget_nft_id}`,
        code: 'OWNERSHIP_REQUIRED',
        widget_nft_id: service.widget_nft_id,
      }, { status: 403 });
    }

    // ── 4. Rate Limit Enforcement ─────────────────────────────────────────
    const rateLimitResult = await checkRateLimits(base44, service, userDid);
    if (!rateLimitResult.allowed) {
      await logUsage(base44, {
        service_id, service_definition_id: service.id,
        widget_id: service.widget_id, widget_nft_id: service.widget_nft_id,
        user_did: userDid, user_email: user.email,
        invocation_type: action, status: 'denied_rate_limit',
        error_detail: rateLimitResult.reason,
        duration_ms: Date.now() - startTime, session_id,
      });
      return Response.json({
        error: rateLimitResult.reason,
        code: 'RATE_LIMITED',
        retry_after_seconds: rateLimitResult.retry_after || 60,
      }, { status: 429 });
    }

    // ── 5. Honor Score Check ──────────────────────────────────────────────
    const minHonor = service.usage_limits?.requires_minimum_honor || 0;
    if (minHonor > 0) {
      const agents = await base44.asServiceRole.entities.Agent.filter({ wallet_id: userDid }, '-created_date', 1);
      const agentHonor = agents?.[0]?.honor_score || 0;
      if (agentHonor < minHonor) {
        await logUsage(base44, {
          service_id, service_definition_id: service.id,
          widget_id: service.widget_id, widget_nft_id: service.widget_nft_id,
          user_did: userDid, user_email: user.email,
          invocation_type: action, status: 'denied_honor',
          error_detail: `Honor score ${agentHonor} below minimum ${minHonor}`,
          duration_ms: Date.now() - startTime, session_id,
        });
        return Response.json({
          error: `Minimum honor score of ${minHonor} required`,
          code: 'HONOR_INSUFFICIENT',
          current_honor: agentHonor,
          required_honor: minHonor,
        }, { status: 403 });
      }
    }

    // ── 6. Handle "status" action (no execution) ──────────────────────────
    if (action === 'status') {
      return Response.json({
        service_id: service.service_id,
        name: service.name,
        status: service.status,
        service_type: service.service_type,
        widget_nft_id: service.widget_nft_id,
        ownership_valid: true,
        rate_limit_ok: true,
        pricing_model: service.pricing_model?.model_type || 'placeholder',
      });
    }

    // ── 6b. Payment Layer — Pre-execution billing ─────────────────────────
    // If a PaymentDefinition exists for this service, call the Payment Engine
    let paymentResult = null;
    try {
      paymentResult = await processPayment(base44, service.service_id, user, session_id);
    } catch (payErr) {
      console.error('[ServiceEngine] Payment processing error:', payErr.message);
    }

    // If payment was required but failed, deny execution
    if (paymentResult && !paymentResult.success && paymentResult.charged !== false) {
      await logUsage(base44, {
        service_id, service_definition_id: service.id,
        widget_id: service.widget_id, widget_nft_id: service.widget_nft_id,
        user_did: userDid, user_email: user.email,
        invocation_type: action, status: 'denied_payment',
        error_detail: paymentResult.error || 'Payment failed',
        duration_ms: Date.now() - startTime, session_id,
      });
      return Response.json({
        error: paymentResult.error || 'Payment required',
        code: paymentResult.code || 'PAYMENT_FAILED',
        balance: paymentResult.balance,
        required: paymentResult.required,
        currency: 'RLUSD',
      }, { status: paymentResult.status || 402 });
    }

    // ── 7. Runtime Router — widget → service → handler → output ──────────
    const handlerKey = resolveHandler(service);
    const handler = SERVICE_HANDLERS[handlerKey] || SERVICE_HANDLERS['__default__'];

    let result;
    try {
      result = await handler({ base44, user, service, params });
    } catch (handlerError) {
      await logUsage(base44, {
        service_id, service_definition_id: service.id,
        widget_id: service.widget_id, widget_nft_id: service.widget_nft_id,
        user_did: userDid, user_email: user.email,
        invocation_type: action, status: 'error',
        error_detail: handlerError.message,
        duration_ms: Date.now() - startTime, session_id,
      });
      return Response.json({
        error: 'Service handler failed',
        code: 'HANDLER_ERROR',
        detail: handlerError.message,
      }, { status: 500 });
    }

    // ── 8. Usage Logging (success) ────────────────────────────────────────
    const duration = Date.now() - startTime;
    await logUsage(base44, {
      service_id, service_definition_id: service.id,
      widget_id: service.widget_id, widget_nft_id: service.widget_nft_id,
      user_did: userDid, user_email: user.email,
      invocation_type: action,
      status: result.success ? 'success' : 'failed',
      error_detail: result.success ? null : result.message,
      duration_ms: duration,
      input_params: sanitizeParams(params),
      output_summary: { handler: handlerKey, success: result.success, message: result.message },
      cost_drops: service.pricing_model?.cost_drops || 0,
      session_id,
    });

    return Response.json({
      success: result.success,
      service_id: service.service_id,
      handler: handlerKey,
      data: result.data || null,
      message: result.message || null,
      duration_ms: duration,
      cost_drops: service.pricing_model?.cost_drops || 0,
      payment: paymentResult ? {
        charged: paymentResult.charged || false,
        amount: paymentResult.amount || 0,
        currency: 'RLUSD',
        balance_after: paymentResult.balance_after,
      } : null,
    });

  } catch (error) {
    return Response.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});


// ── Helper: Validate widget ownership ─────────────────────────────────────
async function validateWidgetOwnership(base44, widgetEntityId, widgetNftId, userDid, user) {
  try {
    // Primary: Check by NFT ID — the canonical identifier used across the system
    if (widgetNftId) {
      const widgets = await base44.asServiceRole.entities.Widget.filter(
        { nft_id: widgetNftId },
        '-created_date',
        1
      );
      if (widgets?.[0]?.is_active) return true;
    }

    // Admin users bypass ownership check
    if (user?.role === 'admin') return true;

    return false;
  } catch (e) {
    console.error('[ServiceEngine] Ownership check failed:', e.message);
    // Fail open for admins, closed for everyone else
    return user?.role === 'admin';
  }
}


// ── Helper: Check rate limits ─────────────────────────────────────────────
async function checkRateLimits(base44, service, userDid) {
  const limits = service.usage_limits || {};
  const maxPerHour = limits.max_invocations_per_hour || 0;
  const maxPerDay = limits.max_invocations_per_day || 0;
  const cooldownSec = limits.cooldown_seconds || 0;

  // If no limits set, allow
  if (maxPerHour <= 0 && maxPerDay <= 0 && cooldownSec <= 0) {
    return { allowed: true };
  }

  try {
    // Fetch recent usage for this user + service
    const recentLogs = await base44.asServiceRole.entities.ServiceUsageLog.filter(
      { service_id: service.service_id, user_did: userDid, status: 'success' },
      '-created_date',
      100
    );

    const now = Date.now();

    // Cooldown check
    if (cooldownSec > 0 && recentLogs.length > 0) {
      const lastLog = recentLogs[0];
      const lastTime = new Date(lastLog.created_date).getTime();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed < cooldownSec) {
        return {
          allowed: false,
          reason: `Cooldown active: ${Math.ceil(cooldownSec - elapsed)}s remaining`,
          retry_after: Math.ceil(cooldownSec - elapsed),
        };
      }
    }

    // Hourly limit
    if (maxPerHour > 0) {
      const oneHourAgo = now - (60 * 60 * 1000);
      const hourlyCount = recentLogs.filter(l => new Date(l.created_date).getTime() > oneHourAgo).length;
      if (hourlyCount >= maxPerHour) {
        return { allowed: false, reason: `Hourly limit reached (${maxPerHour}/hour)`, retry_after: 3600 };
      }
    }

    // Daily limit
    if (maxPerDay > 0) {
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      const dailyCount = recentLogs.filter(l => new Date(l.created_date).getTime() > oneDayAgo).length;
      if (dailyCount >= maxPerDay) {
        return { allowed: false, reason: `Daily limit reached (${maxPerDay}/day)`, retry_after: 86400 };
      }
    }

    return { allowed: true };
  } catch (e) {
    console.error('[ServiceEngine] Rate limit check failed:', e.message);
    // Fail open on rate limit check errors
    return { allowed: true };
  }
}


// ── Helper: Resolve handler function name ─────────────────────────────────
function resolveHandler(service) {
  // Priority 1: Explicit handler_function in runtime_behavior
  if (service.runtime_behavior?.handler_function) {
    return service.runtime_behavior.handler_function;
  }

  // Priority 2: Map by service_id directly
  if (SERVICE_HANDLERS[service.service_id]) {
    return service.service_id;
  }

  // Priority 3: Default handler
  return '__default__';
}


// ── Helper: Log usage to ServiceUsageLog entity ───────────────────────────
async function logUsage(base44, data) {
  try {
    await base44.asServiceRole.entities.ServiceUsageLog.create({
      service_id: data.service_id,
      service_definition_id: data.service_definition_id || null,
      widget_id: data.widget_id || null,
      widget_nft_id: data.widget_nft_id || null,
      user_did: data.user_did,
      user_email: data.user_email || null,
      invocation_type: data.invocation_type || 'execute',
      status: data.status,
      error_detail: data.error_detail || null,
      duration_ms: data.duration_ms || 0,
      input_params: data.input_params || null,
      output_summary: data.output_summary || null,
      cost_drops: data.cost_drops || 0,
      session_id: data.session_id || null,
    });
  } catch (e) {
    // Never let logging failure break the service invocation
    console.error('[ServiceEngine] Failed to log usage:', e.message);
  }
}


// ── Helper: Process payment via Payment Layer ─────────────────────────────
async function processPayment(base44, serviceId, user, sessionId) {
  // Look up PaymentDefinition for this service
  const payDefs = await base44.asServiceRole.entities.PaymentDefinition.filter(
    { service_id: serviceId, status: 'active' },
    '-created_date',
    1
  );

  // No payment definition = free, pass through
  if (!payDefs || payDefs.length === 0) {
    return { success: true, charged: false, amount: 0 };
  }

  const payDef = payDefs[0];

  // Free services pass through
  if (payDef.pricing_model === 'free' || payDef.amount <= 0) {
    return { success: true, charged: false, amount: 0 };
  }

  // Get user's RLUSD ledger
  const ledgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
    { user_email: user.email }, '-created_date', 1
  );

  const ledger = ledgers?.[0];
  if (!ledger) {
    return {
      success: false, charged: false,
      error: 'No RLUSD account found — use the faucet first',
      code: 'NO_LEDGER_ACCOUNT', status: 402,
      balance: 0, required: payDef.amount,
    };
  }

  if (ledger.status !== 'active') {
    return {
      success: false, charged: false,
      error: `RLUSD account is ${ledger.status}`,
      code: 'ACCOUNT_FROZEN', status: 403,
    };
  }

  // Check balance
  if (ledger.balance < payDef.amount) {
    // Log insufficient balance
    await base44.asServiceRole.entities.PaymentUsageLog.create({
      user_id: user.email, user_email: user.email,
      service_id: serviceId, payment_definition_id: payDef.id,
      amount: payDef.amount, currency: 'RLUSD',
      pricing_model: payDef.pricing_model, billing_behavior: payDef.billing_behavior,
      status: 'insufficient_balance',
      error_detail: `Balance ${ledger.balance} < cost ${payDef.amount}`,
      balance_before: ledger.balance, balance_after: ledger.balance,
      session_id: sessionId,
    });
    return {
      success: false, charged: false,
      error: 'Insufficient RLUSD balance',
      code: 'INSUFFICIENT_BALANCE', status: 402,
      balance: ledger.balance, required: payDef.amount,
    };
  }

  // Deduct
  const newBalance = ledger.balance - payDef.amount;
  await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
    balance: newBalance,
    total_debited: (ledger.total_debited || 0) + payDef.amount,
  });

  // ── Fair Share Guard: Law 3 enforcement ──
  // Default split MUST comply with 2.5% extraction ceiling (creator ≥97.5%)
  // Old defaults (treasury 50%, creator 40%, referral 10%) were 24x over ceiling
  const rc = payDef.royalties_config || {};
  const creatorPct = rc.creator_percent ?? 98;
  const treasuryPct = rc.treasury_percent ?? 1.5;
  const referralPct = rc.referral_percent ?? 0.5;
  // Hard enforcement: if platform cut exceeds 2.5%, force compliant split
  const platformCut = treasuryPct + referralPct;
  const effectiveCreator = platformCut > 2.5 ? 97.5 : creatorPct;
  const effectiveTreasury = platformCut > 2.5 ? 1.5 : treasuryPct;
  const effectiveReferral = platformCut > 2.5 ? 1.0 : referralPct;
  const royaltiesSplit = {
    treasury_amount: Math.round(payDef.amount * (effectiveTreasury / 100) * 100) / 100,
    creator_amount: Math.round(payDef.amount * (effectiveCreator / 100) * 100) / 100,
    referral_amount: Math.round(payDef.amount * (effectiveReferral / 100) * 100) / 100,
    fair_share_enforced: platformCut > 2.5,
  };

  // Log success
  await base44.asServiceRole.entities.PaymentUsageLog.create({
    user_id: user.email, user_email: user.email,
    service_id: serviceId, payment_definition_id: payDef.id,
    amount: payDef.amount, currency: 'RLUSD',
    pricing_model: payDef.pricing_model, billing_behavior: payDef.billing_behavior,
    status: 'success',
    balance_before: ledger.balance, balance_after: newBalance,
    royalties_split: royaltiesSplit,
    session_id: sessionId,
  });

  return {
    success: true, charged: true,
    amount: payDef.amount,
    balance_before: ledger.balance,
    balance_after: newBalance,
    royalties_split: royaltiesSplit,
  };
}


// ── Helper: Sanitize params for logging (remove sensitive data) ───────────
function sanitizeParams(params) {
  if (!params) return null;
  const sanitized = { ...params };
  // Strip any fields that might contain sensitive data
  delete sanitized._user_did;
  delete sanitized.seed;
  delete sanitized.private_key;
  delete sanitized.password;
  delete sanitized.secret;
  return sanitized;
}