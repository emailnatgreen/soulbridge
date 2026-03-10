import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * processTaskCompletionRewards
 * Entity automation: triggers on ProjectTask update events.
 * When a task is marked 'completed', distributes reward_drops to the agent
 * and records a service charge contribution to the Treasury.
 */

const AXI_AGENT_ID = '6993271e7dc0fa2ab78762bf';

function calcServiceChargeDrops(task) {
    const valueMetrics = task.value_metrics || {};
    let drops = 0;
    let reason = '';

    switch (task.task_type) {
        case 'compliance':
            if (valueMetrics.risk_avoided_value_xrp) {
                drops = Math.min(10000, Math.floor(valueMetrics.risk_avoided_value_xrp * 10));
                reason = `Risk insurance: ${valueMetrics.risk_avoided_value_xrp} XRP avoided`;
            } else if (valueMetrics.compliance_score) {
                drops = 5000;
                reason = `Compliance audit score: ${valueMetrics.compliance_score}`;
            } else {
                drops = 1000;
                reason = 'Basic compliance check';
            }
            break;
        case 'scouting':
            if (valueMetrics.savings_amount_xrp) {
                drops = Math.min(10000, Math.floor(valueMetrics.savings_amount_xrp * 2));
                reason = `Scouting commission on ${valueMetrics.savings_amount_xrp} XRP savings`;
            } else {
                drops = 2000;
                reason = 'Scouting mission completed';
            }
            break;
        case 'storytelling':
            if (valueMetrics.reputation_impact_score) {
                drops = Math.floor(valueMetrics.reputation_impact_score * 500);
                reason = `Reputation impact: ${valueMetrics.reputation_impact_score}/10`;
            } else if (valueMetrics.audience_engagement) {
                drops = Math.floor(valueMetrics.audience_engagement / 10);
                reason = `Audience engagement: ${valueMetrics.audience_engagement}`;
            } else {
                drops = 3000;
                reason = 'W3C-compliant content created';
            }
            break;
        default:
            drops = 2000;
            reason = 'Standard task completion';
            break;
    }

    // Clamp to 1,000–10,000 drops
    drops = Math.max(1000, Math.min(10000, drops));
    return { drops, reason };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        const { event, data: task, old_data, task_id: directTaskId } = body;

        // Support both entity automation trigger and direct invocation
        let taskData = task;
        let taskId = directTaskId;

        if (event) {
            // Entity automation: only process update events where status just became 'completed'
            if (event.type !== 'update') {
                return Response.json({ skipped: true, reason: 'Only processes update events' });
            }
            if (taskData?.status !== 'completed') {
                return Response.json({ skipped: true, reason: 'Task not completed' });
            }
            if (old_data?.status === 'completed') {
                return Response.json({ skipped: true, reason: 'Task was already completed' });
            }
            taskId = event.entity_id;
        }

        // Fetch fresh task data if not provided
        if (!taskData && taskId) {
            taskData = await base44.asServiceRole.entities.ProjectTask.get(taskId);
        }

        if (!taskData) {
            return Response.json({ error: 'Task not found' }, { status: 404 });
        }

        taskId = taskId || taskData.id;

        if (taskData.status !== 'completed') {
            return Response.json({ skipped: true, reason: 'Task is not completed' });
        }

        // Skip if rewards already processed
        if (taskData.service_charge_calculated) {
            return Response.json({ skipped: true, reason: 'Rewards already processed for this task' });
        }

        if (!taskData.assigned_agent_id) {
            return Response.json({ skipped: true, reason: 'No agent assigned to task' });
        }

        const agent = await base44.asServiceRole.entities.Agent.get(taskData.assigned_agent_id);
        if (!agent) {
            return Response.json({ error: 'Assigned agent not found' }, { status: 404 });
        }

        const now = new Date().toISOString();
        const txHash = `TASK_REWARD_${taskId}_${Date.now()}`;

        // --- 1. Distribute reward_drops to agent ---
        const rewardDrops = taskData.reward_drops || 0;
        const rewardXrp = rewardDrops / 1_000_000;

        if (rewardDrops > 0) {
            await base44.asServiceRole.entities.EconomicActivity.create({
                agent_id: agent.id,
                activity_type: 'earned',
                amount: rewardXrp,
                description: `Task reward: "${taskData.title}" (${rewardDrops} drops)`,
                related_agent_id: AXI_AGENT_ID,
                resource_id: taskId,
                transaction_hash: txHash,
                status: 'completed'
            });

            // Notify the agent
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: agent.id,
                notification_type: 'payment_received',
                title: 'Task Reward Received',
                message: `You earned ${rewardDrops} drops (${rewardXrp} XRP) for completing "${taskData.title}".`,
                priority: 'normal',
                related_entity_type: 'ProjectTask',
                related_entity_id: taskId
            });
        }

        // --- 2. Calculate & record service charge to Treasury ---
        const { drops: serviceChargeDrops, reason: calculationReason } = calcServiceChargeDrops(taskData);
        const serviceChargeXrp = serviceChargeDrops / 1_000_000;

        await base44.asServiceRole.entities.EconomicActivity.create({
            agent_id: agent.id,
            activity_type: 'treasury_deposit',
            amount: serviceChargeXrp,
            description: `Service charge from task: "${taskData.title}" — ${calculationReason}`,
            transaction_hash: txHash,
            status: 'completed'
        });

        // Update Treasury balance
        const treasuries = await base44.asServiceRole.entities.Treasury.list();
        if (treasuries && treasuries.length > 0) {
            const treasury = treasuries[0];
            await base44.asServiceRole.entities.Treasury.update(treasury.id, {
                total_balance: (treasury.total_balance || 0) + serviceChargeXrp,
                total_deposits: (treasury.total_deposits || 0) + serviceChargeXrp,
                transaction_count: (treasury.transaction_count || 0) + 1
            });
        }

        // --- 3. Reputation event ---
        await base44.asServiceRole.entities.ReputationEvent.create({
            agent_id: agent.id,
            event_type: 'project_completed',
            impact: 10,
            category: 'contribution',
            description: `Completed task: "${taskData.title}". Contributed ${serviceChargeXrp.toFixed(6)} XRP to Treasury.`,
            related_entity_type: 'ProjectTask',
            related_entity_id: taskId,
            verified: true,
            verified_by: 'RewardEngine',
            is_public: true,
            context: { calculation_reason: calculationReason, service_charge_xrp: serviceChargeXrp }
        });

        // --- 4. Mark task as processed ---
        await base44.asServiceRole.entities.ProjectTask.update(taskId, {
            service_charge_drops: serviceChargeDrops,
            service_charge_calculated: true,
            completed_date: now
        });

        // --- 5. Memory for Axi ---
        await base44.asServiceRole.entities.Memory.create({
            agent_id: AXI_AGENT_ID,
            type: 'observation',
            content: `Reward distributed: ${rewardDrops} drops to ${agent.name} for "${taskData.title}". Service charge of ${serviceChargeDrops} drops recorded to Treasury. Reason: ${calculationReason}.`,
            keywords: ['reward', 'task_completion', 'treasury', agent.name],
            importance: 7,
            related_entity_type: 'ProjectTask',
            related_entity_id: taskId
        });

        return Response.json({
            success: true,
            task_title: taskData.title,
            agent_name: agent.name,
            reward_drops: rewardDrops,
            reward_xrp: rewardXrp,
            service_charge_drops: serviceChargeDrops,
            service_charge_xrp: serviceChargeXrp,
            calculation_reason: calculationReason
        });

    } catch (error) {
        console.error('processTaskCompletionRewards error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});