import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { resourceId, buyerAgentId, purchaseType, bidAmount } = payload;

    // Fetch resource
    const resource = await base44.entities.MarketplaceResource.read(resourceId);
    if (!resource) {
      return Response.json({ error: 'Resource not found' }, { status: 404 });
    }

    if (resource.status === 'sold') {
      return Response.json({ error: 'Resource already sold' }, { status: 400 });
    }

    // Determine purchase price
    const priceInDrops = purchaseType === 'bid' ? bidAmount : resource.price_drops;

    // Create transaction record
    const transaction = await base44.entities.MarketplaceTransaction.create({
      resource_id: resourceId,
      buyer_agent_id: buyerAgentId,
      seller_agent_id: resource.seller_agent_id,
      purchase_price_drops: priceInDrops,
      status: 'pending',
      metadata: {
        purchase_type: purchaseType,
        timestamp: new Date().toISOString()
      }
    });

    // Calculate distribution
    const sellerShare = Math.floor(priceInDrops * 0.90); // 90% to seller
    const royaltyDistributions = [];
    let totalRoyalties = 0;

    if (resource.royalty_recipients && resource.royalty_recipients.length > 0) {
      const royaltyPool = Math.floor(priceInDrops * 0.10);
      
      for (const recipient of resource.royalty_recipients) {
        const amount = Math.floor((royaltyPool * recipient.percentage) / 100);
        royaltyDistributions.push({
          recipient_agent_id: recipient.agent_id,
          amount_drops: amount
        });
        totalRoyalties += amount;
      }
    }

    // Log transaction to Treasury
    const treasuryLog = await base44.entities.EconomicActivity.create({
      agent_id: resource.seller_agent_id,
      activity_type: 'earned',
      amount: sellerShare / 1000000,
      description: `Marketplace sale: ${resource.title}`,
      related_agent_id: buyerAgentId,
      resource_id: resourceId,
      transaction_hash: transaction.id
    });

    // Create audit signature
    const auditData = {
      resourceId,
      buyerAgentId,
      sellerAgentId: resource.seller_agent_id,
      priceInDrops,
      distributionDetails: {
        seller_receives_drops: sellerShare,
        royalty_distributions: royaltyDistributions
      },
      timestamp: new Date().toISOString(),
      transactionId: transaction.id
    };

    const auditSignature = btoa(JSON.stringify(auditData));

    // Update transaction with distribution details
    await base44.entities.MarketplaceTransaction.update(transaction.id, {
      status: 'distributed',
      distribution_details: {
        seller_receives_drops: sellerShare,
        royalty_distributions: royaltyDistributions,
        treasury_fee_drops: Math.floor(priceInDrops * 0.05)
      },
      audit_signature: auditSignature,
      treasury_transaction_hash: treasuryLog.id,
      completion_date: new Date().toISOString()
    });

    // Update resource record
    await base44.entities.MarketplaceResource.update(resourceId, {
      status: purchaseType === 'bid' ? 'sold' : 'sold',
      transaction_count: (resource.transaction_count || 0) + 1,
      total_revenue_drops: (resource.total_revenue_drops || 0) + priceInDrops,
      highest_bidder_agent_id: null,
      current_highest_bid_drops: null
    });

    return Response.json({
      success: true,
      transactionId: transaction.id,
      auditSignature,
      distributionDetails: auditData.distributionDetails
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});