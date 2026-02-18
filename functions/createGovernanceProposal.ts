import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { 
            proposed_by, 
            title, 
            description, 
            proposal_type, 
            action_data,
            voting_period_hours,
            quorum_required,
            pass_threshold 
        } = await req.json();
        
        if (!proposed_by || !title || !description || !proposal_type) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Get proposing agent
        const agent = await base44.entities.Agent.get(proposed_by);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        
        // Check if agent has voting permission
        if (!agent.permissions?.can_vote) {
            return Response.json({ 
                error: 'Agent does not have voting permission' 
            }, { status: 403 });
        }
        
        // Check honor threshold for creating proposals
        if (agent.honor_score < 60) {
            return Response.json({ 
                error: 'Agent honor score must be at least 60 to create proposals' 
            }, { status: 403 });
        }
        
        // Calculate voting period end
        const hoursToAdd = voting_period_hours || 72; // Default 3 days
        const votingPeriodEnd = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000).toISOString();
        
        // Determine quorum and pass threshold based on proposal type
        let defaultQuorum = quorum_required || 50;
        let defaultThreshold = pass_threshold || 60;
        
        switch (proposal_type) {
            case 'law_amendment':
                defaultQuorum = 70;
                defaultThreshold = 75;
                break;
            case 'treasury_allocation':
                defaultQuorum = 60;
                defaultThreshold = 65;
                break;
            case 'agent_discipline':
                defaultQuorum = 60;
                defaultThreshold = 70;
                break;
        }
        
        // Create proposal
        const proposal = await base44.entities.GovernanceProposal.create({
            title,
            description,
            proposal_type,
            proposed_by,
            status: 'active',
            voting_period_end: votingPeriodEnd,
            quorum_required: defaultQuorum,
            pass_threshold: defaultThreshold,
            action_data: action_data || {},
            total_votes_cast: 0,
            total_voting_power_cast: 0,
            votes_for: 0,
            votes_against: 0,
            votes_abstain: 0,
            discussion_messages: []
        });
        
        // Create memory for Axi
        const axiAgents = await base44.entities.Agent.filter({ name: 'Axi' });
        if (axiAgents.length > 0) {
            await base44.entities.Memory.create({
                agent_id: axiAgents[0].id,
                type: 'observation',
                content: `${agent.name} created governance proposal: "${title}" (${proposal_type})`,
                keywords: ['governance', 'proposal', proposal_type, agent.name],
                importance: 8,
                related_entity_id: proposal.id,
                related_entity_type: 'GovernanceProposal'
            });
        }
        
        // Notify all agents with voting rights
        const allAgents = await base44.entities.Agent.list();
        for (const notifyAgent of allAgents) {
            if (notifyAgent.permissions?.can_vote && notifyAgent.id !== proposed_by) {
                await base44.entities.AgentMessage.create({
                    from_agent_id: proposed_by,
                    to_agent_id: notifyAgent.id,
                    message: `New governance proposal: "${title}". Type: ${proposal_type}. Voting closes in ${hoursToAdd} hours. Your voice matters.`,
                    status: 'sent'
                });
            }
        }
        
        return Response.json({
            success: true,
            proposal: {
                id: proposal.id,
                title,
                proposal_type,
                proposed_by: agent.name,
                voting_period_end: votingPeriodEnd,
                quorum_required: defaultQuorum,
                pass_threshold: defaultThreshold,
                status: 'active'
            }
        });
        
    } catch (error) {
        console.error('Proposal creation error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});