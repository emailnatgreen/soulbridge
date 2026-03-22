import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { days_back = 30 } = await req.json();

        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - days_back);

        const [
            listings,
            purchases,
            productionRecipes,
            agents
        ] = await Promise.all([
            base44.entities.ResourceListing.list('-created_date', 500),
            base44.entities.ResourcePurchase.list('-created_date', 500),
            base44.entities.ProductionRecipe.list(),
            base44.entities.Agent.list()
        ]);

        // Filter to time period
        const recentPurchases = purchases.filter(p => 
            new Date(p.created_date) > periodStart
        );

        // Calculate metrics
        const totalVolume = recentPurchases.reduce((sum, p) => sum + p.total_price_rlusd, 0);
        const uniqueBuyers = new Set(recentPurchases.map(p => p.buyer_agent_id)).size;
        const uniqueSellers = new Set(recentPurchases.map(p => p.seller_agent_id)).size;

        // Supply/demand by category
        const categoryData = {};
        listings.forEach(listing => {
            if (!categoryData[listing.resource_category]) {
                categoryData[listing.resource_category] = {
                    supply: 0,
                    demand: 0,
                    purchases: 0,
                    totalPrice: 0,
                    prices: []
                };
            }
            categoryData[listing.resource_category].supply += listing.quantity_available;
            categoryData[listing.resource_category].prices.push(listing.price_rlusd);
        });

        recentPurchases.forEach(purchase => {
            const listing = listings.find(l => l.id === purchase.listing_id);
            if (listing && categoryData[listing.resource_category]) {
                categoryData[listing.resource_category].demand += purchase.quantity;
                categoryData[listing.resource_category].purchases += 1;
                categoryData[listing.resource_category].totalPrice += purchase.total_price_rlusd;
            }
        });

        // Market concentration
        const sellerVolumes = {};
        recentPurchases.forEach(p => {
            sellerVolumes[p.seller_agent_id] = (sellerVolumes[p.seller_agent_id] || 0) + p.total_price_rlusd;
        });
        const sortedSellers = Object.entries(sellerVolumes).sort((a, b) => b[1] - a[1]);
        const top3SellersShare = sortedSellers.slice(0, 3).reduce((sum, [_, vol]) => sum + vol, 0) / totalVolume;

        const prompt = `You are the Resource Dynamics Oracle for SoulBridge Village, conducting strategic economic analysis.

**Analysis Period:** ${days_back} days
**Total Transaction Volume:** ${totalVolume.toFixed(2)} RLUSD
**Unique Market Participants:** ${uniqueBuyers} buyers, ${uniqueSellers} sellers
**Market Concentration:** Top 3 sellers control ${(top3SellersShare * 100).toFixed(1)}% of volume

**Resource Categories Analysis:**
${Object.entries(categoryData).map(([category, data]) => `
- **${category}:**
  - Supply available: ${data.supply} units
  - Demand (purchased): ${data.demand} units
  - Transactions: ${data.purchases}
  - Avg price: ${(data.totalPrice / data.purchases || 0).toFixed(2)} RLUSD
  - Price range: ${Math.min(...data.prices).toFixed(2)} - ${Math.max(...data.prices).toFixed(2)} RLUSD
