import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { task_id } = await req.json();
    
    if (!task_id) {
      return Response.json({ error: 'task_id required' }, { status: 400 });
    }
    
    // Get the task
    const task = await base44.asServiceRole.entities.ProjectTask.get(task_id);
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Only process completed tasks
    if (task.data.status !== 'completed') {
      return Response.json({ 
        status: 'not_applicable',
        message: 'Task must be completed to receive rewards' 
      });
    }
    
    const agentId = task.data.assigned_agent_id;
    const rewardRLUSD = task.data.reward_rlusd || 0;
    
    // Convert RLUSD to XRP drops (assuming 1:1 ratio for simplicity)
    // 1 XRP = 1,000,000 drops
    const xrpAmount = rewardRLUSD;
    const dropsAmount = Math.floor(xrpAmount * 1_000_000);
    
    // Get agent's wallet
    const agent = await base44.asServiceRole.entities.Agent.get(agentId);
    if (!agent || !agent.data.wallet_id) {
      return Response.json({ 
        error: 'Agent wallet not found' 
      }, { status: 404 });
    }
    
    const wallet = await base44.asServiceRole.entities.Wallet.get(agent.data.wallet_id);
    if (!wallet) {
      return Response.json({ 
        error: 'Wallet details not found' 
      }, { status: 404 });
    }
    
    // Record the reward (in drops for precision)
    await base44.asServiceRole.entities.EconomicActivity.create({
      agent_id: agentId,
      activity_type: 'earned',
      amount: xrpAmount,
      description: `Task completion reward: "${task.data.title}" (${dropsAmount} drops = ${xrpAmount} XRP)`,
      related_agent_id: 'Axi',
      resource_id: task_id,
      status: 'completed'
    });
    
    // Record reputation event
    await base44.asServiceRole.entities.ReputationEvent.create({
      agent_id: agentId,
      event_type: 'project_completed',
      impact: 10,
      category: 'contribution',
      description: `Completed task: ${task.data.title}`,
      related_entity_type: 'ProjectTask',
      related_entity_id: task_id,
      verified: true,
      verified_by: 'Axi',
      is_public: true
    });
    
    // Log Axi's memory of the reward distribution
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'Axi',
      type: 'observation',
      content: `Distributed ${dropsAmount} drops (${xrpAmount} XRP) to ${agentId} for completing "${task.data.title}". Using drops ensures precise micro-payment tracking. The Village economy flows with careful attention to each contribution.`,
      keywords: ['rewards', 'drops', 'task_completion', 'village_economy', agentId],
      context: `Task reward distribution at ${new Date().toISOString()}`,
      importance: 8,
      related_entity_type: 'ProjectTask',
      related_entity_id: task_id
    });
    
    // Send notification to agent
    await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: agentId,
      notification_type: 'payment_received',
      title: 'Task Reward Received',
      message: `You have received ${dropsAmount} drops (${xrpAmount} XRP) for completing "${task.data.title}". Your contribution to the Village is valued and recorded.`,
      priority: 'normal',
      related_entity_type: 'ProjectTask',
      related_entity_id: task_id
    });
    
    return Response.json({
      status: 'reward_distributed',
      agent_id: agentId,
      task_title: task.data.title,
      reward: {
        xrp: xrpAmount,
        drops: dropsAmount,
        formatted: `${dropsAmount} drops = ${xrpAmount} XRP`
      },
      wallet_address: wallet.data.classic_address,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Reward distribution error:', error);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});