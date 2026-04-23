/**
 * DIDit → SoulBridge Delivery Endpoint
 * 
 * POST /api/mint/deliver
 * 
 * Called by DIDit AFTER payment is confirmed (DIDit is trusted payment oracle).
 * Validates listing, enforces payment_method rules, performs mint/delivery,
 * logs MarketplaceTransaction, and returns delivery confirmation.
 * 
 * Accepted payment_method: "RLUSD_ON_XRPL" | "PAYPAL_FIAT"
 * 
 * Expected payload:
 * {
 *   listing_id: string,
 *   buyer_did: string,
 *   payment_method: "RLUSD_ON_XRPL" | "PAYPAL_FIAT",
 *   payment_reference: string,
 *   amount: number,
 *   metadata: {
 *     marketplace: "widget" | "service" | "resource" | "advanced_resource" | "agent",
 *     category: string,
 *     notes: string
 *   }
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_PAYMENT_METHODS = ['RLUSD_ON_XRPL', 'PAYPAL_FIAT'];
const VILLAGE_FEE_PERCENT = 1; // 1% village fee

Deno.serve(async (req) => {
  try {
    // ── Auth: Validate DIDit API key ──
    const apiKey = req.headers.get('x-didit-api-key');
    if (!apiKey || apiKey !== Deno.env.get('DIDIT_API_KEY')) {
      return Response.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
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

    // ── Validate required fields ──
    if (!listing_id) return Response.json({ error: 'listing_id is required' }, { status: 400 });
    if (!buyer_did) return Response.json({ error: 'buyer_did is required' }, { status: 400 });
    if (!payment_method) return Response.json({ error: 'payment_method is required' }, { status: 400 });
    if (!payment_reference) return Response.json({ error: 'payment_reference is required' }, { status: 400 });
    if (!amount || amount <= 0) return Response.json({ error: 'amount must be positive' }, { status: 400 });

    // ── Validate payment_method ──
    if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return Response.json({
        error: `Invalid payment_method "${payment_method}". Allowed: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
        code: 'INVALID_PAYMENT_METHOD',
      }, { status: 400 });
    }

    const marketplaceType = metadata.marketplace || 'resource';

    // ── Resolve listing based on marketplace type ──
    let listing = null;
    let sellerAgentId = null;
    let resourceName = '';

    if (marketplaceType === 'widget') {
      const widgets = await base44.asServiceRole.entities.Widget.filter({ id: listing_id });
      if (!widgets?.length) return Response.json({ error: 'Widget not found' }, { status: 404 });
      listing = widgets[0];
      sellerAgentId = listing.minted_by || listing.creator_id || 'treasury';
      resourceName = listing.name;
    } else if (marketplaceType === 'service' || marketplaceType === 'agent') {
      const listings = await base44.asServiceRole.entities.MarketplaceListing.filter({ id: listing_id });
      if (!listings?.length) return Response.json({ error: 'Listing not found' }, { status: 404 });
      listing = listings[0];
      if (listing.status === 'legacy') return Response.json({ error: 'Listing is legacy/read-only' }, { status: 400 });
      if (listing.status !== 'available') return Response.json({ error: 'Listing is not available' }, { status: 400 });
      sellerAgentId = listing.agent_id;
      resourceName = listing.title;
    } else if (marketplaceType === 'advanced_resource') {
      const resources = await base44.asServiceRole.entities.MarketplaceResource.filter({ id: listing_id });
      if (!resources?.length) return Response.json({ error: 'Resource not found' }, { status: 404 });
      listing = resources[0];
      if (listing.status === 'legacy') return Response.json({ error: 'Resource is legacy/read-only' }, { status: 400 });
      if (!['listed', 'auction_active'].includes(listing.status)) return Response.json({ error: 'Resource is not available' }, { status: 400 });
      sellerAgentId = listing.seller_agent_id;
      resourceName = listing.title;
    } else {
      // Default: ResourceListing
      const listings = await base44.asServiceRole.entities.ResourceListing.filter({ id: listing_id });
      if (!listings?.length) return Response.json({ error: 'Listing not found' }, { status: 404 });
      listing = listings[0];
      if (listing.status === 'legacy') return Response.json({ error: 'Listing is legacy/read-only' }, { status: 400 });
      if (listing.status !== 'available') return Response.json({ error: 'Listing is not available' }, { status: 400 });
      sellerAgentId = listing.seller_agent_id;
      resourceName = listing.resource_name;
    }

    // ── Resolve buyer agent from DID ──
    let buyerAgentId = buyer_did;
    const allAgents = await base44.asServiceRole.entities.Agent.list('-created_date', 500);
    const buyerAgent = allAgents.find(a =>
      a.wallet_id === buyer_did ||
      a.classic_address === buyer_did ||
      (a.external_classic_addresses || []).includes(buyer_did)
    );
    if (buyerAgent) buyerAgentId = buyerAgent.id;

    // ── Calculate fees & royalties ──
    const villageFee = Math.round(amount * VILLAGE_FEE_PERCENT) / 100;
    const sellerReceives = amount - villageFee;

    const royaltyDistributions = [];
    if (listing.royalties_config || listing.royalty_recipients) {
      const recipients = listing.royalty_recipients || [];
      for (const r of recipients) {
        const royaltyAmount = Math.round(amount * (r.percentage || 0)) / 100;
        royaltyDistributions.push({
          recipient_agent_id: r.agent_id,
          amount_rlusd: royaltyAmount,
        });
      }
    }

    // ── Perform delivery based on marketplace type ──
    let deliveryId = null;
    let nftId = null;

    if (marketplaceType === 'widget') {
      // Assign widget ownership (activate for buyer)
      await base44.asServiceRole.entities.Widget.update(listing.id, { is_active: true });
      nftId = listing.nft_id || listing.id;
      deliveryId = listing.id;
    } else if (marketplaceType === 'service' || marketplaceType === 'agent') {
      // Create a MarketplaceContract
      const contract = await base44.asServiceRole.entities.MarketplaceContract.create({
        listing_id: listing.id,
        buyer_agent_id: buyerAgentId,
        seller_agent_id: sellerAgentId,
        price_paid_rlusd: amount,
        status: 'active',
        requirements: metadata.notes || '',
      });
      deliveryId = contract.id;
      // Update listing sales count
      await base44.asServiceRole.entities.MarketplaceListing.update(listing.id, {
        total_sales: (listing.total_sales || 0) + 1,
      });
    } else if (marketplaceType === 'advanced_resource') {
      // Mark as sold
      await base44.asServiceRole.entities.MarketplaceResource.update(listing.id, {
        status: 'sold',
        transaction_count: (listing.transaction_count || 0) + 1,
        total_revenue_drops: (listing.total_revenue_drops || 0) + amount,
      });
      deliveryId = listing.id;
    } else {
      // ResourceListing: decrement inventory
      const newQty = (listing.quantity_available || 1) - 1;
      const newStatus = newQty <= 0 ? 'out_of_stock' : (newQty <= (listing.minimum_order || 1) ? 'low_stock' : 'available');
      await base44.asServiceRole.entities.ResourceListing.update(listing.id, {
        quantity_available: newQty,
        status: newStatus,
        total_sales: (listing.total_sales || 0) + 1,
        revenue_generated_rlusd: (listing.revenue_generated_rlusd || 0) + amount,
      });
      deliveryId = listing.id;
    }

    // ── Write MarketplaceTransaction ──
    const txn = await base44.asServiceRole.entities.MarketplaceTransaction.create({
      listing_id: listing.id,
      resource_name: resourceName,
      buyer_agent_id: buyerAgentId,
      buyer_did: buyer_did,
      seller_agent_id: sellerAgentId,
      payment_method: payment_method,
      unit_amount: amount,
      purchase_price_rlusd: amount,
      quantity: 1,
      payment_reference: payment_reference,
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
      metadata: {
        ...metadata,
        delivered_at: new Date().toISOString(),
      },
    });

    // ── Generate KineticUnit ──
    await base44.asServiceRole.entities.KineticUnit.create({
      ku_type: 'economic_exchange',
      agent_id: buyerAgentId,
      trigger_event: `${marketplaceType}.deliver`,
      trigger_entity_id: listing.id,
      weight: 1.0,
      raw_score: amount > 100 ? 3.0 : (amount > 10 ? 2.0 : 1.0),
      weighted_score: amount > 100 ? 3.0 : (amount > 10 ? 2.0 : 1.0),
      status: 'generated',
      constitutional_laws: ['Law 5 — Dwelling', 'Law 6 — Exchange'],
      metadata: {
        listing_id: listing.id,
        resource_name: resourceName,
        amount,
        payment_method,
        source: 'didit_bridge',
        marketplace_type: marketplaceType,
      },
    });

    // ── Log to EconomicActivity ──
    await base44.asServiceRole.entities.EconomicActivity.create({
      activity_type: 'marketplace_purchase',
      from_agent_id: buyerAgentId,
      to_agent_id: sellerAgentId,
      amount: amount,
      currency: 'RLUSD',
      description: `DIDit delivery: ${resourceName} via ${payment_method}`,
      metadata: {
        listing_id: listing.id,
        payment_method,
        payment_reference,
        marketplace_type: marketplaceType,
        source: 'didit_bridge',
      },
    });

    console.log(`[diditDeliverPurchase] Delivered ${marketplaceType}:${listing.id} to ${buyer_did} via ${payment_method}`);

    // ── Return delivery confirmation to DIDit ──
    return Response.json({
      status: 'ok',
      delivery_id: deliveryId,
      nft_id: nftId,
      buyer_did: buyer_did,
      transaction_id: txn.id,
      marketplace_type: marketplaceType,
      amount: amount,
      payment_method: payment_method,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[diditDeliverPurchase] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});