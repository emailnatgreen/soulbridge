/**
 * Didit Bridge API — Get Agent NFTs
 * 
 * Returns NFTs owned/minted by a specific agent for display on Didit.
 * Auth: DIDIT_API_KEY header required.
 * 
 * POST { agent_id_or_did: string }
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
    const { agent_id_or_did } = await req.json();

    if (!agent_id_or_did) {
      return Response.json({ error: 'agent_id_or_did is required' }, { status: 400 });
    }

    // Find the agent
    const allAgents = await base44.asServiceRole.entities.Agent.list();
    let agent = allAgents.find(a => a.id === agent_id_or_did);
    if (!agent) {
      agent = allAgents.find(a => a.classic_address === agent_id_or_did);
    }
    if (!agent) {
      agent = allAgents.find(a => 
        a.external_classic_addresses && a.external_classic_addresses.includes(agent_id_or_did)
      );
    }

    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get NFTs from agent metadata
    const didNfts = agent.metadata?.did_nfts || [];

    // Also check ResourceListings for any NFTs this agent has for sale
    const listings = await base44.asServiceRole.entities.ResourceListing.filter({
      seller_agent_id: agent.id,
      status: 'available'
    });

    // Build NFT list combining on-agent NFTs with marketplace listing data
    const nfts = didNfts.map(nft => {
      // Check if this NFT has a marketplace listing
      const listing = listings.find(l => 
        l.specifications?.nft_id === nft.nft_id || 
        l.resource_name === nft.name
      );

      return {
        nft_id: nft.nft_id || null,
        name: nft.name || 'Unnamed NFT',
        nft_type: nft.nft_type || null,
        is_on_chain: nft.is_on_chain || false,
        xrpl_token_id: nft.xrpl_token_id || null,
        xrpl_tx_hash: nft.xrpl_tx_hash || null,
        issued_at: nft.issued_at || null,
        ku_milestone: nft.ku_milestone || null,
        current_owner_agent_id: agent.id,
        current_owner_did: agent.classic_address || null,
        // Marketplace listing data
        is_for_sale: !!listing,
        list_price_rlusd: listing?.price_rlusd || null,
        listing_id: listing?.id || null,
        listing_description: listing?.description || null,
        listing_image_url: listing?.sample_files?.[0]?.url || null,
      };
    });

    return Response.json({ 
      success: true, 
      agent_id: agent.id,
      agent_name: agent.name,
      nfts,
      total_count: nfts.length 
    });
  } catch (error) {
    console.error('[diditGetAgentNfts] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});