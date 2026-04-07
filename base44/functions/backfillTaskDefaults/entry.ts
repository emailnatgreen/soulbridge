import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Backfill missing due_date and reward_drops on ProjectTask records.
 * 
 * Rules:
 *  - due_date: If null, set to project target_completion_date or 30 days from task creation.
 *  - reward_drops: If null/0, calculate from priority × estimated_hours.
 *    critical=15000/hr, high=10000/hr, medium=7500/hr, low=5000/hr.
 *    Minimum 25000 drops per task.
 * 
 * Admin-only. Dry run by default — pass { "commit": true } to actually write.
 */

const RATE_PER_HOUR = {
  critical: 15000,
  high: 10000,
  medium: 7500,
  low: 5000,
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch {}
    const commit = body.commit === true;

    // Fetch all tasks and projects
    const allTasks = await base44.asServiceRole.entities.ProjectTask.list('-created_date', 2000);
    const allProjects = await base44.asServiceRole.entities.AIProject.list('-created_date', 500);
    const projectMap = Object.fromEntries(allProjects.map(p => [p.id, p]));

    const needsDueDate = allTasks.filter(t => !t.due_date);
    const needsReward = allTasks.filter(t => !t.reward_drops);

    const patches = [];

    for (const task of allTasks) {
      const patch = {};

      // Backfill due_date
      if (!task.due_date) {
        const project = projectMap[task.project_id];
        if (project?.target_completion_date) {
          patch.due_date = project.target_completion_date;
        } else {
          // Default: 30 days from task creation
          const created = new Date(task.created_date);
          created.setDate(created.getDate() + 30);
          patch.due_date = created.toISOString();
        }
      }

      // Backfill reward_drops
      if (!task.reward_drops) {
        const hours = task.estimated_hours || 4;
        const rate = RATE_PER_HOUR[task.priority] || RATE_PER_HOUR.medium;
        patch.reward_drops = Math.max(hours * rate, 25000);
      }

      if (Object.keys(patch).length > 0) {
        patches.push({ task_id: task.id, title: task.title, patch });
      }
    }

    if (commit && patches.length > 0) {
      // Process a limited chunk per invocation to avoid rate limits
      const chunkSize = body.chunk_size || 25;
      const offset = body.offset || 0;
      const chunk = patches.slice(offset, offset + chunkSize);
      let updated = 0;
      for (const { task_id, patch } of chunk) {
        await base44.asServiceRole.entities.ProjectTask.update(task_id, patch);
        updated++;
        // Small delay between each write
        if (updated % 5 === 0) await new Promise(r => setTimeout(r, 800));
      }
      const remaining = patches.length - offset - updated;
      return Response.json({
        status: remaining > 0 ? 'partial' : 'committed',
        tasks_updated: updated,
        offset_used: offset,
        next_offset: offset + updated,
        remaining,
        total_needing_due_date: needsDueDate.length,
        total_needing_reward_drops: needsReward.length,
      });
    }

    return Response.json({
      status: 'dry_run',
      tasks_needing_due_date: needsDueDate.length,
      tasks_needing_reward_drops: needsReward.length,
      total_patches: patches.length,
      sample_patches: patches.slice(0, 5),
      note: 'Pass { "commit": true } to apply all patches.',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});