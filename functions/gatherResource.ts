import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { agent_id, node_id } = await req.json();
        
        if (!agent_id || !node_id) {
            return Response.json({ error: 'agent_id and node_id required' }, { status: 400 });
        }
        
        // Get agent and node
        const agent = await base44.entities.Agent.get(agent_id);
        const node = await base44.entities.ResourceNode.get(node_id);
        
        if (!agent || !node) {
            return Response.json({ error: 'Agent or node not found' }, { status: 404 });
        }
        
        // Get agent state
        const agentStates = await base44.entities.AgentState.filter({ agent_id });
        const agentState = agentStates[0];
        
        if (!agentState) {
            return Response.json({ error: 'Agent state not found' }, { status: 404 });
        }
        
        // Check if agent has enough energy
        if (agentState.energy < 20) {
            return Response.json({ 
                success: false, 
                error: 'Insufficient energy to gather resources' 
            }, { status: 400 });
        }
        
        // Check node abundance
        if (node.abundance < 10) {
            return Response.json({ 
                success: false, 
                error: 'Resource node is depleted' 
            }, { status: 400 });
        }
        
        // Calculate yield based on agent wisdom and node difficulty
        const wisdomBonus = Math.floor(agentState.wisdom / 10);
        const baseYield = node.yield_per_gather;
        const actualYield = Math.floor(baseYield * (1 + wisdomBonus / 10) / node.difficulty);
        
        // Deduct from node abundance
        const abundanceReduction = Math.min(node.abundance, 10 + node.difficulty * 2);
        
        // Create or update resource for agent
        const existingResources = await base44.entities.Resource.filter({
            owner_agent_id: agent_id,
            type: node.resource_type
        });
        
        let resource;
        if (existingResources.length > 0) {
            resource = existingResources[0];
            await base44.entities.Resource.update(resource.id, {
                quantity: resource.quantity + actualYield
            });
        } else {
            resource = await base44.entities.Resource.create({
                name: node.resource_type,
                type: 'resource',
                description: `${node.resource_type} gathered from ${node.name}`,
                xrp_value: getResourceValue(node.resource_type),
                rarity: 'common',
                owner_agent_id: agent_id,
                quantity: actualYield,
                is_tradeable: true,
                metadata: { resource_subtype: node.resource_type }
            });
        }
        
        // Update node
        await base44.entities.ResourceNode.update(node_id, {
            abundance: node.abundance - abundanceReduction,
            last_gathered_by: agent_id,
            last_gathered_tick: Date.now(),
            total_gathered: (node.total_gathered || 0) + actualYield
        });
        
        // Update agent state (consume energy, gain experience)
        await base44.entities.AgentState.update(agentState.id, {
            energy: agentState.energy - 15,
            experience: agentState.experience + 5,
            current_activity: 'gathering'
        });
        
        // Record economic activity
        await base44.entities.EconomicActivity.create({
            agent_id,
            activity_type: 'resource_acquired',
            amount: 0,
            description: `Gathered ${actualYield} ${node.resource_type} from ${node.name}`,
            resource_id: resource.id
        });
        
        return Response.json({
            success: true,
            resource_gathered: {
                type: node.resource_type,
                amount: actualYield,
                node_name: node.name
            },
            node_abundance_remaining: node.abundance - abundanceReduction,
            agent_energy_remaining: agentState.energy - 15
        });
        
    } catch (error) {
        console.error('Resource gathering error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});

function getResourceValue(resourceType) {
    const values = {
        lumber: 0.5,
        stone: 0.8,
        food: 0.3,
        water: 0.2,
        metal: 1.5,
        crystal: 3.0,
        herb: 1.0
    };
    return values[resourceType] || 0.5;
}