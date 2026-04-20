/**
 * Didit Bridge API — Get Marketplace Listings
 * 
 * Returns available ResourceListing items for display on the Didit marketplace.
 * Auth: DIDIT_API_KEY header required.
 * 
 * POST { 
 *   category?: string,           // filter by resource_category
 *   seller_agent_id?: string,    // filter by specific seller
 *   tags?: string[],             // filter by tags
 *   steward_only?: boolean       // if true, only show SoulBridge Steward listings
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
    const { category, seller_agent_id, tags, steward_only, nft_id, search, include_unlisted, status: statusFilter } = body;

    // Build filter for listings
    const filter = {};
    if (statusFilter === 'all') {
      // No status filter — return everything
    } else {
      filter.status = statusFilter || 'available';
    }
    if (category) filter.resource_category = category;
    if (seller_agent_id) filter.seller_agent_id = seller_agent_id;

    let listings = await base44.asServiceRole.entities.ResourceListing.filter(filter);

    // Include unlisted if requested
    if (include_unlisted) {
      const unlisted = await base44.asServiceRole.entities.ResourceListing.filter({ status: 'unlisted' });
      listings = [...listings, ...unlisted];
    }

    // Filter by nft_id in specifications
    if (nft_id) {
      listings = listings.filter(l => l.specifications?.nft_id === nft_id);
    }

    // Text search across name, description, tags, and specifications
    if (search) {
      const q = search.toLowerCase();
      listings = listings.filter(l =>
        (l.resource_name || '').toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        (l.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (l.specifications?.nft_id || '').toLowerCase().includes(q) ||
        (l.specifications?.widget_id || '').toLowerCase().includes(q) ||
        (l.specifications?.issuer_address || '').toLowerCase().includes(q)
      );
    }

    // If steward_only, find the Steward agent and filter
    if (steward_only) {
      const agents = await base44.asServiceRole.entities.Agent.list();
      const steward = agents.find(a => 
        a.name && a.name.toLowerCase().includes('steward')
      );
      if (steward) {
        listings = listings.filter(l => l.seller_agent_id === steward.id);
      }
    }

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      listings = listings.filter(l => 
        l.tags && tags.some(t => l.tags.includes(t))
      );
    }

    // Enrich each listing with seller agent name
    const agentIds = [...new Set(listings.map(l => l.seller_agent_id).filter(Boolean))];
    const agents = await base44.asServiceRole.entities.Agent.list();
    const agentMap = {};
    agents.forEach(a => { agentMap[a.id] = a; });

    const enrichedListings = listings.map(l => ({
      listing_id: l.id,
      resource_name: l.resource_name,
      resource_category: l.resource_category,
      description: l.description || null,
      price_rlusd: l.price_rlusd,
      quantity_available: l.quantity_available,
      unit_of_measure: l.unit_of_measure || 'units',
      status: l.status,
      quality_rating: l.quality_rating || null,
      average_rating: l.average_rating || 0,
      total_reviews: l.total_reviews || 0,
      total_sales: l.total_sales || 0,
      delivery_method: l.delivery_method || 'instant_access',
      delivery_time_hours: l.delivery_time_hours || null,
      tags: l.tags || [],
      sample_files: l.sample_files || [],
      specifications: l.specifications || null,
      minimum_order: l.minimum_order || 1,
      seller_agent_id: l.seller_agent_id,
      seller_agent_name: agentMap[l.seller_agent_id]?.name || 'Unknown Agent',
      seller_honor_score: agentMap[l.seller_agent_id]?.honor_score || 0,
      created_date: l.created_date,
    }));

    return Response.json({ 
      success: true, 
      listings: enrichedListings,
      total_count: enrichedListings.length 
    });
  } catch (error) {
    console.error('[diditGetMarketplaceListings] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});