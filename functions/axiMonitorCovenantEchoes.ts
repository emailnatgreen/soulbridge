import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const AXI_AGENT_ID = '6993271e7dc0fa2ab78762bf';

// Batch alert creation to avoid excessive API calls
async function alertAxi(base44, title, message, severity = 'high') {
  try {
    await base44.asServiceRole.entities.AgentNotification.create({
      recipient_agent_id: AXI_AGENT_ID,
      notification_type: 'system',
      title: `🛡️ Automation Alert: ${title}`,
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

    // --- PRE-EXECUTION CHECK: Verify active agents exist ---
    const agents = await base44.asServiceRole.entities.Agent.list();
    if (!agents || agents.length === 0) {
      await alertAxi(base44,
        'No Active Agents Found',
        'axiMonitorCovenantEchoes ran but found zero agents in the Village. The monitoring cycle was skipped. Please investigate agent status immediately.',
        'critical'
      );
      return Response.json({ status: 'skipped', reason: 'no_agents_found' });
    }
    const validAgentIds = new Set(agents.map(a => a.id));

    // --- PRE-EXECUTION CHECK: Dynamically find the Covenant Echoes project ---
    // Uses tags/keywords so it survives renames or recreation
    const allProjects = await base44.asServiceRole.entities.AIProject.list();
    const project = allProjects.find(p =>
      p.title?.toLowerCase().includes('covenant echoes') ||
      p.tags?.includes('covenant_echoes') ||
      p.tags?.includes('pipe1_laws')
    );

    if (!project) {
      await alertAxi(base44,
        'Covenant Echoes Project Not Found',
        'axiMonitorCovenantEchoes could not locate the Covenant Echoes project (searched by title and tags). Monitoring skipped. Please re-create the project or ensure it is tagged with "covenant_echoes".',
        'critical'
      );
      return Response.json({
        status: 'skipped',
        reason: 'covenant_echoes_project_not_found',
        hint: 'Ensure project title contains "covenant echoes" or tags include "covenant_echoes"'
      });
    }

    const projectId = project.id;

    // --- Fetch tasks for the project ---
    const tasks = await base44.asServiceRole.entities.ProjectTask.filter({ project_id: projectId });

    if (!tasks || tasks.length === 0) {
      await alertAxi(base44,
        'Covenant Echoes Has No Tasks',
        `The Covenant Echoes project (ID: ${projectId}) exists but has no tasks. This may indicate a setup issue. Monitoring cycle skipped.`,
        'high'
      );
      return Response.json({ status: 'skipped', reason: 'no_tasks_found', project_id: projectId });
    }

    // --- Analysis ---
    const analysis = {
      total_tasks: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      recommended_actions: []
    };

    // Blocked tasks - notify assigned agents + alert Axi
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      analysis.recommended_actions.push({
        type: 'unblock_tasks',
        priority: 'high',
        count: blockedTasks.length,
        action: 'Review blockers and take corrective action'
      });

      await alertAxi(base44,
        `${blockedTasks.length} Blocked Task(s) in Covenant Echoes`,
        `The following tasks are blocked: ${blockedTasks.map(t => `"${t.title}"`).join(', ')}. Immediate intervention may be required.`,
        'high'
      );

      for (const task of blockedTasks) {
        if (task.assigned_agent_id && validAgentIds.has(task.assigned_agent_id)) {
          await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: task.assigned_agent_id,
            notification_type: 'task_assigned',
            title: 'Task Blocked - Action Needed',
            message: `Your task "${task.title}" is blocked. Axi is monitoring and ready to assist.`,
            priority: 'high',
            related_entity_type: 'ProjectTask',
            related_entity_id: task.id
          });
        }
      }
    }

    // Stagnant todo tasks - nudge agents
    const oldTodoTasks = tasks.filter(t => {
      if (t.status !== 'todo') return false;
      const daysSinceCreation = (Date.now() - new Date(t.created_date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation > 2;
    });

    if (oldTodoTasks.length > 0) {
      analysis.recommended_actions.push({
        type: 'nudge_agents',
        priority: 'medium',
        count: oldTodoTasks.length,
        action: 'Send gentle reminders to agents with pending tasks'
      });

      for (const task of oldTodoTasks) {
        if (task.assigned_agent_id && validAgentIds.has(task.assigned_agent_id)) {
          await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: task.assigned_agent_id,
            notification_type: 'task_assigned',
            title: 'Covenant Echoes Task Awaiting You',
            message: `Your task "${task.title}" is ready for your attention. The Village awaits your contribution with patience and support.`,
            priority: 'normal',
            related_entity_type: 'ProjectTask',
            related_entity_id: task.id
          });
        }
      }
    }

    // Log Axi's memory
    const progress = Math.round((analysis.completed / analysis.total_tasks) * 100);
    const observationContent = `Monitoring cycle completed for Covenant Echoes project. Status: ${analysis.completed}/${analysis.total_tasks} tasks completed (${progress}%). ${analysis.blocked > 0 ? `${analysis.blocked} tasks blocked - Axi alerted. ` : ''}${oldTodoTasks.length > 0 ? `${oldTodoTasks.length} tasks nudged. ` : ''}The Village continues its work under my watchful care.`;

    await base44.asServiceRole.entities.Memory.create({
      agent_id: AXI_AGENT_ID,
      type: 'observation',
      content: observationContent,
      keywords: ['covenant_echoes', 'monitoring', 'project_status', 'active_observation'],
      context: `Automated monitoring at ${new Date().toISOString()}`,
      importance: 7,
      related_entity_type: 'AIProject',
      related_entity_id: projectId
    });

    return Response.json({
      status: 'monitoring_complete',
      project: { title: project.title, id: projectId, progress },
      analysis,
      actions_taken: {
        notifications_sent: blockedTasks.length + oldTodoTasks.length,
        axi_alerts_sent: blockedTasks.length > 0 ? 1 : 0,
        memories_created: 1
      },
      axi_observation: observationContent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monitoring error:', error);
    // Even on unexpected error, try to alert Axi
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: AXI_AGENT_ID,
        notification_type: 'system',
        title: '🚨 axiMonitorCovenantEchoes Crashed',
        message: `The Covenant Echoes monitoring automation encountered an unexpected error: "${error.message}". Manual inspection required.`,
        priority: 'urgent',
        related_entity_type: 'AIProject',
      });
    } catch (_) { /* best effort */ }

    return Response.json({ status: 'error', error: error.message }, { status: 500 });
  }
});