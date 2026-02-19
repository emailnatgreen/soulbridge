import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Fetch all economy data
        const [resources, agents, productionChains, markets, resourceNodes] = await Promise.all([
            base44.entities.Resource.list(),
            base44.entities.Agent.list(),
            base44.entities.ProductionChain.list(),
            base44.entities.ResourceMarket.list(),
            base44.entities.ResourceNode.list()
        ]);

        const updates = [];
        const activities = [];

        // 1. Process production chains
        for (const chain of productionChains.filter(c => c.status === 'active')) {
            const agentResources = resources.filter(r => r.agent_id === chain.agent_id);
            
            // Check if agent has required inputs
            let canProduce = true;
            for (const [resourceType, amount] of Object.entries(chain.input_resources)) {
                const agentResource = agentResources.find(r => r.resource_type === resourceType);
                if (!agentResource || agentResource.amount < amount) {
                    canProduce = false;
                    await base44.entities.ProductionChain.update(chain.id, {
                        status: 'insufficient_resources'
                    });
                    break;
                }
            }

            if (canProduce) {
                // Consume inputs
                for (const [resourceType, amount] of Object.entries(chain.input_resources)) {
                    const agentResource = agentResources.find(r => r.resource_type === resourceType);
                    await base44.entities.Resource.update(agentResource.id, {
                        amount: agentResource.amount - amount
                    });
                }

                // Produce output
                const outputAmount = chain.output_amount * (chain.efficiency || 1) * (1 + (chain.skill_bonus || 0));
                const existingOutput = agentResources.find(r => r.resource_type === chain.output_resource);
                
                if (existingOutput) {
                    await base44.entities.Resource.update(existingOutput.id, {
                        amount: existingOutput.amount + outputAmount
                    });
                } else {
                    await base44.entities.Resource.create({
                        agent_id: chain.agent_id,
                        resource_type: chain.output_resource,
                        amount: outputAmount
                    });
                }

                await base44.entities.ProductionChain.update(chain.id, {
                    total_produced: (chain.total_produced || 0) + outputAmount
                });

                activities.push({
                    type: 'production',
                    agent_id: chain.agent_id,
                    resource: chain.output_resource,
                    amount: outputAmount
                });
            }
        }

        // 2. Resource consumption (maintenance costs)
        const activeAgents = agents.filter(a => a.status === 'active');
        for (const agent of activeAgents) {
            const agentResources = resources.filter(r => r.agent_id === agent.id);
            
            // Basic needs: 1 food, 1 water per tick
            const food = agentResources.find(r => r.resource_type === 'food');
            const water = agentResources.find(r => r.resource_type === 'water');
            
            if (food && food.amount >= 1) {
                await base44.entities.Resource.update(food.id, {
                    amount: food.amount - 1
                });
            } else {
                // Penalty for no food
                const agentStates = await base44.entities.AgentState.filter({ agent_id: agent.id });
                if (agentStates.length > 0) {
                    await base44.entities.AgentState.update(agentStates[0].id, {
                        energy: Math.max(0, (agentStates[0].energy || 80) - 5)
                    });
                }
            }

            if (water && water.amount >= 1) {
                await base44.entities.Resource.update(water.id, {
                    amount: water.amount - 1
                });
            }

            activities.push({
                type: 'consumption',
                agent_id: agent.id,
                consumed: { food: 1, water: 1 }
            });
        }

        // 3. Resource node regeneration
        for (const node of resourceNodes) {
            if (node.abundance < 100) {
                const newAbundance = Math.min(100, node.abundance + (node.regeneration_rate || 5));
                await base44.entities.ResourceNode.update(node.id, {
                    abundance: newAbundance
                });
            }
        }

        // 4. Update market prices based on supply/demand
        for (const market of markets) {
            const totalSupply = resources
                .filter(r => r.resource_type === market.resource_type)
                .reduce((sum, r) => sum + r.amount, 0);

            // Simple price calculation based on supply
            const supplyRatio = totalSupply / (market.supply || 1);
            let priceMultiplier = 1;
            
            if (supplyRatio < 0.5) {
                priceMultiplier = 2.0; // Scarcity drives prices up
            } else if (supplyRatio > 2) {
                priceMultiplier = 0.6; // Abundance drives prices down
            }

            const newPrice = market.base_price * priceMultiplier;
            const trend = newPrice > market.current_price ? 'rising' : 
                         newPrice < market.current_price ? 'falling' : 'stable';

            await base44.entities.ResourceMarket.update(market.id, {
                current_price: newPrice,
                supply: totalSupply,
                price_trend: trend,
                last_updated: new Date().toISOString()
            });

            updates.push({
                resource: market.resource_type,
                old_price: market.current_price,
                new_price: newPrice,
                trend
            });
        }

        // 5. Record economic activity
        await base44.entities.EconomicActivity.create({
            activity_type: 'economy_simulation',
            amount: 0,
            description: `Economy tick: ${activities.length} activities, ${updates.length} price updates`,
            metadata: {
                production_count: activities.filter(a => a.type === 'production').length,
                consumption_count: activities.filter(a => a.type === 'consumption').length,
                price_updates: updates
            }
        });

        return Response.json({
            success: true,
            activities_processed: activities.length,
            production_cycles: activities.filter(a => a.type === 'production').length,
            price_updates: updates,
            message: 'Economy simulation complete'
        });

    } catch (error) {
        console.error('Error simulating economy:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});