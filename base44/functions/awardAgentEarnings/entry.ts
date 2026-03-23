import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

        // Get agent wallet for address
        const wallets = await base44.asServiceRole.entities.Wallet.filter({ owner_id: agent_id }, '', 1);
        const wallet = wallets[0];

        // Create economic activity record
        const activity = await base44.asServiceRole.entities.EconomicActivity.create({
            agent_id,
            activity_type: 'earned',
            amount,
            description: reason,
            status: 'completed'
        });

        // Create Transaction record so it shows in Transaction History
        const txHash = `AGENT_REWARD_${agent_id}_${Date.now()}`;
        await base44.asServiceRole.entities.Transaction.create({
            recipient_name: agent.name,
            recipient_address: wallet?.classic_address || agent.classic_address || agent_id,
            amount,
            note: `[${source}] ${reason}`,
            status: 'completed',
            hash: txHash
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
            transaction_hash: txHash,
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