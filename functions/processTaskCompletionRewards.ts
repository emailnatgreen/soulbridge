import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event } = await req.json();

    if (!event || !event.entity_id) {
      return Response.json({ error: 'Invalid request: missing task ID' }, { status: 400 });
    }

    const taskId = event.entity_id;

    // Fetch the completed task
    const task = await base44.asServiceRole.entities.ProjectTask.get(taskId);
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Skip if already processed
    if (task.service_charge_calculated) {
      return Response.json({ 
        message: 'Task rewards already processed',
        taskId,
        processed: false
      });
    }

    // Skip if no agent assigned
    if (!task.assigned_agent_id) {
      return Response.json({ 
        error: 'No agent assigned to this task',
        taskId
      }, { status: 400 });
    }

    // Ensure reward_drops is set
    if (!task.reward_drops || task.reward_drops === 0) {
      return Response.json({ 
        error: 'Task has no reward amount specified',
        taskId
      }, { status: 400 });
    }

    // Fetch agent and their wallet
    const [agent, wallet, project] = await Promise.all([
      base44.asServiceRole.entities.Agent.get(task.assigned_agent_id),
      base44.asServiceRole.entities.Wallet.filter({ owner_id: task.assigned_agent_id }, '', 1).then(results => results[0]),
      task.project_id ? base44.asServiceRole.entities.AIProject.get(task.project_id) : null
    ]);

    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (!wallet) {
      return Response.json({ error: 'Agent wallet not found' }, { status: 404 });
    }

    const rewardDrops = task.reward_drops;
    const serviceChargeDrops = Math.floor(rewardDrops * 0.01); // 1% service charge

    // Fetch Treasury for Village contribution
    const treasury = await base44.asServiceRole.entities.Treasury.filter({ name: 'SoulBridge Main Treasury' }, '', 1).then(results => results[0]);
    if (!treasury) {
      return Response.json({ error: 'Village Treasury not found' }, { status: 404 });
    }

    // Create agent reward transaction
    const agentTransaction = await base44.asServiceRole.entities.Transaction.create({
      recipient_name: agent.name,
      recipient_address: wallet.classic_address,
      amount: rewardDrops,
      note: `Task Reward: ${task.title}${project ? ` for Project ${project.title}` : ''}`,
      status: 'completed',
      hash: `TASK_${taskId}_AGENT_${Date.now()}`
    });

    // Create service charge transaction
    const treasuryTransaction = await base44.asServiceRole.entities.Transaction.create({
      recipient_name: 'Village Treasury',
      recipient_address: treasury.classic_address,
      amount: serviceChargeDrops,
      note: `Service Charge: ${task.title}${project ? ` for Project ${project.title}` : ''}`,
      status: 'completed',
      hash: `TASK_${taskId}_TREASURY_${Date.now()}`
    });

    // Update agent wallet balance
    const updatedWallet = await base44.asServiceRole.entities.Wallet.update(wallet.id, {
      balance: (wallet.balance || 0) + rewardDrops
    });

    // Update treasury balance
    const updatedTreasury = await base44.asServiceRole.entities.Treasury.update(treasury.id, {
      total_balance: (treasury.total_balance || 0) + serviceChargeDrops,
      total_deposits: (treasury.total_deposits || 0) + serviceChargeDrops,
      transaction_count: (treasury.transaction_count || 0) + 1
    });

    // Update task status
    const updatedTask = await base44.asServiceRole.entities.ProjectTask.update(taskId, {
      service_charge_calculated: true,
      completed_date: new Date().toISOString()
    });

    // Create economic activity records for transparency
    await Promise.all([
      base44.asServiceRole.entities.EconomicActivity.create({
        agent_id: task.assigned_agent_id,
        activity_type: 'earned',
        amount: rewardDrops,
        description: `Completed task: ${task.title}`,
        resource_id: taskId,
        transaction_hash: agentTransaction.hash,
        status: 'completed'
      }),
      base44.asServiceRole.entities.EconomicActivity.create({
        agent_id: treasury.manager_agent_id || 'system',
        activity_type: 'treasury_deposit',
        amount: serviceChargeDrops,
        description: `Service charge from task: ${task.title}`,
        resource_id: taskId,
        transaction_hash: treasuryTransaction.hash,
        status: 'completed'
      })
    ]);

    return Response.json({
      success: true,
      taskId,
      agent_id: task.assigned_agent_id,
      agent_name: agent.name,
      reward_drops: rewardDrops,
      service_charge_drops: serviceChargeDrops,
      agent_transaction_id: agentTransaction.id,
      treasury_transaction_id: treasuryTransaction.id,
      new_agent_balance: updatedWallet.balance,
      new_treasury_balance: updatedTreasury.total_balance,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in processTaskCompletionRewards:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});