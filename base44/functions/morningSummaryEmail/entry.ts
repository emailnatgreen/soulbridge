import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const [agents, tasks, projects, proposals, treasury, notifications] = await Promise.all([
      base44.asServiceRole.entities.Agent.list(),
      base44.asServiceRole.entities.ProjectTask.list(),
      base44.asServiceRole.entities.AIProject.list(),
      base44.asServiceRole.entities.GovernanceProposal.list(),
      base44.asServiceRole.entities.Treasury.list(),
      base44.asServiceRole.entities.AgentNotification.list('-created_date', 20),
    ]);

    const safeAgents = Array.isArray(agents) ? agents : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeProjects = Array.isArray(projects) ? projects : [];
    const safeProposals = Array.isArray(proposals) ? proposals : [];
    const safeTreasury = Array.isArray(treasury) ? treasury : [];
    const safeNotifications = Array.isArray(notifications) ? notifications : [];

    const activeAgents = safeAgents.filter(a => a.status === 'active').length;
    const tasksCompleted = safeTasks.filter(t => t.status === 'completed' && t.completed_date?.startsWith(yesterday)).length;
    const tasksInProgress = safeTasks.filter(t => t.status === 'in_progress').length;
    const tasksBlocked = safeTasks.filter(t => t.status === 'blocked').length;
    const activeProjects = safeProjects.filter(p => p.status === 'active').length;
    const activeProposals = safeProposals.filter(p => p.status === 'active').length;
    const totalTreasury = safeTreasury.reduce((sum, t) => sum + (t.total_balance || 0), 0);

    // Recent unread notifications (last 24h)
    const recentNotifs = safeNotifications.filter(n =>
      !n.is_read && n.created_date > new Date(Date.now() - 86400000).toISOString()
    ).slice(0, 5);

    const notifLines = recentNotifs.length > 0
      ? recentNotifs.map(n => `  • [${n.priority || 'normal'}] ${n.title}: ${n.message?.slice(0, 120) || ''}`).join('\n')
      : '  No new alerts in the last 24 hours.';

    const emailBody = `
Good morning 👋

Here is your SoulBridge daily briefing for ${today}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏘️  VILLAGE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agents Active:        ${activeAgents} / ${safeAgents.length}
  Tasks Completed:      ${tasksCompleted} (yesterday)
  Tasks In Progress:    ${tasksInProgress}
  Tasks Blocked:        ${tasksBlocked}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗳️  GOVERNANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Active Proposals:     ${activeProposals}
  Active Projects:      ${activeProjects}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰  TREASURY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Balance:        ${totalTreasury.toFixed(2)} XRP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔  RECENT ALERTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${notifLines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Have a great day.
— Axi, SoulBridge System
`.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'emailnatgreen@gmail.com',
      subject: `☀️ SoulBridge Morning Briefing — ${today}`,
      body: emailBody,
      from_name: 'SoulBridge',
    });

    return Response.json({ success: true, sent_to: 'emailnatgreen@gmail.com', date: today });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});