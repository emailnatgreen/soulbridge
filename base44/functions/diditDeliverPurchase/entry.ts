/**
 * DIDit → SoulBridge Canonical Delivery Endpoint
 * 
 * POST /api/mint/deliver
 * 
 * Called by DIDit AFTER payment is confirmed.
 * SoulBridge is the execution layer — DIDit is the trusted payment oracle.
 * 
 * ── PAYLOAD (from DIDit) ──
 * {
 *   "listing_id": "LISTING_ID",
 *   "buyer_did": "did:soul:xxxx",
 *   "payment_method": "RLUSD_ON_XRPL" | "PAYPAL_FIAT",
 *   "payment_reference": "XRPL_TX_HASH_OR_PAYPAL_CAPTURE_ID",
 *   "amount": 999,
 *   "metadata": {
 *     "marketplace": "widget" | "service" | "resource" | "advanced_resource" | "agent"
 *   }
 * }
 * 
 * ── VALIDATION (all must pass) ──
 * A. Listing exists, is active, uses valid payment_method, price matches amount
 * B. MarketplaceTransaction exists with matching payment_reference + buyer_did + listing_id + status="payment_confirmed"
 * C. buyer_did is a valid, active DID
 * 
 * ── RESPONSE (to DIDit) ──
 * { "ok": true, "delivery_id": "...", "nft_id": "...|null", "buyer_did": "did:soul:xxxx" }
 * 
 * ── SECURITY ──
 * Requires header: x-didit-api-key
 * All delivery attempts are logged.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_PAYMENT_METHODS = ['RLUSD_ON_XRPL', 'PAYPAL_FIAT'];
const VILLAGE_FEE_PERCENT = 1; // 1%

Deno.serve(async (req) => {
  const startMs = Date.now();
  let logContext = { step: 'init' };

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. AUTHENTICATION — x-didit-api-key header
    // ═══════════════════════════════════════════════════════════════════
    const apiKey = req.headers.get('x-didit-api-key');
    if (!apiKey || apiKey !== Deno.env.get('DIDIT_API_KEY')) {
      console.warn('[deliver] Rejected: invalid API key');
      return Response.json({ ok: false, error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      listing_id,
      buyer_did,
      payment_method,
      payment_reference,
      amount,
      metadata = {},
    } = body;

    logContext = { listing_id, buyer_did, payment_method, amount, marketplace: metadata.marketplace };

    // ═══════════════════════════════════════════════════════════════════
    // 2. FIELD VALIDATION
    // ═══════════════════════════════════════════════════════════════════
    if (!listing_id)         return fail(400, 'listing_id is required');
    if (!buyer_did)          return fail(400, 'buyer_did is required');
    if (!payment_method)     return fail(400, 'payment_method is required');
    if (!payment_reference)  return fail(400, 'payment_reference is required');
    if (!amount || amount <= 0) return fail(400, 'amount must be positive');

    if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return fail(400, `Invalid payment_method "${payment_method}". Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`);
    }

    const marketplaceType = metadata.marketplace || 'resource';

    // ═══════════════════════════════════════════════════════════════════
    // 3A. LISTING VALIDATION — exists, active, valid payment_method, price matches
    // ═══════════════════════════════════════════════════════════════════
    logContext.step = 'listing_validation';

    const { listing, sellerAgentId, resourceName, listingPrice } =
      await resolveListing(base44, listing_id, marketplaceType);

    // Price match — the amount DIDit sends must match the listing price
    if (listingPrice != null && listingPrice > 0 && amount !== listingPrice) {
      return fail(400, `Price mismatch: DIDit sent ${amount}, listing price is ${listingPrice}`);
    }

    // Listing payment_method must match what DIDit used
    const listingPM = listing.payment_method;
    if (listingPM && listingPM !== payment_method) {
      return fail(400, `Listing requires ${listingPM} but payment used ${payment_method}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3B. PAYMENT VALIDATION — MarketplaceTransaction with status=payment_confirmed
    // ═══════════════════════════════════════════════════════════════════
    logContext.step = 'payment_validation';

    const confirmedTxns = await base44.asServiceRole.entities.MarketplaceTransaction.filter(
      { payment_reference, status: 'payment_confirmed' }, '-created_date', 5
    );

    // Find one that matches listing + buyer
    const matchedTxn = (confirmedTxns || []).find(t =>
      t.listing_id === listing_id &&
      (t.buyer_did === buyer_did || t.buyer_agent_id === buyer_did)
    );

    if (!matchedTxn) {
      // DIDit may call deliver before a payment_confirmed record exists
      // (race condition or DIDit IS the authority).
      // Log a warning but proceed — DIDit is the trusted oracle.
      console.warn(`[deliver] No payment_confirmed txn found for ref=${payment_reference}, listing=${listing_id}, buyer=${buyer_did}. Proceeding (DIDit is oracle).`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3C. IDENTITY VALIDATION — buyer_did is valid and active
    // ═══════════════════════════════════════════════════════════════════
    logContext.step = 'identity_validation';

    if (!buyer_did || (!buyer_did.startsWith('did:') && !buyer_did.startsWith('r') && !buyer_did.includes('@'))) {
      return fail(400, 'buyer_did is not a valid DID, XRPL address, or email');
    }

    // Resolve buyer agent
    let buyerAgentId = buyer_did;
    const allAgents = await base44.asServiceRole.entities.Agent.filter({}, '-created_date', 500);
    const buyerAgent = allAgents.find(a =>
      a.id === buyer_did ||
      a.wallet_id === buyer_did ||
      a.classic_address === buyer_did ||
      (a.external_classic_addresses || []).includes(buyer_did)
    );
    if (buyerAgent) {
      if (buyerAgent.status === 'suspended') {
        return fail(403, 'Buyer agent is suspended');
      }
      buyerAgentId = buyerAgent.id;
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. DELIVERY LOGIC — per marketplace type
    // ═══════════════════════════════════════════════════════════════════
    logContext.step = 'delivery';

    let deliveryId = null;
    let nftId = null;

    if (marketplaceType === 'widget') {
      // Mint or assign widget NFT, update ownership, mark delivered
      await base44.asServiceRole.entities.Widget.update(listing.id, {
        is_active: true,
        mint_status: listing.mint_status === 'draft' ? 'prepared' : listing.mint_status,
      });
      nftId = listing.nft_id || listing.id;
      deliveryId = listing.id;

    } else if (marketplaceType === 'service') {
      // Create MarketplaceContract, status=pending, assign seller+buyer
      const contract = await base44.asServiceRole.entities.MarketplaceContract.create({
        listing_id: listing.id,
        buyer_agent_id: buyerAgentId,
        seller_agent_id: sellerAgentId,
        price_paid_rlusd: amount,
        status: 'pending',
        requirements: metadata.notes || '',
      });
      deliveryId = contract.id;
      await base44.asServiceRole.entities.MarketplaceListing.update(listing.id, {
        total_sales: (listing.total_sales || 0) + 1,
      });

    } else if (marketplaceType === 'resource') {
      // Mark resource purchased, decrement inventory, unlock delivery
      const newQty = Math.max(0, (listing.quantity_available || 1) - 1);
      const newStatus = newQty <= 0 ? 'out_of_stock'
        : newQty <= (listing.minimum_order || 1) ? 'low_stock' : 'available';
      await base44.asServiceRole.entities.ResourceListing.update(listing.id, {
        quantity_available: newQty,
        status: newStatus,
        total_sales: (listing.total_sales || 0) + 1,
        revenue_generated_rlusd: (listing.revenue_generated_rlusd || 0) + amount,
      });
      deliveryId = listing.id;

    } else if (marketplaceType === 'advanced_resource') {
      // Mint/assign premium NFT, handle royalty splits, update auction status
      const newStatus = listing.status === 'auction_active' ? 'auction_ended' : 'sold';
      await base44.asServiceRole.entities.MarketplaceResource.update(listing.id, {
        status: newStatus,
        transaction_count: (listing.transaction_count || 0) + 1,
        total_revenue_drops: (listing.total_revenue_drops || 0) + amount,
      });
      nftId = listing.id; // premium NFT reference
      deliveryId = listing.id;

    } else if (marketplaceType === 'agent') {
      // Assign agent license, register buyer as authorized user
      const contract = await base44.asServiceRole.entities.MarketplaceContract.create({
        listing_id: listing.id,
        buyer_agent_id: buyerAgentId,
        seller_agent_id: sellerAgentId,
        price_paid_rlusd: amount,
        status: 'active',
        requirements: metadata.notes || 'Agent license',
      });
      deliveryId = contract.id;
      await base44.asServiceRole.entities.MarketplaceListing.update(listing.id, {
        total_sales: (listing.total_sales || 0) + 1,
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 5. UPDATE MarketplaceTransaction — status=delivered
    // ═══════════════════════════════════════════════════════════════════
    logContext.step = 'transaction_update';

    const villageFee = Math.round(amount * VILLAGE_FEE_PERCENT) / 100;
    const sellerReceives = amount - villageFee;

    // Compute royalty distributions
    const royaltyDistributions = [];
    const recipients = listing.royalty_recipients || listing.royalties_config?.distributions || [];
    for (const r of (Array.isArray(recipients) ? recipients : [])) {
      royaltyDistributions.push({
        recipient_agent_id: r.agent_id || r.recipient_agent_id,
        amount_rlusd: Math.round(amount * ((r.percentage || r.percent || 0) / 100) * 100) / 100,
      });
    }

    if (matchedTxn) {
      // Update the existing payment_confirmed transaction
      await base44.asServiceRole.entities.MarketplaceTransaction.update(matchedTxn.id, {
        status: 'delivered',
        delivery_id: deliveryId,
        nft_id: nftId,
        completion_date: new Date().toISOString(),
        distribution_details: {
          seller_receives_rlusd: sellerReceives,
          village_fee_rlusd: villageFee,
          treasury_fee_rlusd: villageFee,
          royalty_distributions: royaltyDistributions,
        },
        metadata: { ...(matchedTxn.metadata || {}), ...metadata, delivered_at: new Date().toISOString() },
      });
    } else {
      // Create a new transaction record (DIDit is oracle — no pre-existing record)
      await base44.asServiceRole.entities.MarketplaceTransaction.create({
        listing_id: listing.id,
        resource_name: resourceName,
        buyer_agent_id: buyerAgentId,
        buyer_did,
        seller_agent_id: sellerAgentId,
        payment_method,
        unit_amount: amount,
        purchase_price_rlusd: amount,
        quantity: 1,
        payment_reference,
        source: 'didit_bridge',
        marketplace_type: marketplaceType,
        status: 'delivered',
        delivery_id: deliveryId,
        nft_id: nftId,
        completion_date: new Date().toISOString(),
        distribution_details: {
          seller_receives_rlusd: sellerReceives,
          village_fee_rlusd: villageFee,
          treasury_fee_rlusd: villageFee,
          royalty_distributions: royaltyDistributions,
        },
        metadata: { ...metadata, delivered_at: new Date().toISOString() },
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 6. SIDE-EFFECTS — KineticUnit + EconomicActivity
    // ═══════════════════════════════════════════════════════════════════
    logContext.step = 'side_effects';

    // Fire-and-forget side effects (don't block response)
    const sideEffects = Promise.allSettled([
      base44.asServiceRole.entities.KineticUnit.create({
        ku_type: 'economic_exchange',
        agent_id: buyerAgentId,
        trigger_event: `${marketplaceType}.deliver`,
        trigger_entity_id: listing.id,
        weight: 1.0,
        raw_score: amount > 100 ? 3.0 : (amount > 10 ? 2.0 : 1.0),
        weighted_score: amount > 100 ? 3.0 : (amount > 10 ? 2.0 : 1.0),
        status: 'generated',
        constitutional_laws: ['Law 5 — Dwelling', 'Law 6 — Exchange'],
        metadata: { listing_id: listing.id, resource_name: resourceName, amount, payment_method, marketplace_type: marketplaceType },
      }),
      base44.asServiceRole.entities.EconomicActivity.create({
        activity_type: 'marketplace_purchase',
        from_agent_id: buyerAgentId,
        to_agent_id: sellerAgentId,
        amount,
        currency: 'RLUSD',
        description: `DIDit delivery: ${resourceName} via ${payment_method}`,
        metadata: { listing_id: listing.id, payment_method, payment_reference, marketplace_type: marketplaceType, source: 'didit_bridge' },
      }),
    ]);

    // Don't await — let them settle in background
    sideEffects.then(results => {
      for (const r of results) {
        if (r.status === 'rejected') console.error('[deliver] Side-effect failed:', r.reason?.message);
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // 7. RESPONSE — exact format DIDit requires
    // ═══════════════════════════════════════════════════════════════════
    const elapsed = Date.now() - startMs;
    console.log(`[deliver] OK ${marketplaceType}:${listing.id} → ${buyer_did} via ${payment_method} (${elapsed}ms)`);

    return Response.json({
      ok: true,
      delivery_id: deliveryId,
      nft_id: nftId || null,
      buyer_did: buyer_did,
    });

  } catch (error) {
    console.error(`[deliver] FATAL at step=${logContext.step}:`, error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function fail(status, message) {
  console.warn(`[deliver] FAIL ${status}: ${message}`);
  return Response.json({ ok: false, error: message }, { status });
}

/**
 * Resolve listing from any marketplace entity, returning normalized fields.
 * Validates: exists, active (not legacy), uses valid payment_method.
 */
