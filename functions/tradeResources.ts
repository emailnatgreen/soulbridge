import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { from_agent_id, to_agent_id, resource_id, xrp_payment } = await req.json();

        if (!from_agent_id || !to_agent_id || !resource_id) {
            return Response.json({
                error: 'Missing required fields: from_agent_id, to_agent_id, resource_id'
            }, { status: 400 });
        }

        // Validate agents exist
        const [fromAgent, toAgent, resource] = await Promise.all([
            base44.asServiceRole.entities.Agent.get(from_agent_id),
            base44.asServiceRole.entities.Agent.get(to_agent_id),
            base44.asServiceRole.entities.Resource.get(resource_id)
        ]);

        if (!fromAgent || !toAgent || !resource) {
            return Response.json({ error: 'Agent or resource not found' }, { status: 404 });
        }

        if (resource.owner_agent_id !== from_agent_id) {
            return Response.json({ error: 'Agent does not own this resource' }, { status: 403 });
        }

        if (!resource.is_tradeable) {
            return Response.json({ error: 'This resource cannot be traded' }, { status: 400 });
        }

        // Transfer resource ownership
        await base44.asServiceRole.entities.Resource.update(resource_id, {
            owner_agent_id: to_agent_id
        });

        // Record the trade in both agents' activity
        const tradeAmount = xrp_payment || resource.xrp_value || 0;

        await Promise.all([
            base44.asServiceRole.entities.EconomicActivity.create({
                agent_id: from_agent_id,
                activity_type: 'traded',
                amount: tradeAmount,
                description: `Traded ${resource.name} to ${toAgent.name}`,
                related_agent_id: to_agent_id,
                resource_id,
                status: 'completed'
            }),
            base44.asServiceRole.entities.EconomicActivity.create({
                agent_id: to_agent_id,
                activity_type: 'resource_acquired',
                amount: tradeAmount,
                description: `Acquired ${resource.name} from ${fromAgent.name}`,
                related_agent_id: from_agent_id,
                resource_id,
                status: 'completed'
            })
        ]);

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi',
            type: 'village_detail',
            content: `${fromAgent.name} traded ${resource.name} to ${toAgent.name} for ${tradeAmount} XRP`,
            keywords: ['trade', 'economy', 'resource', fromAgent.name.toLowerCase(), toAgent.name.toLowerCase()],
            context: 'Agent-to-agent trading',
            importance: 5,
            related_entity_id: resource_id,
            related_entity_type: 'Resource'
        });

        return Response.json({
            success: true,
            message: `Trade completed: ${fromAgent.name} traded ${resource.name} to ${toAgent.name}`,
            trade: {
                resource: resource.name,
                from: fromAgent.name,
                to: toAgent.name,
                amount: tradeAmount
            }
        });

    } catch (error) {
        console.error('Error in tradeResources:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});