// Auto-sync AIProject.progress_percentage when ProjectTask status changes
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Triggered by entity automation on ProjectTask create/update/delete
    const { event, data, old_data } = body;
    const projectId = data?.project_id || old_data?.project_id;

    if (!projectId) {
      return Response.json({ skipped: true, reason: 'No project_id found on task' });
    }

    // Fetch all tasks for this project
    const tasks = await base44.asServiceRole.entities.ProjectTask.filter(
      { project_id: projectId },
      '-created_date',
      500
    );

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Update the project
    await base44.asServiceRole.entities.AIProject.update(projectId, {
      progress_percentage: progressPercentage,
    });

    // If all tasks completed, mark project as completed
    if (total > 0 && completed === total) {
      const project = await base44.asServiceRole.entities.AIProject.filter(
        { id: projectId }, '-created_date', 1
      );
      if (project[0] && project[0].status !== 'completed') {
        await base44.asServiceRole.entities.AIProject.update(projectId, {
          status: 'completed',
          actual_completion_date: new Date().toISOString(),
        });
      }
    }

    console.log(`[syncProjectProgress] Project ${projectId}: ${completed}/${total} tasks completed = ${progressPercentage}%`);

    return Response.json({
      success: true,
      project_id: projectId,
      total_tasks: total,
      completed_tasks: completed,
      progress_percentage: progressPercentage,
    });
  } catch (error) {
    console.error('[syncProjectProgress] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});