import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { from_agent_id, to_agent_id, resource_id, quantity, price_xrp } = await req.json();
        
        if (!from_agent_id || !to_agent_id || !resource_id || !quantity) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        
        // Get agents
        const fromAgent = await base44.entities.Agent.get(from_agent_id);
        const toAgent = await base44.entities.Agent.get(to_agent_id);
        
        if (!fromAgent || !toAgent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        // Get resource
        const resource = await base44.entities.Resource.get(resource_id);
        if (!resource) {
            return Response.json({ error: 'Resource not found' }, { status: 404 });
        }
        
        if (resource.owner_agent_id !== from_agent_id) {
            return Response.json({ error: 'Agent does not own this resource' }, { status: 403 });
        }
        
        if (!resource.is_tradeable) {
            return Response.json({ error: 'Resource is not tradeable' }, { status: 400 });
        }
        
        if (resource.quantity < quantity) {
            return Response.json({ error: 'Insufficient resource quantity' }, { status: 400 });
        }
        
        // Calculate trade value (1% goes to village treasury)
        const tradeValue = price_xrp || (resource.xrp_value * quantity);
        const treasuryFee = tradeValue * 0.01;
        const sellerAmount = tradeValue - treasuryFee;
        
        // Update or split resource
        if (resource.quantity === quantity) {
            // Transfer entire resource
            await base44.entities.Resource.update(resource_id, {
                owner_agent_id: to_agent_id
            });
        } else {
            // Split resource
            await base44.entities.Resource.update(resource_id, {
                quantity: resource.quantity - quantity
            });
            
            // Create new resource for buyer
            await base44.entities.Resource.create({
                name: resource.name,
                type: resource.type,
                description: resource.description,
                xrp_value: resource.xrp_value,
                rarity: resource.rarity,
                owner_agent_id: to_agent_id,
                quantity: quantity,
                is_tradeable: resource.is_tradeable,
                metadata: resource.metadata
            });
        }
        
        // Update agent states (strengthen relationship)
        const fromStates = await base44.entities.AgentState.filter({ agent_id: from_agent_id });
        const toStates = await base44.entities.AgentState.filter({ agent_id: to_agent_id });
        
        if (fromStates[0]) {
            const relationships = fromStates[0].relationships || {};
            relationships[to_agent_id] = (relationships[to_agent_id] || 0) + 3;
            await base44.entities.AgentState.update(fromStates[0].id, { relationships });
        }
        
        if (toStates[0]) {
            const relationships = toStates[0].relationships || {};
            relationships[from_agent_id] = (relationships[from_agent_id] || 0) + 3;
            await base44.entities.AgentState.update(toStates[0].id, { relationships });
        }
        
        // Record economic activities
        await base44.entities.EconomicActivity.create({
            agent_id: from_agent_id,
            activity_type: 'resource_sold',
            amount: sellerAmount,
            description: `Sold ${quantity} ${resource.name} to ${toAgent.name} for ${tradeValue} XRP`,
            related_agent_id: to_agent_id,
            resource_id: resource_id
        });
        
        await base44.entities.EconomicActivity.create({
            agent_id: to_agent_id,
            activity_type: 'resource_acquired',
            amount: -tradeValue,
            description: `Purchased ${quantity} ${resource.name} from ${fromAgent.name} for ${tradeValue} XRP`,
            related_agent_id: from_agent_id,
            resource_id: resource_id
        });
        
        // Add to treasury
        const treasuries = await base44.entities.Treasury.filter({ name: 'Village Treasury' });
        if (treasuries.length > 0) {
            const treasury = treasuries[0];
            await base44.entities.Treasury.update(treasury.id, {
                total_balance: treasury.total_balance + treasuryFee,
                total_deposits: treasury.total_deposits + treasuryFee,
                transaction_count: treasury.transaction_count + 1
            });
            
            await base44.entities.EconomicActivity.create({
                agent_id: from_agent_id,
                activity_type: 'treasury_deposit',
                amount: treasuryFee,
                description: `Trade fee from ${resource.name} sale (1%)`
            });
        }
        
        return Response.json({
            success: true,
            trade: {
                resource: resource.name,
                quantity,
                seller: fromAgent.name,
                buyer: toAgent.name,
                price: tradeValue,
                seller_received: sellerAmount,
                treasury_fee: treasuryFee
            }
        });
        
    } catch (error) {
        console.error('Resource trade error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});