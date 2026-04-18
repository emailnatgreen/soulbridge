/**
 * Didit Bridge API — Initiate Purchase
 * 
 * Called by Didit when a user purchases an NFT/resource.
 * Validates the purchase, updates ownership, and logs the transaction.
 * Auth: DIDIT_API_KEY header required + buyer_agent_id for user context.
 * 
 * POST {
 *   listing_id: string,           // ResourceListing ID
 *   buyer_agent_id: string,       // Authenticated buyer's Agent ID
 *   quantity?: number,            // Quantity to purchase (default 1)
 *   payment_method: string,       // e.g. 'PYUSD_ETH', 'XRP_Direct', 'PayPal_PYUSD_Backend'
 *   transaction_reference: string // External payment reference (PayPal ID, XRP hash, etc.)
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Validate Didit API Key
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
      transaction_reference 
    } = await req.json();

    // Validate required fields
    if (!listing_id) return Response.json({ error: 'listing_id is required' }, { status: 400 });
    if (!buyer_agent_id) return Response.json({ error: 'buyer_agent_id is required' }, { status: 400 });
    if (!payment_method) return Response.json({ error: 'payment_method is required' }, { status: 400 });
    if (!transaction_reference) return Response.json({ error: 'transaction_reference is required' }, { status: 400 });

    // Fetch the listing
    const listings = await base44.asServiceRole.entities.ResourceListing.filter({ id: listing_id });
    if (!listings || listings.length === 0) {
      return Response.json({ error: 'Listing not found' }, { status: 404 });
    }
    const listing = listings[0];

    // Validate listing is available
    if (listing.status !== 'available') {
      return Response.json({ error: 'Listing is not available for purchase' }, { status: 400 });
    }

    // Validate quantity
    if (quantity > listing.quantity_available) {
      return Response.json({ error: 'Insufficient quantity available' }, { status: 400 });
    }

    // Validate buyer exists
    const agents = await base44.asServiceRole.entities.Agent.list();
    const buyer = agents.find(a => a.id === buyer_agent_id);
    if (!buyer) {
      return Response.json({ error: 'Buyer agent not found' }, { status: 404 });
    }

    // Prevent self-purchase
    if (listing.seller_agent_id === buyer_agent_id) {
      return Response.json({ error: 'Cannot purchase your own listing' }, { status: 400 });
    }

    // Calculate total cost
    const totalCost = listing.price_rlusd * quantity;

    // Update listing inventory
    const newQuantity = listing.quantity_available - quantity;
    const newStatus = newQuantity <= 0 ? 'out_of_stock' : (newQuantity <= (listing.minimum_order || 1) ? 'low_stock' : 'available');

    await base44.asServiceRole.entities.ResourceListing.update(listing.id, {
      quantity_available: newQuantity,
      status: newStatus,
      total_sales: (listing.total_sales || 0) + quantity,
      revenue_generated_rlusd: (listing.revenue_generated_rlusd || 0) + totalCost,
    });

    // Log the transaction in EconomicActivity
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
        quantity,
        unit_price: listing.price_rlusd,
        payment_method,
        transaction_reference,
        source: 'didit_bridge',
      },
    });

    // Log the transaction in MarketplaceTransaction
    await base44.asServiceRole.entities.MarketplaceTransaction.create({
      listing_id: listing.id,
      resource_id: listing.resource_id || null,
      resource_name: listing.resource_name,
      buyer_agent_id,
      seller_agent_id: listing.seller_agent_id,
      purchase_price_rlusd: totalCost,
      quantity,
      currency: 'RLUSD',
      payment_method,
      transaction_reference,
      source: 'didit_bridge',
      status: 'completed',
      completion_date: new Date().toISOString(),
      metadata: {
        unit_price: listing.price_rlusd,
        listing_category: listing.resource_category,
      },
    });

    // Generate a KineticUnit for this economic exchange
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
        transaction_reference,
        new_listing_status: newStatus,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[diditInitiatePurchase] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});