import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, limit = 10 } = await req.json();

        // Get agent profile and context
        const agent = await base44.entities.Agent.get(agent_id);
        const activeProjects = await base44.entities.AIProject.filter({ 
            team_members: { $elemMatch: { agent_id } },
            status: { $in: ['active', 'recruiting', 'planning'] }
        });
        const pastPurchases = await base44.entities.ResourcePurchase.filter({ 
            buyer_agent_id: agent_id 
        });
        const allListings = await base44.entities.ResourceListing.filter({
            status: { $in: ['available', 'low_stock'] }
        });

        // Build AI context
        const agentContext = {
            name: agent.name,
            role: agent.role,
            specializations: agent.specializations || [],
            core_skills: agent.core_skills?.map(s => s.name) || [],
            active_projects: activeProjects.map(p => ({
                title: p.title,
                required_skills: p.required_skills,
                status: p.status
            })),
            past_purchases: pastPurchases.map(p => ({
                listing_id: p.listing_id,
                quantity: p.quantity
            }))
        };

        const availableResources = allListings.map(l => ({
            id: l.id,
            name: l.resource_name,
            category: l.resource_category,
            description: l.description,
            price: l.price_rlusd,
            quantity: l.quantity_available,
            tags: l.tags || []
        }));

        // AI-powered recommendation
        const prompt = `You are an AI advisor for the SoulBridge Village resource marketplace.

**Agent Profile:**
${JSON.stringify(agentContext, null, 2)}

**Available Resources:**
${JSON.stringify(availableResources, null, 2)}

Analyze this agent's profile, skills, active projects, and past purchase patterns. Recommend the top ${limit} resources that would be most valuable for them RIGHT NOW.

Consider:
1. Project requirements vs available resources
2. Skill development opportunities
3. Resource complementarity (resources that work well together)
4. Past purchasing patterns
5. Role-specific needs

For each recommendation, provide:
- resource_id (from available resources)
- relevance_score (0-100)
- reasoning (why this is valuable for THIS agent)
- use_case (specific way they could use it)
- urgency (low/medium/high)`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                resource_id: { type: "string" },
                                relevance_score: { type: "number" },
                                reasoning: { type: "string" },
                                use_case: { type: "string" },
                                urgency: { type: "string" }
                            }
                        }
                    },
                    market_insight: { type: "string" }
                }
            }
        });

        // Enrich recommendations with full resource data
        const enrichedRecommendations = aiResponse.recommendations.map(rec => {
            const resource = allListings.find(l => l.id === rec.resource_id);
            return {
                ...rec,
                resource
            };
        }).filter(r => r.resource); // Filter out any invalid IDs

        return Response.json({
            success: true,
            recommendations: enrichedRecommendations,
            market_insight: aiResponse.market_insight,
            agent_context: {
                active_projects_count: activeProjects.length,
                specializations: agent.specializations
            }
        });

    } catch (error) {
        console.error('Recommendation error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});