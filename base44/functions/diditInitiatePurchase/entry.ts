/**
 * Didit Bridge API — Initiate Purchase (Updated 2026-04-23)
 * 
 * Called by Didit when a user purchases an NFT/resource.
 * 
 * PAYMENT MODEL: Only RLUSD_ON_XRPL and PAYPAL_FIAT accepted.
 * Legacy methods (XRP, PYUSD, RLUSD_BASE) are rejected.
 * 
 * Auth: DIDIT_API_KEY header required.
 * 
 * POST {
 *   listing_id: string,
 *   buyer_agent_id: string,
 *   quantity?: number,
 *   payment_method: "RLUSD_ON_XRPL" | "PAYPAL_FIAT",
 *   payment_reference: string
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALLOWED_PAYMENT_METHODS = ['RLUSD_ON_XRPL', 'PAYPAL_FIAT'];

Deno.serve(async (req) => {
  try {
    const apiKey = req.headers.get('x-didit-api-key');
    if (!apiKey || apiKey !== Deno.env.get('DIDIT_API_KEY')) {
      return Response.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const { 
      listing_id, 
      buyer_agent_id, 
      quantity = 1, 
      payment_method, 
      transaction_reference,
      payment_reference,
    } = await req.json();

    // Use payment_reference or legacy transaction_reference
    const payRef = payment_reference || transaction_reference;

    if (!listing_id) return Response.json({ error: 'listing_id is required' }, { status: 400 });
    if (!buyer_agent_id) return Response.json({ error: 'buyer_agent_id is required' }, { status: 400 });
    if (!payment_method) return Response.json({ error: 'payment_method is required' }, { status: 400 });
    if (!payRef) return Response.json({ error: 'payment_reference is required' }, { status: 400 });

    // Block legacy payment methods
    if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return Response.json({
        error: `payment_method "${payment_method}" is blocked. Only accepted: ${ALLOWED_PAYMENT_METHODS.join(', ')}`,
        code: 'LEGACY_PAYMENT_BLOCKED',
      }, { status: 400 });
    }

    // Fetch the listing
    const listings = await base44.asServiceRole.entities.ResourceListing.filter({ id: listing_id });
    if (!listings || listings.length === 0) {
      return Response.json({ error: 'Listing not found' }, { status: 404 });
    }
    const listing = listings[0];

    // Block legacy listings
    if (listing.status === 'legacy') {
      return Response.json({ error: 'Listing is legacy/read-only. Must be migrated to RLUSD or PayPal.' }, { status: 400 });
    }

    if (listing.status !== 'available') {
      return Response.json({ error: 'Listing is not available for purchase' }, { status: 400 });
    }

    if (quantity > listing.quantity_available) {
      return Response.json({ error: 'Insufficient quantity available' }, { status: 400 });
    }

    // Validate buyer exists
    const agents = await base44.asServiceRole.entities.Agent.list('-created_date', 500);
    const buyer = agents.find(a => a.id === buyer_agent_id);
    if (!buyer) {
      return Response.json({ error: 'Buyer agent not found' }, { status: 404 });
    }

    if (listing.seller_agent_id === buyer_agent_id) {
      return Response.json({ error: 'Cannot purchase your own listing' }, { status: 400 });
    }

    // Use unit_amount (new) or fall back to price_rlusd (legacy)
    const unitPrice = listing.unit_amount || listing.price_rlusd || 0;
    const totalCost = unitPrice * quantity;

    // Update listing inventory
    const newQuantity = listing.quantity_available - quantity;
    const newStatus = newQuantity <= 0 ? 'out_of_stock' : (newQuantity <= (listing.minimum_order || 1) ? 'low_stock' : 'available');

    await base44.asServiceRole.entities.ResourceListing.update(listing.id, {
      quantity_available: newQuantity,
      status: newStatus,
      total_sales: (listing.total_sales || 0) + quantity,
      revenue_generated_rlusd: (listing.revenue_generated_rlusd || 0) + totalCost,
    });

    // Log EconomicActivity
    await base44.asServiceRole.entities.EconomicActivity.create({
      activity_type: 'marketplace_purchase',
      from_agent_id: buyer_agent_id,
      to_agent_id: listing.seller_agent_id,
      amount: totalCost,
      currency: 'RLUSD',
      description: `Didit purchase: ${listing.resource_name} x${quantity} via ${payment_method}`,
      metadata: {
        listing_id: listing.id,
        resource_name: listing.resource_name,
        quantity, unit_price: unitPrice,
        payment_method, payment_reference: payRef,
        source: 'didit_bridge',
      },
    });

    // Log MarketplaceTransaction with new canonical fields
    await base44.asServiceRole.entities.MarketplaceTransaction.create({
      listing_id: listing.id,
      resource_name: listing.resource_name,
      buyer_agent_id,
      seller_agent_id: listing.seller_agent_id,
      payment_method: payment_method,
      unit_amount: totalCost,
      purchase_price_rlusd: totalCost,
      quantity,
      payment_reference: payRef,
      source: 'didit_bridge',
      marketplace_type: 'resource',
      status: 'completed',
      completion_date: new Date().toISOString(),
      distribution_details: {
        seller_receives_rlusd: totalCost * 0.99,
        village_fee_rlusd: totalCost * 0.01,
        treasury_fee_rlusd: totalCost * 0.01,
      },
      metadata: {
        unit_price: unitPrice,
        listing_category: listing.resource_category,
      },
    });

    // Generate KineticUnit
    await base44.asServiceRole.entities.KineticUnit.create({
      ku_type: 'economic_exchange',
      agent_id: buyer_agent_id,
      trigger_event: 'ResourceListing.purchase',
      trigger_entity_id: listing.id,
      weight: 1.0,
      raw_score: totalCost > 100 ? 3.0 : (totalCost > 10 ? 2.0 : 1.0),
      weighted_score: totalCost > 100 ? 3.0 : (totalCost > 10 ? 2.0 : 1.0),
      status: 'generated',
      constitutional_laws: ['Law 5 — Dwelling', 'Law 6 — Exchange'],
      metadata: {
        listing_id: listing.id,
        resource_name: listing.resource_name,
        total_cost: totalCost,
        payment_method,
        source: 'didit_bridge',
      },
    });

    return Response.json({
      success: true,
      purchase: {
        listing_id: listing.id,
        resource_name: listing.resource_name,
        buyer_agent_id,
        seller_agent_id: listing.seller_agent_id,
        quantity,
        total_cost_rlusd: totalCost,
        payment_method,
        payment_reference: payRef,
        new_listing_status: newStatus,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[diditInitiatePurchase] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});