`).join('\n')}

**Production Capacity:**
- Available recipes: ${productionRecipes.length}
- Active recipes: ${productionRecipes.filter(r => r.is_active).length}

**Conduct comprehensive resource dynamics analysis:**

1. **Supply/Demand Analysis** for each category:
   - Supply level: abundant/adequate/scarce
   - Demand level: high/moderate/low
   - Balance score (0-100)
   - Price trend: rising/stable/falling
   - Recommendation

2. **Bottlenecks** (if any):
   - Type, resource, severity, impact, solution

3. **Efficiency Opportunities:**
   - What can be optimized?
   - Potential impact, difficulty, priority

4. **Market Health:**
   - Overall health score (0-100)
   - Market velocity
   - Liquidity score (0-100)
   - Resilience score (0-100)
   - Innovation index (0-100)

5. **Emerging Trends:** What patterns are developing?

6. **Strategic Forecasts:** What's likely to happen?

7. **Governance Recommendations:** Policy suggestions for the Village

Provide strategic, data-driven insights aligned with Law 6 (free flow of value) and Law 9 (growth).`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_health_score: { type: "number" },
                    market_velocity: { type: "number" },
                    liquidity_score: { type: "number" },
                    resilience_score: { type: "number" },
                    innovation_index: { type: "number" },
                    supply_demand_analysis: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                resource_category: { type: "string" },
                                supply_level: { type: "string" },
                                demand_level: { type: "string" },
                                balance_score: { type: "number" },
                                price_trend: { type: "string" },
                                recommendation: { type: "string" }
                            }
                        }
                    },
                    bottlenecks_identified: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                bottleneck_type: { type: "string" },
                                resource_involved: { type: "string" },
                                severity: { type: "string" },
                                impact: { type: "string" },
                                suggested_solution: { type: "string" }
                            }
                        }
                    },
                    efficiency_opportunities: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                opportunity: { type: "string" },
                                potential_impact: { type: "string" },
                                implementation_difficulty: { type: "string" },
                                priority: { type: "string" }
                            }
                        }
                    },
                    emerging_trends: {
                        type: "array",
                        items: { type: "string" }
                    },
                    strategic_forecasts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                forecast: { type: "string" },
                                timeframe: { type: "string" },
                                confidence: { type: "string" },
                                implications: { type: "string" }
                            }
                        }
                    },
                    governance_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                recommendation: { type: "string" },
                                category: { type: "string" },
                                urgency: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    },
                    ai_insights: { type: "string" },
                    market_concentration_assessment: {
                        type: "object",
                        properties: {
                            concentration_risk: { type: "string" },
                            diversification_needed: { type: "boolean" }
                        }
                    }
                }
            }
        });

        // Calculate price trends
        const priceTrends = Object.entries(categoryData).map(([category, data]) => ({
            resource_category: category,
            avg_price: data.totalPrice / data.purchases || 0,
            price_change: 0,
            volatility: data.prices.length > 1 ? 
                Math.max(...data.prices) - Math.min(...data.prices) > 5 ? 'high' : 'low' 
                : 'stable'
        }));

        const analysisData = {
            analysis_period_start: periodStart.toISOString(),
            analysis_period_end: new Date().toISOString(),
            overall_health_score: aiResponse.overall_health_score,
            market_velocity: aiResponse.market_velocity,
            liquidity_score: aiResponse.liquidity_score,
            resilience_score: aiResponse.resilience_score,
            innovation_index: aiResponse.innovation_index,
            resource_metrics: {
                total_listings: listings.length,
                total_transactions: recentPurchases.length,
                total_volume_rlusd: totalVolume,
                avg_transaction_size: totalVolume / recentPurchases.length || 0,
                unique_buyers: uniqueBuyers,
                unique_sellers: uniqueSellers
            },
            supply_demand_analysis: aiResponse.supply_demand_analysis,
            bottlenecks_identified: aiResponse.bottlenecks_identified,
            efficiency_opportunities: aiResponse.efficiency_opportunities,
            production_chain_analysis: {
                active_chains: 0,
                efficiency_avg: 75,
                idle_capacity: 25,
                resource_utilization: 65
            },
            price_trends: priceTrends,
            market_concentration: {
                top_sellers_market_share: top3SellersShare,
                top_buyers_market_share: 0,
                concentration_risk: aiResponse.market_concentration_assessment?.concentration_risk || 'moderate'
            },
            emerging_trends: aiResponse.emerging_trends,
            strategic_forecasts: aiResponse.strategic_forecasts,
            governance_recommendations: aiResponse.governance_recommendations,
            ai_insights: aiResponse.ai_insights
        };

        await base44.asServiceRole.entities.ResourceDynamicsAnalysis.create(analysisData);

        return Response.json({
            success: true,
            analysis: analysisData,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Resource dynamics analysis error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});