import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all active agents
    const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });

    const updates = [];
    const alreadyEnabled = [];

    // Check and update permissions for each agent
    for (const agent of agents) {
      const currentPermissions = agent.permissions || {};
      
      if (currentPermissions.can_vote !== true) {
        // Enable voting permission
        await base44.asServiceRole.entities.Agent.update(agent.id, {
          permissions: {
            ...currentPermissions,
            can_vote: true
          }
        });
        updates.push({
          agent_id: agent.id,
          agent_name: agent.name,
          action: 'voting_permission_enabled'
        });
      } else {
        alreadyEnabled.push({
          agent_id: agent.id,
          agent_name: agent.name
        });
      }
    }

    return Response.json({
      status: 'success',
      message: 'Universal voting permissions audit completed',
      total_agents_checked: agents.length,
      permissions_enabled: updates.length,
      already_enabled: alreadyEnabled.length,
      updated_agents: updates
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});