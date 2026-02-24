import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id, ...updateData } = await req.json();

    if (!agent_id) {
      return Response.json(
        { error: 'Missing required field: agent_id' },
        { status: 400 }
      );
    }

    // Get agent and verify ownership
    const agent = await base44.entities.Agent.get(agent_id);
    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user created this agent
    if (agent.metadata?.created_by_user_id !== user.id && user.role !== 'admin') {
      return Response.json(
        { error: 'Not authorized to update this agent' },
        { status: 403 }
      );
    }

    // If updating wallet_id, verify ownership and get classic_address
    if (updateData.wallet_id) {
      const wallet = await base44.entities.Wallet.get(updateData.wallet_id);
      if (!wallet) {
        return Response.json({ error: 'Wallet not found' }, { status: 404 });
      }
      if (wallet.owner_id !== user.id) {
        return Response.json({ error: 'You do not own this wallet' }, { status: 403 });
      }
      updateData.classic_address = wallet.classic_address;
    }

    // Update agent
    const updatedAgent = await base44.entities.Agent.update(agent_id, updateData);

    // Log agent update
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'agent_updated',
        did_classic_address: updatedAgent.classic_address,
        wallet_id: updatedAgent.wallet_id || null,
        agent_id: agent_id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: { updates: Object.keys(updateData) },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log agent update:', logError);
    }

    return Response.json({
      success: true,
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return Response.json(
      { error: error.message || 'Failed to update agent' },
      { status: 500 }
    );
  }
});