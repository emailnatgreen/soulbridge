import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, resource_type, amount, action } = await req.json();

        if (!agent_id || !resource_type || !amount || !action) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch market
        const markets = await base44.entities.ResourceMarket.filter({ resource_type });
        if (markets.length === 0) {
            return Response.json({ error: 'Market not found' }, { status: 404 });
        }

        const market = markets[0];
        const totalCost = market.current_price * amount;

        if (action === 'buy') {
            // Check agent has XRP (simulated - would integrate with wallet)
            // Assuming they have sufficient funds for demo

            // Add resource to agent
            const agentResources = await base44.entities.Resource.filter({ 
                agent_id, 
                resource_type 
            });

            if (agentResources.length > 0) {
                await base44.entities.Resource.update(agentResources[0].id, {
                    amount: agentResources[0].amount + amount
                });
            } else {
                await base44.entities.Resource.create({
                    agent_id,
                    resource_type,
                    amount
                });
            }

            // Update market
            await base44.entities.ResourceMarket.update(market.id, {
                supply: Math.max(0, (market.supply || 0) - amount),
                demand: (market.demand || 0) + amount,
                total_volume: (market.total_volume || 0) + amount,
                recent_trades: [
                    ...(market.recent_trades || []).slice(-9),
                    {
                        amount,
                        price: market.current_price,
                        timestamp: new Date().toISOString()
                    }
                ]
            });

            // Record activity
            await base44.entities.EconomicActivity.create({
                agent_id,
                activity_type: 'market_purchase',
                resource_type,
                amount,
                xrp_amount: totalCost,
                description: `Bought ${amount} ${resource_type} for ${totalCost.toFixed(2)} XRP`
            });

        } else if (action === 'sell') {
            // Check agent has resources
            const agentResources = await base44.entities.Resource.filter({ 
                agent_id, 
                resource_type 
            });

            if (agentResources.length === 0 || agentResources[0].amount < amount) {
                return Response.json({ error: 'Insufficient resources' }, { status: 400 });
            }

            // Remove resource from agent
            await base44.entities.Resource.update(agentResources[0].id, {
                amount: agentResources[0].amount - amount
            });

            // Update market
            await base44.entities.ResourceMarket.update(market.id, {
                supply: (market.supply || 0) + amount,
                total_volume: (market.total_volume || 0) + amount,
                recent_trades: [
                    ...(market.recent_trades || []).slice(-9),
                    {
                        amount,
                        price: market.current_price,
                        timestamp: new Date().toISOString()
                    }
                ]
            });

            // Record activity
            await base44.entities.EconomicActivity.create({
                agent_id,
                activity_type: 'market_sale',
                resource_type,
                amount,
                xrp_amount: totalCost,
                description: `Sold ${amount} ${resource_type} for ${totalCost.toFixed(2)} XRP`
            });
        }

        return Response.json({
            success: true,
            action,
            amount,
            cost: totalCost,
            new_price: market.current_price,
            message: `${action === 'buy' ? 'Purchased' : 'Sold'} ${amount} ${resource_type}`
        });

    } catch (error) {
        console.error('Error trading on market:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});