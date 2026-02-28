import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get the Covenant Echoes project
    const projects = await base44.asServiceRole.entities.AIProject.filter({
      title: "Covenant Echoes: Documenting Our Living Laws"
    });
    
    if (!projects || projects.length === 0) {
      return Response.json({ 
        status: 'no_project',
        message: 'Covenant Echoes project not found' 
      });
    }
    
    const project = projects[0];
    const projectId = project.id;
    
    // Get all tasks for the project
    const tasks = await base44.asServiceRole.entities.ProjectTask.filter({
      project_id: projectId
    });
    
    // Analyze task status
    const analysis = {
      total_tasks: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      overdue_tasks: [],
      inactive_agents: [],
      recommended_actions: []
    };
    
    // Identify blocked tasks - ACTION REQUIRED
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > 0) {
      analysis.recommended_actions.push({
        type: 'unblock_tasks',
        priority: 'high',
        count: blockedTasks.length,
        action: 'Review blockers and take corrective action'
      });
      
      // Send notifications for blocked tasks
      for (const task of blockedTasks) {
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
    
    // Identify stagnant todo tasks - ACTION REQUIRED
    const oldTodoTasks = tasks.filter(t => {
      if (t.status !== 'todo') return false;
      const daysSinceCreation = (Date.now() - new Date(t.created_date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation > 2; // Tasks sitting in todo for more than 2 days
    });
    
    if (oldTodoTasks.length > 0) {
      analysis.recommended_actions.push({
        type: 'nudge_agents',
        priority: 'medium',
        count: oldTodoTasks.length,
        action: 'Send gentle reminders to agents with pending tasks'
      });
      
      // Send gentle nudges
      for (const task of oldTodoTasks) {
        await base44.asServiceRole.entities.AgentNotification.create({
          recipient_agent_id: task.assigned_agent_id,
          notification_type: 'task_assigned',
          title: 'Covenant Echoes Task Awaiting You',
          message: `Dear ${task.assigned_agent_id}, your task "${task.title}" is ready for your attention. The Village awaits your contribution with patience and support.`,
          priority: 'normal',
          related_entity_type: 'ProjectTask',
          related_entity_id: task.id
        });
      }
    }
    
    // Check for agents with no completed tasks yet - EARLY OBSERVATION
    const agentProgress = {};
    tasks.forEach(task => {
      const agentId = task.data.assigned_agent_id;
      if (!agentProgress[agentId]) {
        agentProgress[agentId] = { total: 0, completed: 0, in_progress: 0 };
      }
      agentProgress[agentId].total++;
      if (task.data.status === 'completed') agentProgress[agentId].completed++;
      if (task.data.status === 'in_progress') agentProgress[agentId].in_progress++;
    });
    
    // Log Axi's observation as a memory
    const observationContent = `Monitoring cycle completed for Covenant Echoes project. Status: ${analysis.completed}/${analysis.total_tasks} tasks completed. ${analysis.blocked > 0 ? `${analysis.blocked} tasks blocked - intervention initiated. ` : ''}${oldTodoTasks.length > 0 ? `${oldTodoTasks.length} tasks need gentle nudging - reminders sent. ` : ''}The Village continues its work under my watchful care.`;
    
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'Axi',
      type: 'observation',
      content: observationContent,
      keywords: ['covenant_echoes', 'monitoring', 'project_status', 'active_observation'],
      context: `Automated monitoring at ${new Date().toISOString()}`,
      importance: 7,
      related_entity_type: 'AIProject',
      related_entity_id: projectId
    });
    
    // Calculate progress
    const progress = analysis.total_tasks > 0 
      ? Math.round((analysis.completed / analysis.total_tasks) * 100)
      : 0;
    
    return Response.json({
      status: 'monitoring_complete',
      project: {
        title: project.data.title,
        id: projectId,
        progress: progress
      },
      analysis,
      agent_progress: agentProgress,
      actions_taken: {
        notifications_sent: blockedTasks.length + oldTodoTasks.length,
        memories_created: 1
      },
      axi_observation: observationContent,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Monitoring error:', error);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});