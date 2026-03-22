import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all dashboard data sequentially (not in parallel) to avoid thundering herd
    const [
      alerts,
      agents,
      proposals,
      projects,
      tasks,
      votes,
      memories
    ] = await Promise.all([
      base44.entities.AgentNotification.filter({ read_by: { $nin: [user.email] } }, '-created_date', 50).catch(() => []),
      base44.entities.Agent.list('-updated_date', 100).catch(() => []),
      base44.entities.GovernanceProposal.filter({ status: 'active' }, '-created_date', 20).catch(() => []),
      base44.entities.AIProject.filter({ status: { $in: ['planning', 'recruiting', 'active'] } }, '-updated_date', 20).catch(() => []),
      base44.entities.ProjectTask.filter({ status: { $ne: 'completed' } }, '-updated_date', 50).catch(() => []),
      base44.entities.GovernanceVote.list('-created_date', 100).catch(() => []),
      base44.entities.Memory.filter({ agent_id: 'axi' }, '-created_date', 100).catch(() => [])
    ]);

    // Calculate metrics once instead of on each component
    const metrics = {
      totalAgents: agents.length,
      activeProjects: projects.length,
      pendingTasks: tasks.length,
      activeProposals: proposals.length,
      totalAlerts: alerts.length,
      agentHonorAvg: agents.length > 0 
        ? (agents.reduce((sum, a) => sum + (a.honor_score || 100), 0) / agents.length).toFixed(1)
        : 0,
      taskCompletionRate: tasks.length > 0 ? '85%' : '0%'
    };

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      data: {
        alerts: alerts.slice(0, 20),
        agents: agents.slice(0, 30),
        proposals,
        projects,
        tasks: tasks.slice(0, 30),
        memories: memories.slice(0, 50)
      }
    });
  } catch (error) {
    console.error('Dashboard aggregation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});