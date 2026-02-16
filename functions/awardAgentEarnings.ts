import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { agent_id, amount, reason, source = 'activity' } = await req.json();

        if (!agent_id || !amount || !reason) {
            return Response.json({
                error: 'Missing required fields: agent_id, amount, reason'
            }, { status: 400 });
        }

        // Fetch the agent
        const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Create economic activity record
        const activity = await base44.asServiceRole.entities.EconomicActivity.create({
            agent_id,
            activity_type: 'earned',
            amount,
            description: reason,
            status: 'completed'
        });

        // Create memory of the earning
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi',
            type: 'village_detail',
            content: `${agent.name} earned ${amount} XRP: ${reason}`,
            keywords: ['earning', 'economy', 'xrp', source, agent.name.toLowerCase()],
            context: 'Agent economic activity',
            importance: 4,
            related_entity_id: agent_id,
            related_entity_type: 'Agent'
        });

        return Response.json({
            success: true,
            activity,
            message: `${agent.name} earned ${amount} XRP for ${reason}`
        });

    } catch (error) {
        console.error('Error in awardAgentEarnings:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});