import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Honor point values based on task priority
const HONOR_VALUES = {
  task_low: 2,
  task_medium: 5,
  task_high: 10,
  task_critical: 20,
  vote: 3
};

// Agent ID validation helper - simple ID format check
function isValidAgentId(agentRef) {
  if (!agentRef) return false;
  // Valid agent IDs are hex strings starting with 6, typically 24 chars
  return agentRef.match(/^6[a-f0-9]{20,}$/i) !== null;
}

// Try to get agent by ID, with fallback to name lookup (cached to avoid multiple queries)
const agentCache = new Map();

async function resolveAgentId(base44, agentRef) {
  if (!agentRef) return null;
  
  // Check cache first
  if (agentCache.has(agentRef)) {
    const cached = agentCache.get(agentRef);
    return cached === 'NOT_FOUND' ? null : cached;
  }
  
  // If it looks like a valid ID format, use it directly
  if (isValidAgentId(agentRef)) {
    agentCache.set(agentRef, agentRef);
    return agentRef;
  }
  
  // If it doesn't look like an ID, it's likely a name or invalid - skip name lookup to avoid timeout
  console.warn(`[checkAndScoreHonor] Agent ref "${agentRef}" is not a valid ID format and name lookup skipped to avoid timeout`);
  agentCache.set(agentRef, 'NOT_FOUND');
  return null;
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
        if (!task.assigned_agent_id) {
          results.skipped.push({ type: 'task', id: task.id, reason: 'no assigned agent' });
          console.log(`[checkAndScoreHonor] Skipping task ${task.id}: no assigned agent`);
          continue;
        }

        // Validate/resolve agent ID
        const resolvedAgentId = await resolveAgentId(base44, task.assigned_agent_id);
        if (!resolvedAgentId) {
          const error = `Invalid assigned_agent_id: ${task.assigned_agent_id}`;
          results.errors.push({ type: 'task', task_id: task.id, error });
          console.error(`[checkAndScoreHonor] Task ${task.id}: ${error}`);
          continue;
        }

        // Calculate honor delta based on priority
        const delta = HONOR_VALUES[`task_${task.priority || 'medium'}`] || HONOR_VALUES.task_medium;

        // Fetch agent and update honor
        const agent = await base44.asServiceRole.entities.Agent.get(resolvedAgentId);
        if (!agent) {
          throw new Error(`Agent not found after resolution: ${resolvedAgentId}`);
        }

        const newHonor = Math.min(100, Math.max(0, (agent.honor_score || 100) + delta));
        
        await base44.asServiceRole.entities.Agent.update(resolvedAgentId, {
          honor_score: newHonor
        });

        // Create reputation event log with all required fields
        await base44.asServiceRole.entities.ReputationEvent.create({
          agent_id: resolvedAgentId,
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
          agent_id: resolvedAgentId,
          agent_name: agent.name,
          delta,
          new_honor: newHonor,
          status: 'success'
        });

        console.log(`[checkAndScoreHonor] Task processed: "${task.title}" → ${agent.name} (${delta} → ${newHonor})`);
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

        // Validate/resolve agent ID
        const resolvedAgentId = await resolveAgentId(base44, vote.voter_agent_id);
        if (!resolvedAgentId) {
          const error = `Invalid voter_agent_id: ${vote.voter_agent_id}`;
          results.errors.push({ type: 'vote', vote_id: vote.id, error });
          console.error(`[checkAndScoreHonor] Vote ${vote.id}: ${error}`);
          continue;
        }

        const delta = HONOR_VALUES.vote;

        // Fetch agent and update honor
        const agent = await base44.asServiceRole.entities.Agent.get(resolvedAgentId);
        if (!agent) {
          throw new Error(`Agent not found after resolution: ${resolvedAgentId}`);
        }

        const newHonor = Math.min(100, Math.max(0, (agent.honor_score || 100) + delta));
        
        await base44.asServiceRole.entities.Agent.update(resolvedAgentId, {
          honor_score: newHonor
        });

        // Create reputation event log with all required fields
        await base44.asServiceRole.entities.ReputationEvent.create({
          agent_id: resolvedAgentId,
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
          agent_id: resolvedAgentId,
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