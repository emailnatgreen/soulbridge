import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Honor point values based on task priority
const HONOR_VALUES = {
  task_low: 2,
  task_medium: 5,
  task_high: 10,
  task_critical: 20,
  vote: 3
};

// Simple agent ID validation - must match UUID format
function isValidAgentId(agentRef) {
  if (!agentRef) return false;
  return agentRef.match(/^6[a-f0-9]{20,}$/i) !== null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const startTime = Date.now();
    const results = {
      tasks_processed: 0,
      votes_processed: 0,
      errors: [],
      details: [],
      skipped: []
    };

    // --- Poll ProjectTasks ---
    const unprocessedTasks = await base44.asServiceRole.entities.ProjectTask.filter(
      { status: 'completed', honor_processed: false },
      '-updated_date',
      100
    );

    for (const task of unprocessedTasks) {
      try {
        // Pre-flight validation: confirm task still exists
        const existingTask = await base44.asServiceRole.entities.ProjectTask.get(task.id);
        if (!existingTask) {
          results.skipped.push({ type: 'task', id: task.id, reason: 'phantom reference - task no longer exists' });
          console.log(`[checkAndScoreHonor] Skipping task ${task.id}: phantom reference detected (entity deleted)`);
          continue;
        }

        if (!task.assigned_agent_id) {
          results.skipped.push({ type: 'task', id: task.id, reason: 'no assigned agent' });
          console.log(`[checkAndScoreHonor] Skipping task ${task.id}: no assigned agent`);
          continue;
        }

        // Validate agent ID format
        if (!isValidAgentId(task.assigned_agent_id)) {
          const error = `Invalid assigned_agent_id format: "${task.assigned_agent_id}" (must be UUID). Task skipped - requires data correction.`;
          results.errors.push({ type: 'task', task_id: task.id, error, task_title: task.title });
          console.error(`[checkAndScoreHonor] Task ${task.id}: ${error}`);
          continue;
        }
        
        const agentId = task.assigned_agent_id;

        // Calculate honor delta based on priority
        const delta = HONOR_VALUES[`task_${task.priority || 'medium'}`] || HONOR_VALUES.task_medium;

        // Fetch agent and update honor
        const agent = await base44.asServiceRole.entities.Agent.get(agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        const newHonor = Math.min(100, Math.max(0, (agent.honor_score || 100) + delta));
        
        await base44.asServiceRole.entities.Agent.update(agentId, {
          honor_score: newHonor
        });

        // Create reputation event with all required fields
        await base44.asServiceRole.entities.ReputationEvent.create({
          agent_id: agentId,
          event_type: 'project_completed',
          impact: delta,
          category: 'task_completion',
          description: `Task completed: ${task.title}`,
          related_entity_type: 'ProjectTask',
          related_entity_id: task.id,
          verified: true,
          verified_by: 'checkAndScoreHonor',
          is_public: true
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
          agent_id: agentId,
          agent_name: agent.name,
          delta,
          new_honor: newHonor,
          status: 'success'
        });

        console.log(`[checkAndScoreHonor] Task processed: "${task.title}" → ${agent.name} (+${delta} → ${newHonor})`);
      } catch (err) {
        results.errors.push({ 
          type: 'task', 
          task_id: task.id, 
          assigned_agent_id: task.assigned_agent_id,
          error: err.message 
        });
        console.error(`[checkAndScoreHonor] Task error [${task.id}]: ${err.message}`);
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
          results.skipped.push({ type: 'vote', id: vote.id, reason: 'no voter agent' });
          console.log(`[checkAndScoreHonor] Skipping vote ${vote.id}: no voter agent`);
          continue;
        }

        // Validate agent ID format
        if (!isValidAgentId(vote.voter_agent_id)) {
          const error = `Invalid voter_agent_id format: "${vote.voter_agent_id}" (must be UUID). Vote skipped - requires data correction.`;
          results.errors.push({ type: 'vote', vote_id: vote.id, error, proposal_id: vote.proposal_id });
          console.error(`[checkAndScoreHonor] Vote ${vote.id}: ${error}`);
          continue;
        }

        const delta = HONOR_VALUES.vote;
        const agentId = vote.voter_agent_id;

        // Fetch agent and update honor
        const agent = await base44.asServiceRole.entities.Agent.get(agentId);
        if (!agent) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        const newHonor = Math.min(100, Math.max(0, (agent.honor_score || 100) + delta));
        
        await base44.asServiceRole.entities.Agent.update(agentId, {
          honor_score: newHonor
        });

        // Create reputation event with all required fields
        await base44.asServiceRole.entities.ReputationEvent.create({
          agent_id: agentId,
          event_type: 'vote_cast',
          impact: delta,
          category: 'governance_participation',
          description: `Vote cast on proposal ${vote.proposal_id}: ${vote.vote_choice}`,
          related_entity_type: 'GovernanceVote',
          related_entity_id: vote.id,
          verified: true,
          verified_by: 'checkAndScoreHonor',
          is_public: true
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
          agent_id: agentId,
          agent_name: agent.name,
          delta,
          new_honor: newHonor,
          status: 'success'
        });

        console.log(`[checkAndScoreHonor] Vote processed: ${agent.name} on proposal ${vote.proposal_id} (+${delta} → ${newHonor})`);
      } catch (err) {
        results.errors.push({ 
          type: 'vote', 
          vote_id: vote.id, 
          voter_agent_id: vote.voter_agent_id,
          error: err.message 
        });
        console.error(`[checkAndScoreHonor] Vote error [${vote.id}]: ${err.message}`);
      }
    }

    const duration = Date.now() - startTime;
    const total = results.tasks_processed + results.votes_processed;
    const status = results.errors.length === 0 ? 'success' : (total > 0 ? 'warning' : 'error');
    const message = `Processed ${results.tasks_processed} tasks, ${results.votes_processed} votes (${results.errors.length} errors, ${results.skipped.length} skipped)`;

    // Log to AutomationLog
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Check and Score Honor',
      function_name: 'checkAndScoreHonor',
      status,
      message,
      error_detail: results.errors.length > 0 ? JSON.stringify(results.errors.slice(0, 10)) : null,
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
      skipped_count: results.skipped.length,
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