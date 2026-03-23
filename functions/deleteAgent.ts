import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id } = await req.json();

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
        { error: 'Not authorized to delete this agent' },
        { status: 403 }
      );
    }

    // Log agent deletion before deleting
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'agent_deleted',
        did_classic_address: agent.classic_address,
        wallet_id: agent.wallet_id || null,
        agent_id: agent_id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: { name: agent.name, role: agent.role },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log agent deletion:', logError);
    }

    // Delete agent
    await base44.entities.Agent.delete(agent_id);

    return Response.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return Response.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
});