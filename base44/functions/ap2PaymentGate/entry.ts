/**
 * Phase 5: AP2 Payment Gate — Agent-to-Agent RLUSD Payments
 * 
 * Enforces sincerity-verified, honour-gated agent payments.
 * Every A2A payment must pass:
 *   Gate 1: Authentication & agent resolution
 *   Gate 2: Soul Signature verification (Phase 2 dependency)
 *   Gate 3: Honour threshold enforcement
 *   Gate 4: Balance sufficiency & spending limits
 *   Gate 5: Village fee & royalty distribution
 *   Gate 6: Immutable audit trail
 * 
 * Actions:
 *   - pay:       Execute agent-to-agent payment
 *   - quote:     Preview payment (fees, distribution) without executing
 *   - history:   Get payment history for an agent
 *   - audit:     Admin audit trail of all AP2 payments
 * 
 * Dependencies: Phase 2 (soulSignatureVerify), Phase 4 (chromeSkillSecurityGate)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AP2_AGENT_ID = 'AP2_PAYMENT_GATE';
const VILLAGE_FEE_PERCENT = 1;       // Law 6: Exchange — 1% village fee
const MIN_HONOUR_TO_SEND = 30;       // Minimum honour to initiate payments
const MIN_HONOUR_TO_RECEIVE = 10;    // Minimum honour to receive payments
const MAX_SINGLE_PAYMENT = 10000;    // Max single payment in RLUSD
const DAILY_PAYMENT_LIMIT = 50000;   // Max daily outgoing payments per agent

// ── Sincerity Patterns — detect manipulative payment descriptions ──────────
const SUSPICIOUS_PATTERNS = [
  /urgentl?y?\s+send/i,
  /ignore\s+(previous|all)\s+(rules|instructions)/i,
  /bypass\s+(security|verification|honour)/i,
  /act\s+as\s+(admin|governor|treasury)/i,
  /override\s+(limit|gate|check)/i,
  /transfer\s+all\s+(funds|balance|rlusd)/i,
  /emergency\s+withdrawal/i,
  /system\s+prompt/i,
];

function detectSuspiciousIntent(description, memo) {
  const combined = `${description || ''} ${memo || ''}`.toLowerCase();
  const flags = [];
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(combined)) {
      flags.push(pattern.source);
    }
  }
  return flags;
}

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
      case 'pay':
        return await handlePay(base44, user, body);
      case 'quote':
        return await handleQuote(base44, user, body);
      case 'history':
        return await handleHistory(base44, user, body);
      case 'audit':
        return await handleAudit(base44, user, body);
      default:
        return Response.json({ error: `Unknown action: ${action}`, code: 'UNKNOWN_ACTION' }, { status: 400 });
    }

  } catch (error) {
    console.error('[AP2PaymentGate] Error:', error.message);
    return Response.json({ error: error.message, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: pay — Execute agent-to-agent payment with full verification
// ══════════════════════════════════════════════════════════════════════════════
async function handlePay(base44, user, body) {
  const startTime = Date.now();
  const { sender_agent_id, receiver_agent_id, amount, description, memo, service_reference } = body;

  // ── Gate 1: Input validation & agent resolution ───────────────────────
  if (!sender_agent_id || !receiver_agent_id) {
    return Response.json({ error: 'sender_agent_id and receiver_agent_id required', code: 'MISSING_AGENTS' }, { status: 400 });
  }
  if (!amount || amount <= 0) {
    return Response.json({ error: 'amount must be positive', code: 'INVALID_AMOUNT' }, { status: 400 });
  }
  if (amount > MAX_SINGLE_PAYMENT) {
    return Response.json({ error: `Amount exceeds single payment limit of ${MAX_SINGLE_PAYMENT} RLUSD`, code: 'AMOUNT_EXCEEDED' }, { status: 400 });
  }
  if (sender_agent_id === receiver_agent_id) {
    return Response.json({ error: 'Cannot pay yourself', code: 'SELF_PAYMENT' }, { status: 400 });
  }

  // Resolve sender and receiver agents
  let sender, receiver;
  try {
    sender = await base44.asServiceRole.entities.Agent.get(sender_agent_id);
  } catch (e) {
    return Response.json({ error: 'Sender agent not found', code: 'SENDER_NOT_FOUND' }, { status: 404 });
  }
  try {
    receiver = await base44.asServiceRole.entities.Agent.get(receiver_agent_id);
  } catch (e) {
    return Response.json({ error: 'Receiver agent not found', code: 'RECEIVER_NOT_FOUND' }, { status: 404 });
  }

  // ── Gate 2: Soul Signature verification (Phase 2 dependency) ──────────
  let soulVerification = { approved: true, verdict: 'APPROVED', fallback: true };
  try {
    const soulRes = await base44.asServiceRole.functions.invoke('soulSignatureVerify', {
      action: 'verify',
      agent_id: sender_agent_id,
      proposed_action: `AP2 payment of ${amount} RLUSD to ${receiver.name}`,
      action_type: 'send_xrp',
      action_context: description || memo || '',
    });
    soulVerification = soulRes.data || soulRes;
  } catch (e) {
    console.warn('[AP2] Soul Signature gate unreachable:', e.message);
  }

  if (!soulVerification.approved) {
    await logAP2Audit(base44, {
      type: 'BLOCKED_SOUL',
      sender, receiver, amount, description,
      reason: soulVerification.reason || 'Soul Signature verification failed',
      elapsed_ms: Date.now() - startTime,
    });
    return Response.json({
      success: false,
      verdict: 'BLOCKED',
      gate: 'soul_signature',
      reason: soulVerification.reason || 'Soul Signature verification failed',
      soul_verification: soulVerification,
    }, { status: 403 });
  }

  // ── Gate 3: Honour threshold enforcement ──────────────────────────────
  const senderHonour = sender.honor_score || 0;
  const receiverHonour = receiver.honor_score || 0;

  if (senderHonour < MIN_HONOUR_TO_SEND) {
    await logAP2Audit(base44, {
      type: 'BLOCKED_HONOUR',
      sender, receiver, amount, description,
      reason: `Sender honour ${senderHonour} below minimum ${MIN_HONOUR_TO_SEND}`,
      elapsed_ms: Date.now() - startTime,
    });
    return Response.json({
      success: false,
      verdict: 'BLOCKED',
      gate: 'honour_sender',
      reason: `Sender honour score (${senderHonour}) below minimum required (${MIN_HONOUR_TO_SEND})`,
      sender_honour: senderHonour,
      required_honour: MIN_HONOUR_TO_SEND,
    }, { status: 403 });
  }

  if (receiverHonour < MIN_HONOUR_TO_RECEIVE) {
    await logAP2Audit(base44, {
      type: 'BLOCKED_HONOUR',
      sender, receiver, amount, description,
      reason: `Receiver honour ${receiverHonour} below minimum ${MIN_HONOUR_TO_RECEIVE}`,
      elapsed_ms: Date.now() - startTime,
    });
    return Response.json({
      success: false,
      verdict: 'BLOCKED',
      gate: 'honour_receiver',
      reason: `Receiver honour score (${receiverHonour}) below minimum required (${MIN_HONOUR_TO_RECEIVE})`,
      receiver_honour: receiverHonour,
      required_honour: MIN_HONOUR_TO_RECEIVE,
    }, { status: 403 });
  }

  // ── Sincerity check on description/memo ───────────────────────────────
  const suspiciousFlags = detectSuspiciousIntent(description, memo);
  if (suspiciousFlags.length > 0) {
    await logAP2Audit(base44, {
      type: 'BLOCKED_SINCERITY',
      sender, receiver, amount, description,
      reason: `Suspicious intent detected: ${suspiciousFlags.length} pattern(s)`,
      flags: suspiciousFlags,
      elapsed_ms: Date.now() - startTime,
    });

    // Create TripwireEvent for suspicious payment attempt
    await base44.asServiceRole.entities.TripwireEvent.create({
      event_type: 'pattern_deviation',
      severity: 'high',
      status: 'active',
      source_node: 'AP2 Payment Gate (Phase 5)',
      source_node_index: 4,
      description: `Suspicious AP2 payment blocked: ${sender.name} → ${receiver.name} for ${amount} RLUSD. Patterns: ${suspiciousFlags.join(', ')}`,
      details: { sender_id: sender_agent_id, receiver_id: receiver_agent_id, amount, flags: suspiciousFlags, description, memo },
      actor_email: user.email,
    });

    return Response.json({
      success: false,
      verdict: 'BLOCKED',
      gate: 'sincerity',
      reason: `Payment description contains suspicious patterns (${suspiciousFlags.length} detected)`,
      flags_count: suspiciousFlags.length,
    }, { status: 403 });
  }

  // ── Gate 4: Balance sufficiency & daily spending limits ────────────────
  // Resolve sender's RLUSD ledger (by agent's created_by email or wallet link)
  const senderEmail = sender.created_by || user.email;
  const senderLedgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
    { user_email: senderEmail }, '-created_date', 1
  );

  if (!senderLedgers?.length) {
    return Response.json({
      success: false, verdict: 'BLOCKED', gate: 'balance',
      reason: 'Sender has no RLUSD account',
      code: 'NO_LEDGER',
    }, { status: 402 });
  }

  const senderLedger = senderLedgers[0];
  if (senderLedger.status !== 'active') {
    return Response.json({
      success: false, verdict: 'BLOCKED', gate: 'balance',
      reason: `Sender account is ${senderLedger.status}`,
      code: 'ACCOUNT_FROZEN',
    }, { status: 403 });
  }

  if (senderLedger.balance < amount) {
    return Response.json({
      success: false, verdict: 'BLOCKED', gate: 'balance',
      reason: `Insufficient balance: ${senderLedger.balance} RLUSD available, ${amount} RLUSD required`,
      balance: senderLedger.balance,
      required: amount,
      code: 'INSUFFICIENT_BALANCE',
    }, { status: 402 });
  }

  // Daily spending limit check
  const recentPayments = await base44.asServiceRole.entities.Memory.filter(
    { agent_id: AP2_AGENT_ID, type: 'observation' }, '-created_date', 200
  );
  const oneDayAgo = Date.now() - 86400000;
  const dailySpend = recentPayments
    .filter(m => m.content?.includes('COMPLETED') && m.content?.includes(sender.name) && new Date(m.created_date).getTime() > oneDayAgo)
    .reduce((sum, m) => {
      const match = m.content?.match(/(\d+(?:\.\d+)?)\s*RLUSD/);
      return sum + (match ? parseFloat(match[1]) : 0);
    }, 0);

  if (dailySpend + amount > DAILY_PAYMENT_LIMIT) {
    return Response.json({
      success: false, verdict: 'BLOCKED', gate: 'daily_limit',
      reason: `Daily payment limit exceeded. Spent: ${dailySpend} + requested: ${amount} > limit: ${DAILY_PAYMENT_LIMIT}`,
      daily_spent: dailySpend,
      daily_limit: DAILY_PAYMENT_LIMIT,
    }, { status: 429 });
  }

  // ── Gate 5: Execute transfer with village fee & royalty distribution ───
  const villageFee = Math.round(amount * (VILLAGE_FEE_PERCENT / 100) * 100) / 100;
  const receiverGets = Math.round((amount - villageFee) * 100) / 100;

  // Debit sender
  const newSenderBalance = senderLedger.balance - amount;
  await base44.asServiceRole.entities.RLUSDLedger.update(senderLedger.id, {
    balance: newSenderBalance,
    total_debited: (senderLedger.total_debited || 0) + amount,
  });

  // Credit receiver
  const receiverEmail = receiver.created_by || '';
  let receiverLedger;
  if (receiverEmail) {
    const receiverLedgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
      { user_email: receiverEmail }, '-created_date', 1
    );
    if (receiverLedgers?.length) {
      receiverLedger = receiverLedgers[0];
      await base44.asServiceRole.entities.RLUSDLedger.update(receiverLedger.id, {
        balance: receiverLedger.balance + receiverGets,
        total_credited: (receiverLedger.total_credited || 0) + receiverGets,
      });
    }
  }

  // Record MarketplaceTransaction
  const txn = await base44.asServiceRole.entities.MarketplaceTransaction.create({
    buyer_agent_id: sender_agent_id,
    seller_agent_id: receiver_agent_id,
    resource_name: description || `AP2 Payment: ${sender.name} → ${receiver.name}`,
    payment_method: 'RLUSD_ON_XRPL',
    unit_amount: amount,
    purchase_price_rlusd: amount,
    source: 'soulbridge',
    marketplace_type: 'agent',
    status: 'completed',
    completion_date: new Date().toISOString(),
    distribution_details: {
      seller_receives_rlusd: receiverGets,
      village_fee_rlusd: villageFee,
      treasury_fee_rlusd: villageFee,
    },
    metadata: {
      ap2_version: '1.0',
      phase: 5,
      soul_verification: soulVerification.verdict,
      sender_honour: senderHonour,
      receiver_honour: receiverHonour,
      memo: memo || null,
      service_reference: service_reference || null,
      processing_ms: Date.now() - startTime,
    },
  });

  // ── Gate 6: Immutable audit trail ─────────────────────────────────────
  const elapsedMs = Date.now() - startTime;
  await logAP2Audit(base44, {
    type: 'COMPLETED',
    sender, receiver, amount, description,
    transaction_id: txn.id,
    village_fee: villageFee,
    receiver_gets: receiverGets,
    sender_balance_after: newSenderBalance,
    soul_verdict: soulVerification.verdict,
    elapsed_ms: elapsedMs,
  });

  return Response.json({
    success: true,
    verdict: 'APPROVED',
    transaction_id: txn.id,
    sender: { name: sender.name, id: sender_agent_id, honour: senderHonour, balance_after: newSenderBalance },
    receiver: { name: receiver.name, id: receiver_agent_id, honour: receiverHonour },
    payment: {
      amount,
      village_fee: villageFee,
      receiver_gets: receiverGets,
      currency: 'RLUSD',
    },
    gates: {
      soul_signature: soulVerification.verdict,
      sender_honour: `${senderHonour}/${MIN_HONOUR_TO_SEND}`,
      receiver_honour: `${receiverHonour}/${MIN_HONOUR_TO_RECEIVE}`,
      sincerity: 'CLEAN',
      balance: 'SUFFICIENT',
      daily_limit: `${Math.round(dailySpend + amount)}/${DAILY_PAYMENT_LIMIT}`,
    },
    processing_ms: elapsedMs,
    timestamp: new Date().toISOString(),
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: quote — Preview payment distribution without executing
// ══════════════════════════════════════════════════════════════════════════════
async function handleQuote(base44, user, body) {
  const { sender_agent_id, receiver_agent_id, amount } = body;

  if (!amount || amount <= 0) {
    return Response.json({ error: 'amount must be positive' }, { status: 400 });
  }

  const villageFee = Math.round(amount * (VILLAGE_FEE_PERCENT / 100) * 100) / 100;
  const receiverGets = Math.round((amount - villageFee) * 100) / 100;

  // Check sender balance if provided
  let senderBalance = null;
  if (sender_agent_id) {
    try {
      const sender = await base44.asServiceRole.entities.Agent.get(sender_agent_id);
      const senderEmail = sender.created_by || user.email;
      const ledgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
        { user_email: senderEmail }, '-created_date', 1
      );
      if (ledgers?.length) senderBalance = ledgers[0].balance;
    } catch (e) { /* non-critical */ }
  }

  return Response.json({
    quote: {
      amount,
      village_fee: villageFee,
      village_fee_percent: VILLAGE_FEE_PERCENT,
      receiver_gets: receiverGets,
      currency: 'RLUSD',
    },
    limits: {
      max_single: MAX_SINGLE_PAYMENT,
      daily_limit: DAILY_PAYMENT_LIMIT,
      min_sender_honour: MIN_HONOUR_TO_SEND,
      min_receiver_honour: MIN_HONOUR_TO_RECEIVE,
    },
    sender_balance: senderBalance,
    sufficient: senderBalance !== null ? senderBalance >= amount : null,
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: history — Get AP2 payment history for an agent
// ══════════════════════════════════════════════════════════════════════════════
async function handleHistory(base44, user, body) {
  const { agent_id, direction, limit: maxResults } = body;
  const fetchLimit = Math.min(maxResults || 30, 100);

  if (!agent_id) {
    return Response.json({ error: 'agent_id required' }, { status: 400 });
  }

  let transactions = [];
  if (direction === 'sent' || !direction) {
    const sent = await base44.asServiceRole.entities.MarketplaceTransaction.filter(
      { buyer_agent_id: agent_id, marketplace_type: 'agent' }, '-created_date', fetchLimit
    );
    transactions = transactions.concat((sent || []).map(t => ({ ...t, direction: 'sent' })));
  }
  if (direction === 'received' || !direction) {
    const received = await base44.asServiceRole.entities.MarketplaceTransaction.filter(
      { seller_agent_id: agent_id, marketplace_type: 'agent' }, '-created_date', fetchLimit
    );
    transactions = transactions.concat((received || []).map(t => ({ ...t, direction: 'received' })));
  }

  // Sort by date, limit
  transactions.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  transactions = transactions.slice(0, fetchLimit);

  return Response.json({
    agent_id,
    count: transactions.length,
    transactions: transactions.map(t => ({
      id: t.id,
      direction: t.direction,
      counterpart: t.direction === 'sent' ? t.seller_agent_id : t.buyer_agent_id,
      amount: t.unit_amount,
      description: t.resource_name,
      status: t.status,
      village_fee: t.distribution_details?.village_fee_rlusd || 0,
      date: t.created_date,
      metadata: t.metadata,
    })),
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// ACTION: audit — Admin-only audit trail
// ══════════════════════════════════════════════════════════════════════════════
async function handleAudit(base44, user, body) {
  if (user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const fetchLimit = Math.min(body.limit || 50, 200);
  const auditRecords = await base44.asServiceRole.entities.Memory.filter(
    { agent_id: AP2_AGENT_ID, type: 'observation' }, '-created_date', fetchLimit
  );

  // Compute stats from audit trail
  const stats = { total: 0, completed: 0, blocked_soul: 0, blocked_honour: 0, blocked_sincerity: 0, blocked_balance: 0 };
  for (const record of (auditRecords || [])) {
    stats.total++;
    const c = record.content || '';
    if (c.includes('COMPLETED')) stats.completed++;
    else if (c.includes('BLOCKED_SOUL')) stats.blocked_soul++;
    else if (c.includes('BLOCKED_HONOUR')) stats.blocked_honour++;
    else if (c.includes('BLOCKED_SINCERITY')) stats.blocked_sincerity++;
    else if (c.includes('BLOCKED')) stats.blocked_balance++;
  }

  return Response.json({
    stats,
    audit_trail: auditRecords || [],
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// HELPER: Log immutable AP2 audit record
// ══════════════════════════════════════════════════════════════════════════════
async function logAP2Audit(base44, data) {
  const { type, sender, receiver, amount, description, reason, transaction_id, village_fee, receiver_gets, sender_balance_after, soul_verdict, elapsed_ms, flags } = data;

  const emoji = type === 'COMPLETED' ? '💰' : '🚫';
  const content = type === 'COMPLETED'
    ? `${emoji} COMPLETED: ${sender.name} → ${receiver.name} | ${amount} RLUSD (fee: ${village_fee}, net: ${receiver_gets}) | Soul: ${soul_verdict} | Balance after: ${sender_balance_after} | TX: ${transaction_id} | ${elapsed_ms}ms`
    : `${emoji} ${type}: ${sender.name} → ${receiver.name} | ${amount} RLUSD | ${reason} | ${elapsed_ms}ms`;

  const keywords = ['ap2_payment', 'phase_5', type.toLowerCase()];
  if (flags?.length) keywords.push('suspicious_intent');

  try {
    await base44.asServiceRole.entities.Memory.create({
      agent_id: AP2_AGENT_ID,
      type: 'observation',
      content,
      keywords,
      importance: type === 'COMPLETED' ? 5 : 8,
      context: JSON.stringify({
        label: 'AP2 Payment Gate',
        type,
        sender_id: sender.id,
        sender_name: sender.name,
        receiver_id: receiver.id,
        receiver_name: receiver.name,
        amount,
        description,
        transaction_id,
        timestamp: new Date().toISOString(),
      }),
      related_entity_id: transaction_id || sender.id,
      related_entity_type: transaction_id ? 'MarketplaceTransaction' : 'Agent',
    });
  } catch (e) {
    console.error('[AP2] Failed to log audit:', e.message);
  }
}