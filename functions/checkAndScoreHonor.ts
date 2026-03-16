import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const startTime = Date.now();
    const results = {
      tasks_processed: 0,
      votes_processed: 0,
      errors: [],
      details: []
    };

    // --- Poll ProjectTasks ---
    const unprocessedTasks = await base44.asServiceRole.entities.ProjectTask.filter(
      { status: 'completed', honor_processed: false },
      '-updated_date',
      100
    );

    for (const task of unprocessedTasks) {
      try {
        if (!task.assigned_agent_id) {
          console.log(`[checkAndScoreHonor] Skipping task ${task.id}: no assigned agent`);
          continue;
        }

        // Invoke autoScoreHonor
        const scoreRes = await base44.asServiceRole.functions.invoke('autoScoreHonor', {
          event: { type: 'update', entity_name: 'ProjectTask', entity_id: task.id },
          data: task
        });

        // Mark as processed
        await base44.asServiceRole.entities.ProjectTask.update(task.id, {
          honor_processed: true
        });

        results.tasks_processed++;
        results.details.push({
          type: 'task',
          task_id: task.id,
          title: task.title,
          agent: scoreRes.data?.agent_name,
          delta: scoreRes.data?.delta,
          status: 'success'
        });

        console.log(`[checkAndScoreHonor] Task processed: ${task.title} → ${scoreRes.data?.agent_name} (+${scoreRes.data?.delta})`);
      } catch (err) {
        results.errors.push({ type: 'task', task_id: task.id, error: err.message });
        console.error(`[checkAndScoreHonor] Task error: ${task.id} - ${err.message}`);
      }
    }

    // --- Poll GovernanceVotes ---
    const unprocessedVotes = await base44.asServiceRole.entities.GovernanceVote.filter(
      { honor_processed: false },
      '-created_date',
      100
    );

    for (const vote of unprocessedVotes) {
      try {
        if (!vote.voter_agent_id) {
          console.log(`[checkAndScoreHonor] Skipping vote ${vote.id}: no voter agent`);
          continue;
        }

        // Invoke autoScoreHonor
        const scoreRes = await base44.asServiceRole.functions.invoke('autoScoreHonor', {
          event: { type: 'create', entity_name: 'GovernanceVote', entity_id: vote.id },
          data: vote
        });

        // Mark as processed
        await base44.asServiceRole.entities.GovernanceVote.update(vote.id, {
          honor_processed: true
        });

        results.votes_processed++;
        results.details.push({
          type: 'vote',
          vote_id: vote.id,
          proposal_id: vote.proposal_id,
          agent: scoreRes.data?.agent_name,
          delta: scoreRes.data?.delta,
          status: 'success'
        });

        console.log(`[checkAndScoreHonor] Vote processed: ${scoreRes.data?.agent_name} on proposal ${vote.proposal_id} (+${scoreRes.data?.delta})`);
      } catch (err) {
        results.errors.push({ type: 'vote', vote_id: vote.id, error: err.message });
        console.error(`[checkAndScoreHonor] Vote error: ${vote.id} - ${err.message}`);
      }
    }

    const duration = Date.now() - startTime;
    const total = results.tasks_processed + results.votes_processed;
    const status = results.errors.length === 0 ? 'success' : (total > 0 ? 'warning' : 'error');
    const message = `Processed ${results.tasks_processed} tasks, ${results.votes_processed} votes (${results.errors.length} errors)`;

    // Log to AutomationLog
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Check and Score Honor',
      function_name: 'checkAndScoreHonor',
      status,
      message,
      error_detail: results.errors.length > 0 ? JSON.stringify(results.errors) : null,
      details: results,
      duration_ms: duration,
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler'
    });

    console.log(`[checkAndScoreHonor] Complete: ${message} in ${duration}ms`);

    return Response.json({
      success: status === 'success' || status === 'warning',
      summary: message,
      tasks_processed: results.tasks_processed,
      votes_processed: results.votes_processed,
      errors_count: results.errors.length,
      duration_ms: duration,
      details: results.details
    });
  } catch (error) {
    console.error('[checkAndScoreHonor] Fatal error:', error.message, error.stack);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});