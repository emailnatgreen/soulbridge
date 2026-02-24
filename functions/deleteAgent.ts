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