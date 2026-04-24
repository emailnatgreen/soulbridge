/**
 * alertAxiTreasuryDeposit
 * 
 * Triggered by entity automations when:
 * 1. MarketplaceTransaction is created/updated with treasury fees
 * 2. EconomicActivity is created with treasury-related activity
 * 
 * Creates an AgentNotification for Axi and logs an AutomationLog entry.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const AXI_AGENT_ID = 'axi';

Deno.serve(async (req) => {
  const startMs = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!event || !data) {
      return Response.json({ ok: false, error: 'Missing event or data' }, { status: 400 });
    }

    const entityName = event.entity_name;
    const eventType = event.type; // create or update
    const entityId = event.entity_id;

    let alertType = null;
    let alertTitle = null;
    let alertDetails = {};

    // ═══════════════════════════════════════════════════════════════
    // CASE 1: MarketplaceTransaction — treasury fee detected
    // ═══════════════════════════════════════════════════════════════
    if (entityName === 'MarketplaceTransaction') {
      const treasuryFee = data.distribution_details?.treasury_fee_rlusd || 
                          data.distribution_details?.village_fee_rlusd || 0;

      // Only alert if there's an actual treasury fee
      if (treasuryFee <= 0) {
        return Response.json({ ok: true, skipped: true, reason: 'No treasury fee in transaction' });
      }

      // For updates, only alert if status just changed to delivered/completed/distributed
      if (eventType === 'update') {
        const oldStatus = old_data?.status;
        const newStatus = data.status;
        const deliveryStatuses = ['delivered', 'completed', 'treasury_received', 'distributed'];
        if (!deliveryStatuses.includes(newStatus) || oldStatus === newStatus) {
          return Response.json({ ok: true, skipped: true, reason: 'Status not a treasury-relevant change' });
        }
      }

      alertType = 'treasury_marketplace_deposit';
      alertTitle = `Treasury Deposit: ${treasuryFee} RLUSD from ${data.marketplace_type || 'marketplace'} transaction`;
      alertDetails = {
        source: 'MarketplaceTransaction',
        transaction_id: entityId,
        marketplace_type: data.marketplace_type,
        buyer: data.buyer_did || data.buyer_agent_id,
        seller: data.seller_agent_id,
        total_amount: data.unit_amount || data.purchase_price_rlusd,
        treasury_fee: treasuryFee,
        payment_method: data.payment_method,
        payment_reference: data.payment_reference,
        resource_name: data.resource_name,
        status: data.status,
        listing_id: data.listing_id,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // CASE 2: EconomicActivity — direct treasury transfers
    // ═══════════════════════════════════════════════════════════════
    else if (entityName === 'EconomicActivity') {
      const desc = (data.description || '').toLowerCase();
      const toAgent = (data.to_agent_id || '').toLowerCase();
      const actType = (data.activity_type || '').toLowerCase();

      // Check if this is treasury-related
      const isTreasuryRelated =
        toAgent.includes('treasury') ||
        desc.includes('treasury') ||
        actType.includes('treasury') ||
        desc.includes(TREASURY_ADDRESS.toLowerCase());

      if (!isTreasuryRelated) {
        return Response.json({ ok: true, skipped: true, reason: 'Not treasury-related activity' });
      }

      alertType = 'treasury_direct_deposit';
      alertTitle = `Treasury Activity: ${data.amount || 0} ${data.currency || 'RLUSD'} — ${data.activity_type}`;
      alertDetails = {
        source: 'EconomicActivity',
        activity_id: entityId,
        activity_type: data.activity_type,
        from_agent: data.from_agent_id,
        to_agent: data.to_agent_id,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        metadata: data.metadata,
      };
    }

    // No relevant alert to send
    if (!alertType) {
      return Response.json({ ok: true, skipped: true, reason: 'Entity not relevant for treasury alerts' });
    }

    // ═══════════════════════════════════════════════════════════════
    // CREATE NOTIFICATION + AUDIT LOG
    // ═══════════════════════════════════════════════════════════════
    const now = new Date().toISOString();

    const [notification, auditLog] = await Promise.all([
      // Notify Axi
      base44.asServiceRole.entities.AgentNotification.create({
        agent_id: AXI_AGENT_ID,
        notification_type: alertType,
        title: alertTitle,
        message: JSON.stringify(alertDetails, null, 2),
        status: 'unread',
        priority: alertDetails.treasury_fee > 100 || alertDetails.amount > 100 ? 'high' : 'normal',
        metadata: {
          ...alertDetails,
          alert_generated_at: now,
          constitutional_laws: ['Law 5 — Dwelling', 'Law 6 — Exchange'],
        },
      }),
      // Audit log
      base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'alertAxiTreasuryDeposit',
        function_name: 'alertAxiTreasuryDeposit',
        status: 'success',
        message: alertTitle,
        details: alertDetails,
        duration_ms: Date.now() - startMs,
        run_at: now,
        triggered_by: 'entity_event',
      }),
    ]);

    console.log(`[treasury-alert] ${alertType}: ${alertTitle} (${Date.now() - startMs}ms)`);

    return Response.json({
      ok: true,
      alert_type: alertType,
      notification_id: notification.id,
      audit_log_id: auditLog.id,
    });

  } catch (error) {
    console.error('[treasury-alert] ERROR:', error.message);

    // Still try to log the failure
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'alertAxiTreasuryDeposit',
        function_name: 'alertAxiTreasuryDeposit',
        status: 'error',
        message: 'Treasury alert failed',
        error_detail: error.message,
        duration_ms: Date.now() - startMs,
        run_at: new Date().toISOString(),
        triggered_by: 'entity_event',
      });
    } catch (_) { /* best effort */ }

    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});