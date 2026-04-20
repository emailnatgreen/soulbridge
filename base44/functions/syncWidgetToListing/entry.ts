/**
 * Auto-Sync: Widget → ResourceListing
 * 
 * Triggered by entity automation when a Widget is updated.
 * When mint_status becomes 'minted_mainnet', creates a ResourceListing
 * if one doesn't already exist for this widget.
 * 
 * This ensures the Didit bridge can always find minted widgets.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { event, data } = body;
    
    // Only act on widget updates where mint_status is minted_mainnet
    if (!data || data.mint_status !== 'minted_mainnet') {
      return Response.json({ skipped: true, reason: 'Not a minted_mainnet widget' });
    }

    const widget = data;
    const widgetId = event?.entity_id;

    // Check if a ResourceListing already exists for this widget
    const existing = await base44.asServiceRole.entities.ResourceListing.list('-created_date', 500);
    const alreadyListed = existing.find(l => 
      l.specifications?.widget_id === widgetId || 
      l.specifications?.nft_id === widget.nft_id
    );

    if (alreadyListed) {
      console.log(`[syncWidgetToListing] Listing already exists for widget ${widgetId} (${widget.nft_id})`);
      return Response.json({ 
        skipped: true, 
        reason: 'Listing already exists',
        listing_id: alreadyListed.id 
      });
    }

    // Create the ResourceListing
    const listing = await base44.asServiceRole.entities.ResourceListing.create({
      seller_agent_id: widget.minted_by || widget.creator_id || 'axi',
      resource_category: 'software_license',
      resource_name: `${widget.name} (${widget.nft_id || 'Widget'})`,
      description: widget.description || `Widget NFT minted on XRPL${widget.xrpl_tx_hash ? '. TX: ' + widget.xrpl_tx_hash : ''}`,
      quantity_available: 1,
      unit_of_measure: 'units',
      price_rlusd: widget.cost_per_stream_interval || 0,
      status: 'available',
      quality_rating: 10,
      delivery_method: 'instant_access',
      delivery_time_hours: 0,
      tags: ['nft', 'widget', widget.nft_id, widget.category, widget.widget_type, 'xrpl', widget.xrpl_network || 'mainnet'].filter(Boolean),
      minimum_order: 1,
      total_sales: 0,
      revenue_generated_rlusd: 0,
      specifications: {
        nft_id: widget.nft_id || null,
        widget_id: widgetId,
        xrpl_tx_hash: widget.xrpl_tx_hash || null,
        issuer_address: widget.xrpl_mint_payload?.Account || null,
        widget_type: widget.widget_type,
        category: widget.category,
        network: widget.xrpl_network || 'mainnet',
        metadata_hash: widget.metadata_hash || null,
      },
    });

    console.log(`[syncWidgetToListing] Created listing ${listing.id} for widget ${widgetId} (${widget.nft_id})`);

    // Log the sync
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Widget→Listing Sync',
      function_name: 'syncWidgetToListing',
      status: 'success',
      message: `Auto-created ResourceListing for ${widget.name} (${widget.nft_id})`,
      details: {
        widget_id: widgetId,
        nft_id: widget.nft_id,
        listing_id: listing.id,
        tx_hash: widget.xrpl_tx_hash,
      },
      triggered_by: 'entity_event',
      run_at: new Date().toISOString(),
    });

    return Response.json({ 
      success: true, 
      listing_id: listing.id,
      widget_id: widgetId,
      nft_id: widget.nft_id,
    });
  } catch (error) {
    console.error('[syncWidgetToListing] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});