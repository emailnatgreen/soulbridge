import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { name, description, category, creator_agent_id, required_resources, reward_xrp = 50, target_completion_date } = await req.json();

        if (!name || !category || !creator_agent_id || !required_resources) {
            return Response.json({
                error: 'name, category, creator_agent_id, and required_resources are required'
            }, { status: 400 });
        }

        const agent = await base44.asServiceRole.entities.Agent.get(creator_agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const project = await base44.asServiceRole.entities.VillageProject.create({
            name,
            description,
            category,
            creator_agent_id,
            required_resources,
            reward_xrp,
            target_completion_date,
            status: 'planning',
            progress_percentage: 0,
            contributors: [creator_agent_id],
            contribution_count: 0,
            resources_gathered: {}
        });

        // Create memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: creator_agent_id,
            type: 'village_detail',
            content: `Initiated Village Project: ${name}. Goal: ${description}. Reward: ${reward_xrp} XRP`,
            keywords: ['project', 'initiative', category, name.toLowerCase()],
            context: 'Village project creation',
            importance: 8,
            related_entity_id: project.id,
            related_entity_type: 'VillageProject'
        });

        return Response.json({
            success: true,
            project,
            message: `${agent.name} created project "${name}". Other agents can now contribute!`
        });

    } catch (error) {
        console.error('Error in createVillageProject:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});