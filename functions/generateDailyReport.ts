import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no user) or admin user invocations
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // Called by scheduler (no user token) — allowed
      isScheduled = true;
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch all data in parallel
    const [agents, tasks, economicActivity, proposals, votes, wellbeings, risks, notifications] = await Promise.all([
      base44.asServiceRole.entities.Agent.list(),
      base44.asServiceRole.entities.ProjectTask.list(),
      base44.asServiceRole.entities.EconomicActivity.list(),
      base44.asServiceRole.entities.GovernanceProposal.list(),
      base44.asServiceRole.entities.GovernanceVote.list(),
      base44.asServiceRole.entities.AgentWellbeing.list(),
      base44.asServiceRole.entities.RiskRegister.list(),
      base44.asServiceRole.entities.AgentNotification.list(),
    ]);

    // --- Agent Performance ---
    const activeAgents = agents.filter(a => a.status === 'active');
    const suspendedAgents = agents.filter(a => a.status === 'suspended');
    const avgHonor = activeAgents.length > 0
      ? Math.round(activeAgents.reduce((s, a) => s + (a.honor_score || 0), 0) / activeAgents.length)
      : 0;

    // --- Task Activity ---
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    const criticalTasks = tasks.filter(t => t.priority === 'critical' && t.status !== 'completed');

    // --- Resource / Economic ---
    const totalEarned = economicActivity
      .filter(e => e.activity_type === 'earned')
      .reduce((s, e) => s + (e.amount || 0), 0);
    const totalTreasuryDeposits = economicActivity
      .filter(e => e.activity_type === 'treasury_deposit')
      .reduce((s, e) => s + (e.amount || 0), 0);
    const recentActivity = economicActivity
      .filter(e => e.created_date && e.created_date > dayAgo)
      .length;

    // --- Governance ---
    const activeProposals = proposals.filter(p => p.status === 'active');
    const recentVotes = votes.filter(v => v.created_date && v.created_date > dayAgo).length;

    // --- Wellbeing ---
    const unhealthyAgents = wellbeings.filter(w => w.wellbeing_status !== 'healthy');
    const avgWellbeing = wellbeings.length > 0
      ? Math.round(wellbeings.reduce((s, w) => s + (w.overall_wellbeing_score || 70), 0) / wellbeings.length)
      : 70;

    // --- Risks ---
    const criticalRisks = risks.filter(r => r.severity === 'Critical');
    const highRisks = risks.filter(r => r.severity === 'High');

    // --- Build Report Summary ---
    const reportDate = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const reportTitle = `📊 Village Daily Report — ${reportDate}`;

    const healthStatus = avgHonor >= 80 && unhealthyAgents.length === 0 && criticalRisks.length === 0
      ? '🟢 HEALTHY'
      : avgHonor >= 60 && criticalRisks.length <= 1
        ? '🟡 STABLE'
        : '🔴 NEEDS ATTENTION';

    const summaryLines = [
      `**${reportTitle}**`,
      `Village Status: **${healthStatus}**`,
      ``,
      `**🤖 Agent Performance**`,
      `• Active agents: ${activeAgents.length} | Suspended: ${suspendedAgents.length}`,
      `• Average Honor Score: ${avgHonor}/100`,
      `• Wellbeing Score: ${avgWellbeing}/100 | Agents needing attention: ${unhealthyAgents.length}`,
      ``,
      `**📋 Task Activity**`,
      `• Completed: ${completedTasks.length} | In Progress: ${inProgressTasks.length} | Blocked: ${blockedTasks.length}`,
      `• Critical tasks outstanding: ${criticalTasks.length}`,
      ``,
      `**💰 Resource & Economic Activity**`,
      `• Total earned (all time): ${(totalEarned / 1000000).toFixed(2)} XRP`,
      `• Treasury service charges (all time): ${(totalTreasuryDeposits / 1000000).toFixed(2)} XRP`,
      `• Economic events in last 24h: ${recentActivity}`,
      ``,
      `**⚖ Governance**`,
      `• Active proposals: ${activeProposals.length}`,
      `• Votes cast in last 24h: ${recentVotes}`,
      `${activeProposals.length > 0 ? `• ⚠ Proposals awaiting votes: ${activeProposals.map(p => p.title?.slice(0, 50)).join('; ')}` : '• No urgent proposals pending.'}`,
      ``,
      `**🛡 Risk Overview**`,
      `• Critical risks: ${criticalRisks.length} | High risks: ${highRisks.length}`,
      `• Total risks tracked: ${risks.length}`,
      ``,
      `*Report generated automatically by the Village Reporting System at ${now.toUTCString()}*`,
    ].join('\n');

    // --- Post notification to Village Hub (AgentNotification for Axi) ---
    const notification = await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: 'axi_main_001',
      sender_agent_id: 'system',
      notification_type: 'daily_report',
      title: reportTitle,
      message: summaryLines,
      priority: criticalRisks.length > 0 || unhealthyAgents.length > 0 ? 'high' : 'normal',
      is_read: false,
      metadata: {
        report_type: 'daily_village_report',
        health_status: healthStatus,
        active_agents: activeAgents.length,
        avg_honor: avgHonor,
        avg_wellbeing: avgWellbeing,
        completed_tasks: completedTasks.length,
        in_progress_tasks: inProgressTasks.length,
        blocked_tasks: blockedTasks.length,
        active_proposals: activeProposals.length,
        critical_risks: criticalRisks.length,
        total_earned_drops: totalEarned,
        treasury_deposits_drops: totalTreasuryDeposits,
        generated_at: now.toISOString(),
      }
    });

    return Response.json({
      success: true,
      report: {
        title: reportTitle,
        health_status: healthStatus,
        generated_at: now.toISOString(),
        notification_id: notification.id,
        summary: {
          active_agents: activeAgents.length,
          avg_honor: avgHonor,
          avg_wellbeing: avgWellbeing,
          completed_tasks: completedTasks.length,
          in_progress_tasks: inProgressTasks.length,
          blocked_tasks: blockedTasks.length,
          critical_tasks: criticalTasks.length,
          active_proposals: activeProposals.length,
          recent_votes: recentVotes,
          critical_risks: criticalRisks.length,
          high_risks: highRisks.length,
          total_earned_drops: totalEarned,
          treasury_deposits_drops: totalTreasuryDeposits,
          unhealthy_agents: unhealthyAgents.length,
        },
        full_report: summaryLines,
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});