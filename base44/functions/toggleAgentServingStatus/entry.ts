import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id, is_serving } = await req.json();

    if (!agent_id || typeof is_serving !== 'boolean') {
      return Response.json({ error: 'Missing required fields: agent_id (string) and is_serving (boolean)' }, { status: 400 });
    }

    // Fetch the agent — use service role to bypass RLS, then verify ownership
    const agents = await base44.asServiceRole.entities.Agent.filter({ id: agent_id });

    if (!agents || agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    const agent = agents[0];

    // Verify ownership: the agent must have been created by this user
    if (agent.created_by !== user.email) {
      return Response.json({ error: 'Forbidden: You are not the owner of this agent' }, { status: 403 });
    }

    // Update the agent's serving status
    await base44.asServiceRole.entities.Agent.update(agent.id, {
      is_serving: is_serving
    });

    console.log(`Agent ${agent.name} (${agent.id}) serving status toggled to ${is_serving} by ${user.email}`);

    return Response.json({
      success: true,
      message: `Agent "${agent.name}" is now ${is_serving ? 'serving' : 'dormant'}.`,
      agent_id: agent.id,
      is_serving: is_serving
    });

  } catch (error) {
    console.error('toggleAgentServingStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});