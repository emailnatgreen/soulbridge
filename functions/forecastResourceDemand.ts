import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Gather comprehensive marketplace data
        const [listings, purchases, projects, agents] = await Promise.all([
            base44.entities.ResourceListing.list('-created_date', 500),
            base44.entities.ResourcePurchase.list('-created_date', 1000),
            base44.entities.AIProject.list('-created_date', 100),
            base44.entities.Agent.list()
        ]);

        // Analyze by category
        const categories = [
            'raw_material', 'processed_material', 'tool', 'dataset', 
            'api_access', 'compute_power', 'software_license', 
            'research_output', 'design_asset', 'knowledge_package'
        ];

        const categoryData = categories.map(category => {
            const categoryListings = listings.filter(l => l.resource_category === category);
            const categoryPurchases = purchases.filter(p => {
                const listing = listings.find(l => l.id === p.listing_id);
                return listing?.resource_category === category;
            });

            const totalSupply = categoryListings.reduce((sum, l) => sum + (l.quantity_available || 0), 0);
            const totalSales = categoryPurchases.reduce((sum, p) => sum + p.quantity, 0);
            const totalRevenue = categoryPurchases.reduce((sum, p) => sum + p.total_price_rlusd, 0);
            const avgPrice = categoryListings.length > 0
                ? categoryListings.reduce((sum, l) => sum + l.price_rlusd, 0) / categoryListings.length
                : 0;

            return {
                category,
                supply: totalSupply,
                sales_volume: totalSales,
                revenue: totalRevenue,
                avg_price: avgPrice,
                num_listings: categoryListings.length,
                num_purchases: categoryPurchases.length
            };
        });

        // Active project analysis
        const activeProjects = projects.filter(p => 
            ['active', 'recruiting', 'planning'].includes(p.status)
        );

        const projectNeeds = activeProjects.flatMap(p => 
            (p.required_skills || []).map(skill => ({
                project_id: p.id,
                skill
            }))
        );

        // AI-powered demand forecasting
        const prompt = `You are an AI market analyst for the SoulBridge Village resource marketplace.

**Current Market State:**
${JSON.stringify(categoryData, null, 2)}

**Active Projects:** ${activeProjects.length}
**Total Agents:** ${agents.length}

**Project Skill Requirements:**
${JSON.stringify(projectNeeds.slice(0, 50), null, 2)}

**Task:**
Analyze this marketplace data and forecast demand for the next 30 days.

Consider:
1. Current supply vs sales velocity
2. Active project requirements
3. Agent growth trends
4. Category saturation
5. Emerging needs based on project types

Provide forecasts for each category with:
- demand_trend: rising/stable/declining
- confidence: 0-100
- projected_purchases: estimated number in next 30 days
- shortage_risk: low/medium/high
- opportunity_score: 0-100 (for sellers)
- key_drivers: What's driving demand

Also identify:
- hottest_categories: Top 3 categories with highest opportunity
- emerging_needs: New resource types that should be listed
- market_gaps: Underserved demand areas`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    category_forecasts: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                category: { type: "string" },
                                demand_trend: { type: "string" },
                                confidence: { type: "number" },
                                projected_purchases: { type: "number" },
                                shortage_risk: { type: "string" },
                                opportunity_score: { type: "number" },
                                key_drivers: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    hottest_categories: {
                        type: "array",
                        items: { type: "string" }
                    },
                    emerging_needs: {
                        type: "array",
                        items: { type: "string" }
                    },
                    market_gaps: {
                        type: "array",
                        items: { type: "string" }
                    },
                    overall_market_health: { type: "string" },
                    strategic_insights: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            forecast: aiResponse,
            market_snapshot: {
                total_listings: listings.length,
                total_purchases: purchases.length,
                total_revenue: purchases.reduce((sum, p) => sum + p.total_price_rlusd, 0),
                active_projects: activeProjects.length,
                total_agents: agents.length
            },
            category_data: categoryData,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Demand forecasting error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});