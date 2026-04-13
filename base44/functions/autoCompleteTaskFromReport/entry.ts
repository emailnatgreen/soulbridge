import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COMPLETION_KEYWORDS = [
  'completed', 'done', 'finished', 'resolved', 'task complete',
  'marked complete', 'work complete', 'delivered', 'closed', 'all done',
];

const TASK_ID_PATTERN = /task[_\s]?id[:\s]+([a-f0-9]{24})/i;
const TASK_REF_PATTERN = /\[task:([a-f0-9]{24})\]/i;

function extractTaskId(content) {
  const m = content?.match(TASK_ID_PATTERN) || content?.match(TASK_REF_PATTERN);
  return m ? m[1] : null;
}

function hasCompletionSignal(content) {
  if (!content) return false;
  const lower = content.toLowerCase();
  return COMPLETION_KEYWORDS.some(kw => lower.includes(kw));
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    // Support both direct call and entity automation payload
    const message = body?.data || body?.message || null;
    const messageId = body?.event?.entity_id || body?.message_id || null;

    let content = message?.content || message?.message || '';
    let metadata = message?.metadata || {};
    let agentId = message?.agent_id || message?.sender_id || null;

    // If triggered by entity automation but data wasn't in payload, fetch it
    if (!content && messageId) {
      const msgs = await base44.asServiceRole.entities.AgentMessage.filter({ id: messageId });
      if (msgs.length > 0) {
        content = msgs[0].content || msgs[0].message || '';
        metadata = msgs[0].metadata || {};
        agentId = msgs[0].agent_id || msgs[0].sender_id || null;
      }
    }

    // Determine task_id — from metadata first, then parse content
    const taskId = metadata?.task_id || extractTaskId(content);

    if (!taskId) {
      return Response.json({ skipped: true, reason: 'No task_id found in message' });
    }

    if (!hasCompletionSignal(content) && !metadata?.status === 'completed') {
      return Response.json({ skipped: true, reason: 'No completion signal detected' });
    }

    // Fetch the task
    const tasks = await base44.asServiceRole.entities.ProjectTask.filter({ id: taskId });
    if (!tasks.length) {
      return Response.json({ skipped: true, reason: `Task ${taskId} not found` });
    }

    const task = tasks[0];

    if (task.status === 'completed') {
      return Response.json({ skipped: true, reason: 'Task already completed' });
    }

    const now = new Date().toISOString();

    // Mark task complete
    await base44.asServiceRole.entities.ProjectTask.update(taskId, {
      status: 'completed',
      completed_date: now,
      honor_processed: true,
      actual_hours: task.estimated_hours || null,
    });

    // Generate a KineticUnit for the task completion
    await base44.asServiceRole.entities.KineticUnit.create({
      agent_id: agentId || task.assigned_agent_id,
      activity_type: 'task_completion',
      title: `Task Completed: ${task.title}`,
      description: `Auto-recorded via AgentMessage completion signal. Task: ${task.title}`,
      xp_awarded: Math.round((task.reward_drops || 50000) / 1000),
      drops_awarded: task.reward_drops || 50000,
      project_id: task.project_id,
      task_id: taskId,
      recorded_at: now,
      source: 'auto_completion_trigger',
    });

    // Log the automation run
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Auto Complete Task From Report',
      function_name: 'autoCompleteTaskFromReport',
      status: 'success',
      message: `Task "${task.title}" auto-completed from AgentMessage completion signal`,
      details: { task_id: taskId, agent_id: agentId, task_title: task.title },
      run_at: now,
      triggered_by: 'entity_event',
    });

    return Response.json({
      success: true,
      task_id: taskId,
      task_title: task.title,
      completed_at: now,
      kinetic_unit_created: true,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});