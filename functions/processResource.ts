import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { agent_id, recipe_type, input_resources } = await req.json();
        
        if (!agent_id || !recipe_type || !input_resources) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        
        // Get agent
        const agent = await base44.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        // Get agent state
        const agentStates = await base44.entities.AgentState.filter({ agent_id });
        const agentState = agentStates[0];
        
        if (!agentState || agentState.energy < 25) {
            return Response.json({ 
                success: false, 
                error: 'Insufficient energy to process resources' 
            }, { status: 400 });
        }
        
        // Define processing recipes
        const recipes = {
            'planks': { inputs: { lumber: 5 }, output: { name: 'planks', type: 'artifact', quantity: 3, value: 2.0 } },
            'bricks': { inputs: { stone: 8 }, output: { name: 'bricks', type: 'artifact', quantity: 4, value: 3.0 } },
            'meal': { inputs: { food: 3, water: 2 }, output: { name: 'meal', type: 'service', quantity: 1, value: 1.5 } },
            'tools': { inputs: { metal: 5, lumber: 3 }, output: { name: 'tools', type: 'artifact', quantity: 1, value: 8.0 } },
            'jewelry': { inputs: { crystal: 2, metal: 1 }, output: { name: 'jewelry', type: 'artifact', quantity: 1, value: 15.0 } },
            'medicine': { inputs: { herb: 4, water: 3 }, output: { name: 'medicine', type: 'service', quantity: 2, value: 5.0 } }
        };
        
        const recipe = recipes[recipe_type];
        if (!recipe) {
            return Response.json({ error: 'Invalid recipe type' }, { status: 400 });
        }
        
        // Check if agent has required resources
        const agentResources = await base44.entities.Resource.filter({ owner_agent_id: agent_id });
        const resourceMap = {};
        
        for (const res of agentResources) {
            const subtype = res.metadata?.resource_subtype || res.name;
            resourceMap[subtype] = res;
        }
        
        // Validate inputs
        for (const [inputType, requiredAmount] of Object.entries(recipe.inputs)) {
            const resource = resourceMap[inputType];
            if (!resource || resource.quantity < requiredAmount) {
                return Response.json({ 
                    success: false, 
                    error: `Insufficient ${inputType}. Need ${requiredAmount}, have ${resource?.quantity || 0}` 
                }, { status: 400 });
            }
        }
        
        // Consume input resources
        for (const [inputType, requiredAmount] of Object.entries(recipe.inputs)) {
            const resource = resourceMap[inputType];
            const newQuantity = resource.quantity - requiredAmount;
            
            if (newQuantity <= 0) {
                await base44.entities.Resource.delete(resource.id);
            } else {
                await base44.entities.Resource.update(resource.id, {
                    quantity: newQuantity
                });
            }
        }
        
        // Create output resource
        const wisdomBonus = Math.floor(agentState.wisdom / 20);
        const outputQuantity = recipe.output.quantity + wisdomBonus;
        
        const outputResource = await base44.entities.Resource.create({
            name: recipe.output.name,
            type: recipe.output.type,
            description: `Processed ${recipe.output.name} crafted by ${agent.name}`,
            xrp_value: recipe.output.value,
            rarity: recipe.output.value > 10 ? 'rare' : 'uncommon',
            owner_agent_id: agent_id,
            quantity: outputQuantity,
            is_tradeable: true,
            metadata: { crafted: true, recipe: recipe_type }
        });
        
        // Update agent state
        await base44.entities.AgentState.update(agentState.id, {
            energy: agentState.energy - 20,
            experience: agentState.experience + 8,
            wisdom: agentState.wisdom + 0.5,
            current_activity: 'creating'
        });
        
        // Record economic activity
        await base44.entities.EconomicActivity.create({
            agent_id,
            activity_type: 'resource_acquired',
            amount: 0,
            description: `Processed ${outputQuantity} ${recipe.output.name} using ${recipe_type} recipe`,
            resource_id: outputResource.id
        });
        
        return Response.json({
            success: true,
            processed: {
                recipe: recipe_type,
                inputs_consumed: recipe.inputs,
                output_created: {
                    name: recipe.output.name,
                    quantity: outputQuantity,
                    value: recipe.output.value
                }
            },
            agent_energy_remaining: agentState.energy - 20
        });
        
    } catch (error) {
        console.error('Resource processing error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});