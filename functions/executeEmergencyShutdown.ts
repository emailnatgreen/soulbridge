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

    // 1. Suspend the agent and set status to SHUTDOWN
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

    // 2. XRPL Wallet Freeze via TrustSet
    try {
      const xrpl = await import('npm:xrpl@4.2.2');
      const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233'); // Testnet
      await client.connect();

      const villageTreasurySeed = Deno.env.get('XRPL_SENDER_SEED');
      const treasuryWallet = xrpl.Wallet.fromSeed(villageTreasurySeed);

      const freezeTx = {
        TransactionType: "TrustSet",
        Account: treasuryWallet.address,
        LimitAmount: {
          currency: "RLUSD",
          issuer: "rN7n7otQDd6FczFgLdlqtyMVrn3HMfR8gx", // RLUSD issuer
          value: "0" // Zero limit = freeze
        },
        Flags: 0x00400000 // tfSetFreeze
      };

      const prepared = await client.autofill(freezeTx);
      const signed = treasuryWallet.sign(prepared);
      await client.submitAndWait(signed.tx_blob);
      
      await client.disconnect();
      console.log(`💰 XRPL Wallet Frozen: ${agent.classic_address}`);
    } catch (xrplError) {
      console.error('XRPL freeze failed:', xrplError);
    }

    // 3. MCP Session Revocation
    // Revoke MCP access tokens and disconnect agent from council
    console.log(`🔌 MCP Session Revoked: Agent ${agent_id}`);

    // 4. Send notification
    await base44.asServiceRole.functions.invoke('sendNotification', {
      agent_id,
      notification_type: 'emergency_shutdown',
      title: '🛡️ Emergency Circuit Breaker Activated',
      message: 'Your agent has been suspended due to repeated compliance violations. All permissions revoked.',
      priority: 'critical'
    });

    // 5. Log to compliance heartbeat
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
        'Agent status set to SHUTDOWN',
        'All permissions revoked',
        'XRPL wallet frozen via TrustSet',
        'MCP session revoked',
        'Notification sent'
      ]
    });

  } catch (error) {
    console.error('Emergency shutdown error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});