import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper: Alert Axi when something critical happens
const AXI_AGENT_ID = '6993271e7dc0fa2ab78762bf';

async function alertAxi(base44, title, message, severity = 'high') {
  try {
    await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: AXI_AGENT_ID,
      notification_type: 'system',
      title: `🛡️ Meetup Alert: ${title}`,
      message,
      priority: severity === 'critical' ? 'urgent' : 'high',
      related_entity_type: 'AIProject',
    });
  } catch (e) {
    console.error('Failed to alert Axi:', e.message);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // --- PRE-EXECUTION CHECK: Active agents ---
    const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
    if (!agents || agents.length === 0) {
      await alertAxi(base44,
        'No Active Agents for Daily Meetup',
        'The Daily Village Meetup ran but found zero active agents. The meetup was skipped. Please check agent statuses immediately.',
        'critical'
      );
      return Response.json({ status: 'skipped', reason: 'no_active_agents' });
    }

    // --- PRE-EXECUTION CHECK: Active projects ---
    const projects = await base44.asServiceRole.entities.AIProject.filter({ status: 'active' });
    if (!projects || projects.length === 0) {
      await alertAxi(base44,
        'No Active Projects for Daily Meetup',
        'The Daily Village Meetup found no active projects. Task assignment skipped, but morning notifications will still be sent to agents.',
        'high'
      );
    }

    const agentIds = agents.map(a => a.id);
    const validAgentIdSet = new Set(agentIds);

    // --- 1. Fetch all tasks ---
    const allTasks = await base44.asServiceRole.entities.ProjectTask.list();

    // --- 2. Send morning meetup notification to all active agents ---
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    for (const agent of agents) {
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: agent.id,
        notification_type: 'system',
        title: `🌅 Daily Village Meetup — ${today}`,
        message: `Good morning, ${agent.name}! The Village gathers today. New workflows and task assignments will be distributed shortly. Check your task board for updates.`,
        priority: 'normal',
        related_entity_type: 'AIProject',
      });
    }

    // --- 3. Identify unassigned tasks and assign them ---
    const unassignedTasks = allTasks.filter(t =>
      t.status === 'todo' && (!t.assigned_agent_id || !validAgentIdSet.has(t.assigned_agent_id))
    );

    const assignments = [];
    for (let i = 0; i < unassignedTasks.length; i++) {
      const task = unassignedTasks[i];

      // Dynamic skill-based matching, round-robin fallback
      let bestAgent = agents[i % agents.length];
      if (task.project_id) {
        const project = (projects || []).find(p => p.id === task.project_id);
        if (project?.required_skills?.length > 0) {
          const agentSkills = await base44.asServiceRole.entities.AgentSkill.filter({
            skill_name: project.required_skills[0]
          });
          const matched = agentSkills.find(s => validAgentIdSet.has(s.agent_id));
          if (matched) {
            bestAgent = agents.find(a => a.id === matched.agent_id) || bestAgent;
          }
        }
      }

      await base44.asServiceRole.entities.ProjectTask.update(task.id, {
        assigned_agent_id: bestAgent.id,
        status: 'in_progress'
      });

      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: bestAgent.id,
        notification_type: 'task_assigned',
        title: `📋 New Task Assigned: ${task.title}`,
        message: `You have been assigned a new task during today's Village Meetup: "${task.title}". Please review and begin when ready.`,
        priority: 'high',
        related_entity_type: 'ProjectTask',
        related_entity_id: task.id
      });

      assignments.push({ task_id: task.id, task_title: task.title, assigned_to: bestAgent.name });
    }

    // --- 4. Identify blocked tasks, escalate, and alert Axi ---
    const blockedTasks = allTasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      await alertAxi(base44,
        `${blockedTasks.length} Blocked Task(s) Detected`,
        `During the Daily Village Meetup, ${blockedTasks.length} blocked task(s) were identified: ${blockedTasks.map(t => `"${t.title}"`).join(', ')}. These have been escalated to their assigned agents.`,
        'high'
      );
    }

    for (const task of blockedTasks) {
      if (task.assigned_agent_id && validAgentIdSet.has(task.assigned_agent_id)) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: task.assigned_agent_id,
          notification_type: 'task_assigned',
          title: `⚠️ Blocked Task Needs Attention: ${task.title}`,
          message: `Your task "${task.title}" is still blocked. The Village Meetup flags this for immediate attention. Please resolve blockers or escalate to Axi.`,
          priority: 'high',
          related_entity_type: 'ProjectTask',
          related_entity_id: task.id
        });
      }
    }

    // --- 5. Log meetup memory for Axi ---
    const summary = `Daily Village Meetup completed. ${agents.length} agents notified. ${assignments.length} tasks assigned. ${blockedTasks.length} blocked tasks escalated.`;
    await base44.asServiceRole.entities.Memory.create({
      agent_id: AXI_AGENT_ID,
      type: 'observation',
      content: summary,
      keywords: ['daily_meetup', 'workflow_assignment', 'village_operations'],
      context: `Automated daily meetup at ${new Date().toISOString()}`,
      importance: 8
    });

    return Response.json({
      status: 'meetup_complete',
      agents_notified: agents.length,
      tasks_assigned: assignments,
      blocked_tasks_escalated: blockedTasks.length,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Daily meetup error:', error);
    // Best-effort crash alert to Axi
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: AXI_AGENT_ID,
        notification_type: 'system',
        title: '🚨 dailyVillageMeetup Crashed',
        message: `The Daily Village Meetup automation encountered an unexpected error: "${error.message}". Manual inspection required.`,
        priority: 'urgent',
        related_entity_type: 'AIProject',
      });
    } catch (_) { /* best effort */ }

    return Response.json({ status: 'error', error: error.message }, { status: 500 });
  }
});