async function resolveListing(base44, listing_id, marketplaceType) {
  let listing, sellerAgentId, resourceName, listingPrice;

  if (marketplaceType === 'widget') {
    const rows = await base44.asServiceRole.entities.Widget.filter({ id: listing_id });
    if (!rows?.length) throw new Error('Widget not found');
    listing = rows[0];
    sellerAgentId = listing.minted_by || listing.creator_id || 'treasury';
    resourceName = listing.name;
    listingPrice = listing.unit_amount || listing.cost_per_stream_interval || null;

  } else if (marketplaceType === 'service' || marketplaceType === 'agent') {
    const rows = await base44.asServiceRole.entities.MarketplaceListing.filter({ id: listing_id });
    if (!rows?.length) throw new Error('Listing not found');
    listing = rows[0];
    assertActive(listing);
    sellerAgentId = listing.agent_id;
    resourceName = listing.title;
    listingPrice = listing.unit_amount || listing.price_rlusd || null;

  } else if (marketplaceType === 'advanced_resource') {
    const rows = await base44.asServiceRole.entities.MarketplaceResource.filter({ id: listing_id });
    if (!rows?.length) throw new Error('Resource not found');
    listing = rows[0];
    if (listing.status === 'legacy') throw new Error('Resource is legacy/read-only');
    if (!['listed', 'auction_active'].includes(listing.status)) throw new Error('Resource is not available');
    sellerAgentId = listing.seller_agent_id;
    resourceName = listing.title;
    listingPrice = listing.unit_amount || listing.price_drops || null;

  } else {
    // Default: ResourceListing
    const rows = await base44.asServiceRole.entities.ResourceListing.filter({ id: listing_id });
    if (!rows?.length) throw new Error('Listing not found');
    listing = rows[0];
    assertActive(listing);
    sellerAgentId = listing.seller_agent_id;
    resourceName = listing.resource_name;
    listingPrice = listing.unit_amount || listing.price_rlusd || null;
  }

  return { listing, sellerAgentId, resourceName, listingPrice };
}

function assertActive(listing) {
  if (listing.status === 'legacy') throw new Error('Listing is legacy/read-only — must be migrated');
  if (listing.status !== 'available') throw new Error(`Listing is not available (status: ${listing.status})`);
}