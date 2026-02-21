import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all active production chains
        const activeChains = await base44.entities.ProductionChain.filter({
            status: 'active'
        });

        const now = new Date();
        const processed = [];

        for (const chain of activeChains) {
            const nextCycle = new Date(chain.next_cycle_at);
            
            // Check if cycle is ready
            if (now >= nextCycle) {
                // Get recipe
                const recipe = await base44.entities.ProductionRecipe.get(chain.recipe_id);
                if (!recipe) continue;

                // Calculate output quantities with efficiency
                const outputs = recipe.outputs.map(output => ({
                    ...output,
                    actual_quantity: Math.floor(output.quantity * (chain.efficiency || 1))
                }));

                // Add outputs to agent's resources
                for (const output of outputs) {
                    // Find existing resource or create new
                    const existingResources = await base44.entities.Resource.filter({
                        agent_id: chain.agent_id,
                        resource_category: output.resource_category,
                        resource_name: output.resource_name
                    });

                    if (existingResources.length > 0) {
                        const existing = existingResources[0];
                        await base44.asServiceRole.entities.Resource.update(existing.id, {
                            amount: existing.amount + output.actual_quantity
                        });
                    } else {
                        await base44.asServiceRole.entities.Resource.create({
                            agent_id: chain.agent_id,
                            resource_category: output.resource_category,
                            resource_name: output.resource_name,
                            amount: output.actual_quantity,
                            location: 'inventory'
                        });
                    }
                }

                // Update production chain
                const newCyclesCompleted = chain.cycles_completed + 1;
                const isComplete = newCyclesCompleted >= chain.cycles_planned;

                const updateData = {
                    cycles_completed: newCyclesCompleted,
                    total_produced: (chain.total_produced || 0) + outputs.reduce((sum, o) => sum + o.actual_quantity, 0),
                    outputs_produced: {
                        ...chain.outputs_produced,
                        [recipe.outputs[0].resource_name]: (chain.outputs_produced?.[recipe.outputs[0].resource_name] || 0) + outputs[0].actual_quantity
                    }
                };

                if (isComplete) {
                    updateData.status = 'completed';
                    updateData.completed_at = new Date().toISOString();
                    
                    // Notify completion
                    await base44.asServiceRole.functions.invoke('sendNotification', {
                        recipient_agent_id: chain.agent_id,
                        notification_type: 'system',
                        title: 'Production Complete',
                        message: `${recipe.recipe_name} production finished. Produced ${updateData.total_produced} units.`,
                        related_entity_type: 'ProductionChain',
                        related_entity_id: chain.id,
                        priority: 'normal'
                    });
                } else {
                    updateData.next_cycle_at = new Date(
                        now.getTime() + recipe.cycle_duration_hours * 60 * 60 * 1000
                    ).toISOString();
                }

                await base44.asServiceRole.entities.ProductionChain.update(chain.id, updateData);

                processed.push({
                    chain_id: chain.id,
                    recipe: recipe.recipe_name,
                    outputs,
                    completed: isComplete
                });
            }
        }

        return Response.json({
            success: true,
            processed_count: processed.length,
            processed_chains: processed
        });

    } catch (error) {
        console.error('Process production error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});