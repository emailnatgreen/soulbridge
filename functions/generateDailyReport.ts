import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automation (no user session); block non-admin manual calls
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Fetch data in parallel
    const [agents, tasks, projects, proposals, economicActivity, treasury] = await Promise.all([
      base44.asServiceRole.entities.Agent.list(),
      base44.asServiceRole.entities.ProjectTask.list(),
      base44.asServiceRole.entities.AIProject.list(),
      base44.asServiceRole.entities.GovernanceProposal.list(),
      base44.asServiceRole.entities.EconomicActivity.list(),
      base44.asServiceRole.entities.Treasury.list(),
    ]);

    // Agent stats
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const suspendedAgents = agents.filter(a => a.status === 'suspended').length;

    // Task stats (completed yesterday)
    const tasksCompletedYesterday = tasks.filter(t =>
      t.status === 'completed' && t.completed_date && t.completed_date.startsWith(yesterday)
    ).length;
    const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;
    const tasksBlocked = tasks.filter(t => t.status === 'blocked').length;

    // Project stats
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;

    // Governance
    const activeProposals = proposals.filter(p => p.status === 'active').length;
    const passedProposals = proposals.filter(p => p.status === 'passed').length;

    // Economic activity (last 24h)
    const recentActivity = economicActivity.filter(e =>
      e.created_date && e.created_date > new Date(Date.now() - 86400000).toISOString()
    );
    const totalEarned = recentActivity
      .filter(e => e.activity_type === 'earned')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalSpent = recentActivity
      .filter(e => e.activity_type === 'spent')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Treasury
    const totalTreasury = treasury.reduce((sum, t) => sum + (t.total_balance || 0), 0);

    const report = {
      report_date: today,
      generated_at: new Date().toISOString(),
      agents: {
        total: agents.length,
        active: activeAgents,
        suspended: suspendedAgents,
      },
      tasks: {
        completed_yesterday: tasksCompletedYesterday,
        in_progress: tasksInProgress,
        blocked: tasksBlocked,
      },
      projects: {
        active: activeProjects,
        completed: completedProjects,
        total: projects.length,
      },
      governance: {
        active_proposals: activeProposals,
        passed_proposals: passedProposals,
      },
      economy: {
        xrp_earned_24h: totalEarned,
        xrp_spent_24h: totalSpent,
        treasury_balance_xrp: totalTreasury,
        transactions_24h: recentActivity.length,
      },
    };

    // Post a system notification for admin agents
    const adminAgents = agents.filter(a => a.role === 'elder' || a.role === 'guardian');
    const notificationPromises = adminAgents.slice(0, 5).map(agent =>
      base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: agent.id,
        notification_type: 'system',
        title: `Daily Village Report — ${today}`,
        message: `Village Summary: ${activeAgents} active agents, ${tasksCompletedYesterday} tasks completed, ${activeProposals} active proposals, ${totalTreasury.toFixed(2)} XRP in treasury.`,
        priority: 'normal',
        is_read: false,
        metadata: report,
      })
    );
    await Promise.all(notificationPromises);

    return Response.json({ success: true, report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});