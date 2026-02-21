import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { resource_category, days_back = 30 } = await req.json();

        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - days_back);

        const [purchases, listings, agents] = await Promise.all([
            base44.entities.ResourcePurchase.list('-created_date', 500),
            base44.entities.ResourceListing.list(),
            base44.entities.Agent.list()
        ]);

        // Filter relevant purchases
        const relevantPurchases = purchases.filter(p => {
            const listing = listings.find(l => l.id === p.listing_id);
            return listing && 
                   listing.resource_category === resource_category &&
                   new Date(p.created_date) > periodStart;
        });

        // Build flow nodes
        const flowNodes = {};
        agents.forEach(agent => {
            flowNodes[agent.id] = {
                agent_id: agent.id,
                role: agent.role,
                volume_bought: 0,
                volume_sold: 0,
                net_flow: 0
            };
        });

        // Build flow edges
        const flowEdges = {};
        relevantPurchases.forEach(purchase => {
            const edgeKey = `${purchase.seller_agent_id}->${purchase.buyer_agent_id}`;
            
            if (!flowEdges[edgeKey]) {
                flowEdges[edgeKey] = {
                    from_agent_id: purchase.seller_agent_id,
                    to_agent_id: purchase.buyer_agent_id,
                    volume: 0,
                    transaction_count: 0,
                    total_price: 0
                };
            }
            
            flowEdges[edgeKey].volume += purchase.quantity;
            flowEdges[edgeKey].transaction_count += 1;
            flowEdges[edgeKey].total_price += purchase.total_price_rlusd;

            // Update nodes
            if (flowNodes[purchase.buyer_agent_id]) {
                flowNodes[purchase.buyer_agent_id].volume_bought += purchase.quantity;
                flowNodes[purchase.buyer_agent_id].net_flow -= purchase.quantity;
            }
            if (flowNodes[purchase.seller_agent_id]) {
                flowNodes[purchase.seller_agent_id].volume_sold += purchase.quantity;
                flowNodes[purchase.seller_agent_id].net_flow += purchase.quantity;
            }
        });

        // Calculate average prices for edges
        const flowEdgesArray = Object.values(flowEdges).map(edge => ({
            ...edge,
            avg_price: edge.total_price / edge.volume
        }));

        // Identify hubs (high centrality)
        const hubAgents = Object.values(flowNodes)
            .filter(node => node.volume_bought > 0 || node.volume_sold > 0)
            .sort((a, b) => 
                (b.volume_bought + b.volume_sold) - (a.volume_bought + a.volume_sold)
            )
            .slice(0, 5)
            .map((node, idx) => ({
                agent_id: node.agent_id,
                centrality_score: 100 - (idx * 15),
                influence: idx === 0 ? 'critical' : idx < 3 ? 'high' : 'moderate'
            }));

        // Identify isolated agents
        const isolatedAgents = Object.values(flowNodes)
            .filter(node => node.volume_bought === 0 && node.volume_sold === 0)
            .map(node => node.agent_id);

        const totalVolume = Object.values(flowNodes).reduce((sum, n) => 
            sum + n.volume_bought + n.volume_sold, 0
        );
        const activeAgents = Object.values(flowNodes).filter(n => 
            n.volume_bought > 0 || n.volume_sold > 0
        ).length;
        const maxPossibleConnections = activeAgents * (activeAgents - 1);
        const actualConnections = flowEdgesArray.length;
        const networkDensity = maxPossibleConnections > 0 ? 
            actualConnections / maxPossibleConnections : 0;

        const flowEfficiency = Math.min(100, (networkDensity * 100) + 
            (activeAgents / agents.length * 30));

        const flowMapData = {
            time_period: `${periodStart.toISOString()} to ${new Date().toISOString()}`,
            resource_category,
            flow_nodes: Object.values(flowNodes).filter(n => 
                n.volume_bought > 0 || n.volume_sold > 0
            ),
            flow_edges: flowEdgesArray,
            hub_agents: hubAgents,
            isolated_agents: isolatedAgents,
            flow_efficiency: flowEfficiency,
            bottleneck_points: [],
            network_density: networkDensity
        };

        await base44.asServiceRole.entities.ResourceFlowMapping.create(flowMapData);

        return Response.json({
            success: true,
            flow_map: flowMapData,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Flow mapping error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});