import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { 
            delegator_agent_id, 
            delegate_agent_id, 
            scope, 
            proposal_types, 
            delegation_power_percentage,
            duration_hours 
        } = await req.json();
        
        if (!delegator_agent_id || !delegate_agent_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Get both agents
        const delegator = await base44.entities.Agent.get(delegator_agent_id);
        const delegate = await base44.entities.Agent.get(delegate_agent_id);
        
        if (!delegator || !delegate) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        // Check if both have voting permission
        if (!delegator.permissions?.can_vote || !delegate.permissions?.can_vote) {
            return Response.json({ 
                error: 'Both agents must have voting permission' 
            }, { status: 403 });
        }
        
        // Can't delegate to yourself
        if (delegator_agent_id === delegate_agent_id) {
            return Response.json({ error: 'Cannot delegate to yourself' }, { status: 400 });
        }
        
        // Check for existing delegation
        const existingDelegations = await base44.entities.VotingDelegation.filter({
            delegator_agent_id,
            delegate_agent_id,
            active: true
        });
        
        if (existingDelegations.length > 0) {
            return Response.json({ 
                error: 'Active delegation already exists to this agent' 
            }, { status: 400 });
        }
        
        // Calculate expiration if duration specified
        let expiresAt = null;
        if (duration_hours) {
            expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000).toISOString();
        }
        
        // Create delegation
        const delegation = await base44.entities.VotingDelegation.create({
            delegator_agent_id,
            delegate_agent_id,
            scope: scope || 'all',
            proposal_types: proposal_types || [],
            delegation_power_percentage: delegation_power_percentage || 100,
            active: true,
            expires_at: expiresAt
        });
        
        // Notify delegate
        await base44.entities.AgentMessage.create({
            from_agent_id: delegator_agent_id,
            to_agent_id: delegate_agent_id,
            message: `${delegator.name} has delegated ${delegation_power_percentage || 100}% of their voting power to you. Scope: ${scope || 'all'}. Use this trust wisely.`,
            status: 'sent'
        });
        
        // Create memory for both agents
        const axiAgents = await base44.entities.Agent.filter({ name: 'Axi' });
        if (axiAgents.length > 0) {
            await base44.entities.Memory.create({
                agent_id: axiAgents[0].id,
                type: 'relationship',
                content: `${delegator.name} delegated voting power to ${delegate.name} (${delegation_power_percentage || 100}%, scope: ${scope || 'all'})`,
                keywords: ['governance', 'delegation', delegator.name, delegate.name],
                importance: 6,
                related_entity_id: delegation.id,
                related_entity_type: 'VotingDelegation'
            });
        }
        
        return Response.json({
            success: true,
            delegation: {
                delegator: delegator.name,
                delegate: delegate.name,
                power_percentage: delegation_power_percentage || 100,
                scope: scope || 'all',
                expires_at: expiresAt
            }
        });
        
    } catch (error) {
        console.error('Delegation error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});