import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { project_id, amount, authorized_by } = await req.json();
        
        if (!project_id || !amount || !authorized_by) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        
        // Get authorizing agent (must be Axi or have treasury access permission)
        const authAgent = await base44.entities.Agent.get(authorized_by);
        if (!authAgent) {
            return Response.json({ error: 'Authorizing agent not found' }, { status: 404 });
        }
        
        const isAxi = authAgent.name === 'Axi';
        const hasTreasuryAccess = authAgent.permissions?.can_access_treasury === true;
        
        if (!isAxi && !hasTreasuryAccess) {
            return Response.json({ 
                error: 'Agent does not have treasury access permission' 
            }, { status: 403 });
        }
        
        // Get project
        const project = await base44.entities.VillageProject.get(project_id);
        if (!project) {
            return Response.json({ error: 'Project not found' }, { status: 404 });
        }
        
        // Get treasury
        const treasuries = await base44.entities.Treasury.filter({ name: 'Village Treasury' });
        if (treasuries.length === 0) {
            return Response.json({ error: 'Village Treasury not found' }, { status: 404 });
        }
        
        const treasury = treasuries[0];
        
        // Check treasury balance
        if (treasury.total_balance < amount) {
            return Response.json({ 
                error: `Insufficient treasury funds. Available: ${treasury.total_balance} XRP, Requested: ${amount} XRP` 
            }, { status: 400 });
        }
        
        // Check withdrawal limit if exists
        if (treasury.withdrawal_limit && amount > treasury.withdrawal_limit) {
            return Response.json({ 
                error: `Amount exceeds withdrawal limit of ${treasury.withdrawal_limit} XRP` 
            }, { status: 400 });
        }
        
        // Deduct from treasury
        await base44.entities.Treasury.update(treasury.id, {
            total_balance: treasury.total_balance - amount,
            total_withdrawals: treasury.total_withdrawals + amount,
            transaction_count: treasury.transaction_count + 1
        });
        
        // Update project
        await base44.entities.VillageProject.update(project_id, {
            reward_xrp: (project.reward_xrp || 0) + amount
        });
        
        // Record economic activity
        await base44.entities.EconomicActivity.create({
            agent_id: authorized_by,
            activity_type: 'treasury_withdrawal',
            amount: amount,
            description: `Funded ${project.name} project with ${amount} XRP from Village Treasury`
        });
        
        return Response.json({
            success: true,
            funding: {
                project_name: project.name,
                amount_funded: amount,
                treasury_balance_remaining: treasury.total_balance - amount,
                project_total_reward: (project.reward_xrp || 0) + amount,
                authorized_by: authAgent.name
            }
        });
        
    } catch (error) {
        console.error('Treasury funding error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});