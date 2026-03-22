import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * axiDistributeTaskRewards
 * Entity automation: triggers on ProjectTask update events.
 * Delegates to processTaskCompletionRewards for the actual logic.
 * Also supports direct invocation with { task_id }.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data: task, old_data, task_id: directTaskId } = body;

    let taskId = directTaskId;

    if (event) {
      // Entity automation: only care about task completions
      if (event.type !== 'update') {
        return Response.json({ skipped: true, reason: 'Only processes update events' });
      }
      if (task?.status !== 'completed') {
        return Response.json({ skipped: true, reason: 'Task not completed' });
      }
      if (old_data?.status === 'completed') {
        return Response.json({ skipped: true, reason: 'Task was already completed' });
      }
      taskId = event.entity_id;
    }

    if (!taskId) {
      return Response.json({ error: 'task_id required' }, { status: 400 });
    }

    // Delegate to processTaskCompletionRewards
    const result = await base44.asServiceRole.functions.invoke('processTaskCompletionRewards', { task_id: taskId });
    return Response.json(result);

  } catch (error) {
    console.error('axiDistributeTaskRewards error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});