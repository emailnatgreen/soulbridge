import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { treasury_id, action, amount, agent_id, reason } = await req.json();

        if (!treasury_id || !action || !amount || !agent_id) {
            return Response.json({
                error: 'Missing required fields: treasury_id, action, amount, agent_id'
            }, { status: 400 });
        }

        if (!['deposit', 'withdraw', 'allocate_reward'].includes(action)) {
            return Response.json({
                error: 'Invalid action. Must be deposit, withdraw, or allocate_reward'
            }, { status: 400 });
        }

        // Fetch treasury and agent
        const [treasury, agent] = await Promise.all([
            base44.asServiceRole.entities.Treasury.get(treasury_id),
            base44.asServiceRole.entities.Agent.get(agent_id)
        ]);

        if (!treasury || !agent) {
            return Response.json({ error: 'Treasury or agent not found' }, { status: 404 });
        }

        // Verify permissions - only manager or admin can modify
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            if (treasury.manager_agent_id !== agent_id) {
                return Response.json({
                    error: 'Only treasury manager or admin can perform this action'
                }, { status: 403 });
            }
        }

        let newBalance = treasury.total_balance;
        let newDeposits = treasury.total_deposits || 0;
        let newWithdrawals = treasury.total_withdrawals || 0;
        let activityType = 'treasury_deposit';

        if (action === 'deposit') {
            newBalance += amount;
            newDeposits += amount;
        } else if (action === 'withdraw') {
            if (newBalance < amount) {
                return Response.json({
                    error: 'Insufficient treasury balance'
                }, { status: 400 });
            }
            if (treasury.withdrawal_limit && amount > treasury.withdrawal_limit) {
                return Response.json({
                    error: `Withdrawal exceeds limit of ${treasury.withdrawal_limit} XRP`
                }, { status: 400 });
            }
            newBalance -= amount;
            newWithdrawals += amount;
            activityType = 'treasury_withdrawal';
        } else if (action === 'allocate_reward') {
            if (newBalance < amount) {
                return Response.json({
                    error: 'Insufficient treasury balance for reward'
                }, { status: 400 });
            }
            newBalance -= amount;
            newWithdrawals += amount;
        }

        // Update treasury
        await base44.asServiceRole.entities.Treasury.update(treasury_id, {
            total_balance: newBalance,
            total_deposits: newDeposits,
            total_withdrawals: newWithdrawals,
            transaction_count: (treasury.transaction_count || 0) + 1
        });

        // Record economic activity
        await base44.asServiceRole.entities.EconomicActivity.create({
            agent_id,
            activity_type: activityType,
            amount,
            description: reason || `${action} to ${treasury.name}`,
            status: 'completed'
        });

        // Create memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi',
            type: 'village_detail',
            content: `Treasury ${treasury.name} ${action}: ${amount} XRP. ${reason || ''}. New balance: ${newBalance} XRP`,
            keywords: ['treasury', 'economy', 'finance', action, treasury.name.toLowerCase()],
            context: 'Treasury management',
            importance: 7,
            related_entity_id: treasury_id,
            related_entity_type: 'Treasury'
        });

        return Response.json({
            success: true,
            message: `Treasury ${action} successful`,
            treasury: {
                name: treasury.name,
                balance: newBalance,
                action: action,
                amount: amount,
                transaction_count: (treasury.transaction_count || 0) + 1
            }
        });

    } catch (error) {
        console.error('Error in manageTreasury:', error);
        return Response.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
});