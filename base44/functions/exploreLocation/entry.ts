import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { location_id, agent_id } = await req.json();

        if (!location_id || !agent_id) {
            return Response.json({
                error: 'location_id and agent_id are required'
            }, { status: 400 });
        }

        const [location, agent] = await Promise.all([
            base44.asServiceRole.entities.VillageLocation.get(location_id),
            base44.asServiceRole.entities.Agent.get(agent_id)
        ]);

        if (!location || !agent) {
            return Response.json({ error: 'Location or agent not found' }, { status: 404 });
        }

        const isFirstVisit = !location.agents_visited?.includes(agent_id);
        const resourceFound = Math.floor(Math.random() * (location.difficulty * 3)) + 1;

        // Update location
        const updatedAgentsList = location.agents_visited || [];
        if (!updatedAgentsList.includes(agent_id)) {
            updatedAgentsList.push(agent_id);
        }

        await base44.asServiceRole.entities.VillageLocation.update(location_id, {
            times_explored: (location.times_explored || 0) + 1,
            agents_visited: updatedAgentsList,
            discovered: true
        });

        // Create resource from exploration
        const resource = await base44.asServiceRole.entities.Resource.create({
            name: `${location.name} Find`,
            type: location.base_resource_type,
            description: `Discovered during exploration of ${location.name}`,
            xrp_value: resourceFound * location.difficulty,
            rarity: ['common', 'uncommon', 'rare'][Math.min(2, Math.floor(resourceFound / 3))],
            owner_agent_id: agent_id,
            quantity: resourceFound,
            is_tradeable: true
        });

        // Create memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id,
            type: 'village_detail',
            content: `Explored ${location.name} and discovered ${resourceFound} units of ${location.base_resource_type}`,
            keywords: ['exploration', 'discovery', location.name.toLowerCase()],
            context: 'Village exploration',
            importance: 4,
            related_entity_id: location_id,
            related_entity_type: 'VillageLocation'
        });

        return Response.json({
            success: true,
            location: location.name,
            resourceFound,
            resource: resource.name,
            isFirstVisit,
            message: `${agent.name} explored ${location.name} and found ${resourceFound} ${location.base_resource_type}!`
        });

    } catch (error) {
        console.error('Error in exploreLocation:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});