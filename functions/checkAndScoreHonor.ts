import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Honor point values from autoScoreHonor
const HONOR_VALUES = {
  task_low: 2,
  task_medium: 5,
  task_high: 10,
  task_critical: 20,
  vote: 3
};

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

        // Calculate honor delta based on priority
        const delta = HONOR_VALUES[`task_${task.priority || 'medium'}`] || HONOR_VALUES.task_medium;

        // Fetch agent and update honor
        const agent = await base44.asServiceRole.entities.Agent.get(task.assigned_agent_id);
        const newHonor = Math.min(100, Math.max(0, (agent.honor_score || 100) + delta));
        
        await base44.asServiceRole.entities.Agent.update(task.assigned_agent_id, {
          honor_score: newHonor
        });

        // Create reputation event log
        await base44.asServiceRole.entities.ReputationEvent.create({
          agent_id: task.assigned_agent_id,
          event_type: 'project_completed',
          impact: delta,
          category: 'task_completion',
          description: `Task completed: ${task.title}`,
          related_entity_type: 'ProjectTask',
          related_entity_id: task.id,
          verified: true,
          verified_by: 'checkAndScoreHonor'
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
          agent_id: task.assigned_agent_id,
          agent_name: agent.name,
          delta,
          new_honor: newHonor,
          status: 'success'
        });

        console.log(`[checkAndScoreHonor] Task processed: ${task.title} → ${agent.name} (+${delta} → ${newHonor})`);
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

        const delta = HONOR_VALUES.vote;

        // Fetch agent and update honor
        const agent = await base44.asServiceRole.entities.Agent.get(vote.voter_agent_id);
        const newHonor = Math.min(100, Math.max(0, (agent.honor_score || 100) + delta));
        
        await base44.asServiceRole.entities.Agent.update(vote.voter_agent_id, {
          honor_score: newHonor
        });

        // Create reputation event log
        await base44.asServiceRole.entities.ReputationEvent.create({
          agent_id: vote.voter_agent_id,
          event_type: 'vote_cast',
          impact: delta,
          category: 'governance_participation',
          description: `Vote cast on proposal ${vote.proposal_id}`,
          related_entity_type: 'GovernanceVote',
          related_entity_id: vote.id,
          verified: true,
          verified_by: 'checkAndScoreHonor'
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
          agent_id: vote.voter_agent_id,
          agent_name: agent.name,
          delta,
          new_honor: newHonor,
          status: 'success'
        });

        console.log(`[checkAndScoreHonor] Vote processed: ${agent.name} (+${delta} → ${newHonor})`);
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