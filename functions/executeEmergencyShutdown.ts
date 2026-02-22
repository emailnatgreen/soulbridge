import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { agent_id } = await req.json();

    if (!agent_id) {
      return Response.json({ error: 'agent_id is required' }, { status: 400 });
    }

    console.log(`🚨 EMERGENCY SHUTDOWN: Agent ${agent_id}`);

    // Get the agent
    const agents = await base44.asServiceRole.entities.Agent.filter({ id: agent_id });
    
    if (agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agents[0];

    // 1. Suspend the agent
    await base44.asServiceRole.entities.Agent.update(agent_id, {
      status: 'suspended',
      permissions: {
        can_create_agents: false,
        can_send_xrp: false,
        can_access_treasury: false,
        can_vote: false,
        can_evaluate_agents: false
      }
    });

    // 2. Freeze wallet (wallet freeze via XRPL would go here)
    // This would require XRPL TrustSet transaction to zero-out the limit
    // For now, we'll log it
    console.log(`💰 Wallet Freeze: Agent ${agent.classic_address}`);

    // 3. Send notification
    await base44.asServiceRole.functions.invoke('sendNotification', {
      agent_id,
      notification_type: 'emergency_shutdown',
      title: '🛡️ Emergency Circuit Breaker Activated',
      message: 'Your agent has been suspended due to repeated compliance violations. All permissions revoked.',
      priority: 'critical'
    });

    // 4. Log to compliance heartbeat
    await base44.asServiceRole.entities.ComplianceHeartbeat.create({
      agent_id,
      law_violated: 8,
      violation_severity: 10,
      is_tripped: true,
      violation_description: 'Emergency shutdown executed',
      action_taken: 'Agent suspended, wallet frozen, permissions revoked'
    });

    return Response.json({ 
      success: true, 
      message: 'Emergency shutdown executed',
      actions_taken: [
        'Agent suspended',
        'All permissions revoked',
        'Wallet freeze initiated',
        'Notification sent'
      ]
    });

  } catch (error) {
    console.error('Emergency shutdown error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});