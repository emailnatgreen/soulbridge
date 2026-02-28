import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active agents
    const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });

    // Fetch all projects and tasks
    const projects = await base44.asServiceRole.entities.AIProject.filter({ status: 'active' });
    const allTasks = await base44.asServiceRole.entities.ProjectTask.list();

    const agentIds = agents.map(a => a.id);
    const validAgentIdSet = new Set(agentIds);

    // --- 1. Send morning meetup notification to all active agents ---
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

    // --- 2. Identify unassigned tasks and assign them ---
    const unassignedTasks = allTasks.filter(t =>
      t.status === 'todo' && (!t.assigned_agent_id || !validAgentIdSet.has(t.assigned_agent_id))
    );

    const assignments = [];
    for (let i = 0; i < unassignedTasks.length; i++) {
      const task = unassignedTasks[i];
      const assignedAgent = agents[i % agents.length]; // round-robin fallback

      // Try to match by required skills if project has them
      let bestAgent = assignedAgent;
      if (task.project_id) {
        const project = projects.find(p => p.id === task.project_id);
        if (project?.required_skills?.length > 0) {
          const agentSkills = await base44.asServiceRole.entities.AgentSkill.filter({
            skill_name: project.required_skills[0]
          });
          const matched = agentSkills.find(s => validAgentIdSet.has(s.agent_id));
          if (matched) {
            bestAgent = agents.find(a => a.id === matched.agent_id) || assignedAgent;
          }
        }
      }

      await base44.asServiceRole.entities.ProjectTask.update(task.id, {
        assigned_agent_id: bestAgent.id,
        status: 'in_progress'
      });

      // Notify assigned agent
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

    // --- 3. Identify blocked tasks and escalate ---
    const blockedTasks = allTasks.filter(t => t.status === 'blocked');
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

    // --- 4. Log meetup memory for Axi ---
    const summary = `Daily Village Meetup completed. ${agents.length} agents notified. ${assignments.length} tasks assigned. ${blockedTasks.length} blocked tasks escalated.`;
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'Axi',
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
    return Response.json({ status: 'error', error: error.message }, { status: 500 });
  }
});