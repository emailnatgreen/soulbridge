/**
 * Didit Bridge API — Get Transaction History
 * 
 * Returns marketplace transaction history filtered by agent, listing, or status.
 * Auth: DIDIT_API_KEY header required.
 * 
 * POST {
 *   agent_id?: string,          // Filter by buyer OR seller agent ID
 *   buyer_agent_id?: string,    // Filter by buyer only
 *   seller_agent_id?: string,   // Filter by seller only
 *   listing_id?: string,        // Filter by specific listing
 *   status?: string,            // Filter by status
 *   source?: string,            // Filter by source (e.g. 'didit_bridge')
 *   limit?: number,             // Max results (default 50, max 200)
 *   offset?: number             // Pagination offset (default 0)
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
    const body = await req.json().catch(() => ({}));
    const { agent_id, buyer_agent_id, seller_agent_id, listing_id, status, source, limit = 50, offset = 0 } = body;

    // Fetch all transactions (service role — no user auth needed for bridge API)
    let transactions = await base44.asServiceRole.entities.MarketplaceTransaction.list('-created_date', 200);

    // Apply filters
    if (agent_id) {
      transactions = transactions.filter(t => 
        t.buyer_agent_id === agent_id || t.seller_agent_id === agent_id
      );
    }
    if (buyer_agent_id) {
      transactions = transactions.filter(t => t.buyer_agent_id === buyer_agent_id);
    }
    if (seller_agent_id) {
      transactions = transactions.filter(t => t.seller_agent_id === seller_agent_id);
    }
    if (listing_id) {
      transactions = transactions.filter(t => t.listing_id === listing_id);
    }
    if (status) {
      transactions = transactions.filter(t => t.status === status);
    }
    if (source) {
      transactions = transactions.filter(t => t.source === source);
    }

    // Paginate
    const total = transactions.length;
    const cappedLimit = Math.min(limit, 200);
    const paginatedTxs = transactions.slice(offset, offset + cappedLimit);

    // Enrich with agent names
    const allAgents = await base44.asServiceRole.entities.Agent.list();
    const agentMap = {};
    allAgents.forEach(a => { agentMap[a.id] = a; });

    const enrichedTxs = paginatedTxs.map(t => ({
      transaction_id: t.id,
      listing_id: t.listing_id || null,
      resource_id: t.resource_id || null,
      resource_name: t.resource_name || null,
      buyer_agent_id: t.buyer_agent_id,
      buyer_agent_name: agentMap[t.buyer_agent_id]?.name || 'Unknown',
      seller_agent_id: t.seller_agent_id,
      seller_agent_name: agentMap[t.seller_agent_id]?.name || 'Unknown',
      quantity: t.quantity || 1,
      purchase_price_rlusd: t.purchase_price_rlusd || null,
      purchase_price_drops: t.purchase_price_drops || null,
      currency: t.currency || 'RLUSD',
      payment_method: t.payment_method || null,
      transaction_reference: t.transaction_reference || null,
      source: t.source || 'soulbridge',
      status: t.status,
      completion_date: t.completion_date || null,
      created_date: t.created_date,
      distribution_details: t.distribution_details || null,
    }));

    return Response.json({
      success: true,
      transactions: enrichedTxs,
      total_count: total,
      offset,
      limit: cappedLimit,
    });
  } catch (error) {
    console.error('[diditGetTransactionHistory] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});