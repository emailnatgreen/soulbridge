import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const AXI_AGENT_ID = '6993271e7dc0fa2ab78762bf';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { task_id: directTaskId, event, data: eventData } = body;

        // Auth optional — entity automations run without user token
        let user = null;
        try { user = await base44.auth.me(); } catch (_) {}
        if (!event && !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Support entity automation trigger (update event)
        let task_id = directTaskId;
        if (!task_id && event?.type === 'update' && event?.entity_id) {
            task_id = event.entity_id;
            // Only process if the task just became 'completed'
            const currentStatus = eventData?.status;
            if (currentStatus !== 'completed') {
                return Response.json({ message: 'Task not completed yet, skipping' });
            }
        }

        if (!task_id) {
            return Response.json({ error: 'Missing task_id' }, { status: 400 });
        }

        // Fetch the completed task
        const task = await base44.asServiceRole.entities.ProjectTask.get(task_id);
        if (!task) {
            return Response.json({ error: 'Task not found' }, { status: 404 });
        }

        if (task.status !== 'completed') {
            return Response.json({ error: 'Task must be completed to calculate service charge' }, { status: 400 });
        }

        if (task.service_charge_calculated) {
            return Response.json({
                message: 'Service charge already calculated for this task',
                service_charge_drops: task.service_charge_drops
            });
        }

        // Fetch the assigned agent (skip if no agent assigned)
        if (!task.assigned_agent_id) {
            return Response.json({ message: 'No agent assigned to this task, skipping service charge' });
        }

        const agent = await base44.asServiceRole.entities.Agent.get(task.assigned_agent_id);
        if (!agent) {
            return Response.json({ error: 'Assigned agent not found' }, { status: 404 });
        }

        let serviceChargeDrops = 0;
        let calculationReason = '';
        const valueMetrics = task.value_metrics || {};

        switch (task.task_type) {
            case 'compliance':
                if (valueMetrics.risk_avoided_value_xrp) {
                    serviceChargeDrops = Math.min(10000, Math.floor(valueMetrics.risk_avoided_value_xrp * 10));
                    calculationReason = `Risk insurance value: ${valueMetrics.risk_avoided_value_xrp} XRP avoided`;
                } else if (valueMetrics.compliance_score) {
                    serviceChargeDrops = 5000;
                    calculationReason = `Standard compliance audit completed with score: ${valueMetrics.compliance_score}`;
                } else {
                    serviceChargeDrops = 1000;
                    calculationReason = 'Basic compliance check completed';
                }
                break;
            case 'scouting':
                if (valueMetrics.savings_amount_xrp) {
                    serviceChargeDrops = Math.min(10000, Math.floor(valueMetrics.savings_amount_xrp * 2));
                    calculationReason = `Scouting commission on ${valueMetrics.savings_amount_xrp} XRP savings`;
                } else {
                    serviceChargeDrops = 2000;
                    calculationReason = 'Scouting mission completed';
                }
                break;
            case 'storytelling':
                if (valueMetrics.reputation_impact_score) {
                    serviceChargeDrops = Math.floor(valueMetrics.reputation_impact_score * 500);
                    calculationReason = `Reputation impact: ${valueMetrics.reputation_impact_score}/10 points`;
                } else if (valueMetrics.audience_engagement) {
                    serviceChargeDrops = Math.floor(valueMetrics.audience_engagement / 10);
                    calculationReason = `Audience engagement: ${valueMetrics.audience_engagement} points`;
                } else {
                    serviceChargeDrops = 3000;
                    calculationReason = 'W3C-compliant tagged content created';
                }
                break;
            default:
                serviceChargeDrops = (task.reward_drops && task.reward_drops <= 10000) ? task.reward_drops : 2000;
                calculationReason = 'Standard task completion';
                break;
        }

        // Clamp to 1,000–10,000 drops
        if (serviceChargeDrops < 1000) serviceChargeDrops = 1000;
        if (serviceChargeDrops > 10000) serviceChargeDrops = 10000;

        // Mark task as service-charge applied
        await base44.asServiceRole.entities.ProjectTask.update(task_id, {
            service_charge_drops: serviceChargeDrops,
            service_charge_calculated: true
        });

        // EconomicActivity: agent earned
        await base44.asServiceRole.entities.EconomicActivity.create({
            agent_id: agent.id,
            activity_type: 'earned',
            amount: serviceChargeDrops / 1000000,
            description: `Service charge earned: ${task.title} - ${calculationReason}`,
            related_agent_id: null,
            status: 'completed'
        });

        // EconomicActivity: treasury deposit
        await base44.asServiceRole.entities.EconomicActivity.create({
            agent_id: agent.id,
            activity_type: 'treasury_deposit',
            amount: serviceChargeDrops / 1000000,
            description: `Treasury contribution from task: ${task.title}`,
            status: 'completed'
        });

        // Update Treasury
        const treasuryList = await base44.asServiceRole.entities.Treasury.list();
        let treasury;
        if (treasuryList && treasuryList.length > 0) {
            treasury = treasuryList[0];
            await base44.asServiceRole.entities.Treasury.update(treasury.id, {
                total_balance: (treasury.total_balance || 0) + (serviceChargeDrops / 1000000),
                total_deposits: (treasury.total_deposits || 0) + (serviceChargeDrops / 1000000),
                transaction_count: (treasury.transaction_count || 0) + 1
            });
        } else {
            treasury = await base44.asServiceRole.entities.Treasury.create({
                name: 'Village Treasury',
                total_balance: serviceChargeDrops / 1000000,
                total_deposits: serviceChargeDrops / 1000000,
                total_withdrawals: 0,
                transaction_count: 1,
                manager_agent_id: AXI_AGENT_ID,
                purpose: 'Village shared fund from service charges',
                access_level: 'managers'
            });
        }

        // Honor score increase
        const honorIncrease = Math.floor(serviceChargeDrops / 10000000);
        await base44.asServiceRole.entities.Agent.update(agent.id, {
            honor_score: (agent.honor_score || 100) + honorIncrease
        });

        // ReputationEvent
        await base44.asServiceRole.entities.ReputationEvent.create({
            agent_id: agent.id,
            event_type: 'project_completed',
            impact: honorIncrease,
            category: 'economic_contribution',
            description: `Contributed ${(serviceChargeDrops / 1000000).toFixed(6)} XRP to Village Treasury through ${task.task_type} work: ${task.title}`,
            related_entity_type: 'ProjectTask',
            related_entity_id: task_id,
            verified: true,
            verified_by: 'ServiceChargeEngine',
            context: {
                calculation_reason: calculationReason,
                service_charge_xrp: serviceChargeDrops / 1000000,
                task_type: task.task_type,
                value_metrics: valueMetrics
            }
        });

        return Response.json({
            success: true,
            service_charge_drops: serviceChargeDrops,
            service_charge_xrp: serviceChargeDrops / 1000000,
            calculation_reason: calculationReason,
            honor_increase: honorIncrease,
            agent_name: agent.name,
            task_title: task.title,
            new_treasury_balance: treasury.total_balance,
            message: 'Service charge calculated and applied successfully'
        });

    } catch (error) {
        console.error('Service charge calculation error:', error);
        return Response.json({
            error: error.message || 'Failed to calculate service charge',
            details: error.toString()
        }, { status: 500 });
    }
});