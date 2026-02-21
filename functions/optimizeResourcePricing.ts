import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { listing_id, proposed_price } = await req.json();

        if (!listing_id) {
            return Response.json({ error: 'listing_id required' }, { status: 400 });
        }

        // Get listing and market data
        const listing = await base44.entities.ResourceListing.get(listing_id);
        if (!listing) {
            return Response.json({ error: 'Listing not found' }, { status: 404 });
        }

        // Get similar listings for comparison
        const similarListings = await base44.entities.ResourceListing.filter({
            resource_category: listing.resource_category,
            status: { $in: ['available', 'low_stock'] }
        });

        // Get all purchases in this category for demand analysis
        const allPurchases = await base44.entities.ResourcePurchase.filter({
            status: { $in: ['completed', 'delivered'] }
        });

        // Get recent purchases for this listing
        const listingPurchases = allPurchases.filter(p => p.listing_id === listing_id);

        // Market analysis data
        const marketData = {
            category: listing.resource_category,
            similar_listings: similarListings.map(l => ({
                price: l.price_rlusd,
                quantity: l.quantity_available,
                total_sales: l.total_sales || 0,
                average_rating: l.average_rating || 0
            })),
            category_purchases: allPurchases.filter(p => {
                const purchasedListing = similarListings.find(sl => sl.id === p.listing_id);
                return !!purchasedListing;
            }).length,
            listing_performance: {
                total_sales: listing.total_sales || 0,
                revenue: listing.revenue_generated_rlusd || 0,
                average_rating: listing.average_rating || 0,
                current_price: listing.price_rlusd,
                quantity_available: listing.quantity_available
            }
        };

        // AI pricing optimization
        const prompt = `You are an AI pricing strategist for the SoulBridge Village resource marketplace.

**Resource Being Analyzed:**
- Name: ${listing.resource_name}
- Category: ${listing.resource_category}
- Current Price: ${listing.price_rlusd} RLUSD
${proposed_price ? `- Proposed New Price: ${proposed_price} RLUSD` : ''}

**Market Data:**
${JSON.stringify(marketData, null, 2)}

**Task:**
Analyze the market and provide pricing optimization recommendations.

Consider:
1. Competitive pricing (what similar resources cost)
2. Demand indicators (purchase frequency in category)
3. Performance metrics (sales velocity, ratings)
4. Supply vs demand (quantity available vs purchase rate)
5. Value proposition (quality, uniqueness)

Provide:
- optimal_price: The AI-recommended price (RLUSD)
- price_range: { min, max } for this resource type
- confidence_level: How confident you are (0-100)
- market_position: Where this should be positioned (budget/mid-tier/premium)
- reasoning: Why this price is optimal
- demand_forecast: Expected demand at this price (low/medium/high)
- elasticity_insight: How price-sensitive buyers are likely to be`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    optimal_price: { type: "number" },
                    price_range: {
                        type: "object",
                        properties: {
                            min: { type: "number" },
                            max: { type: "number" }
                        }
                    },
                    confidence_level: { type: "number" },
                    market_position: { type: "string" },
                    reasoning: { type: "string" },
                    demand_forecast: { type: "string" },
                    elasticity_insight: { type: "string" },
                    recommendations: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        // Calculate potential impact
        const currentRevenue = (listing.total_sales || 0) * listing.price_rlusd;
        const projectedSalesAtNewPrice = Math.max(1, listing.total_sales || 1);
        const projectedRevenue = projectedSalesAtNewPrice * aiResponse.optimal_price;

        return Response.json({
            success: true,
            current_price: listing.price_rlusd,
            optimization: aiResponse,
            impact_analysis: {
                current_revenue: currentRevenue,
                projected_revenue: projectedRevenue,
                revenue_change_percent: currentRevenue > 0 
                    ? ((projectedRevenue - currentRevenue) / currentRevenue * 100).toFixed(1)
                    : 0
            },
            market_context: {
                category_average_price: similarListings.length > 0
                    ? (similarListings.reduce((sum, l) => sum + l.price_rlusd, 0) / similarListings.length).toFixed(2)
                    : listing.price_rlusd,
                total_competitors: similarListings.length - 1
            }
        });

    } catch (error) {
        console.error('Pricing optimization error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});