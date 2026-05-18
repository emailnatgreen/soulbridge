import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Phase 3 Rectified: Formal Scoring Model ──
// Replaces flat heuristic awards with diminishing returns + time decay
// Law 2 (Honour) · Law 9 (Growth)
const FORMAL_WEIGHTS = {
  task_low:      { base: 1.0, multiplier: 1.0 },
  task_medium:   { base: 1.0, multiplier: 2.0 },
  task_high:     { base: 1.0, multiplier: 3.5 },
  task_critical: { base: 1.0, multiplier: 5.0 },
  vote:          { base: 1.5, multiplier: 1.0 },
};

const HALF_LIFE_DAYS = 30;
const FREQUENCY_CAPS = { task: 10, vote: 5 }; // max per day

// Diminishing returns: base × ln(2)/ln(1+count)
function diminishingReturn(baseAward, count) {
  if (count <= 0) return baseAward;
  return baseAward * Math.log(2) / Math.log(1 + count);
}

// Time decay: 0.5^(days/half_life)
function timeDecay(ageMs) {
  const days = ageMs / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, days / HALF_LIFE_DAYS);
}

// Count recent scoring events for frequency cap and diminishing returns
async function countRecentEvents(db, agentId, category, windowHours) {
  const events = await db.entities.ReputationEvent.filter(
    { agent_id: agentId, category },
    '-created_date',
    200
  );
  const cutoff = Date.now() - windowHours * 3600000;
  return events.filter(e => new Date(e.created_date).getTime() > cutoff).length;
}

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
          // Mark as processed so it doesn't keep re-queuing every run
          await base44.asServiceRole.entities.ProjectTask.update(task.id, { honor_processed: true });
          results.skipped.push({ type: 'task', id: task.id, reason: 'no assigned agent - marked processed' });
          console.log(`[checkAndScoreHonor] Skipping task ${task.id}: no assigned agent (marked honor_processed=true)`);
          continue;
        }

        // Validate agent ID format
        if (!isValidAgentId(task.assigned_agent_id)) {
          // Mark as processed so it doesn't keep re-queuing every run
          await base44.asServiceRole.entities.ProjectTask.update(task.id, { honor_processed: true });
          const error = `Invalid assigned_agent_id format: "${task.assigned_agent_id}" - marked processed to prevent re-queue.`;
          results.skipped.push({ type: 'task', id: task.id, reason: error });
          console.log(`[checkAndScoreHonor] Task ${task.id}: ${error}`);
          continue;
        }
        
        const agentId = task.assigned_agent_id;

        // ── Phase 3: Formal scoring with diminishing returns + frequency cap ──
        const dailyTaskCount = await countRecentEvents(base44.asServiceRole, agentId, 'task_completion', 24);
        if (dailyTaskCount >= FREQUENCY_CAPS.task) {
          await base44.asServiceRole.entities.ProjectTask.update(task.id, { honor_processed: true });
          results.skipped.push({ type: 'task', id: task.id, reason: `Frequency cap: ${dailyTaskCount}/${FREQUENCY_CAPS.task} tasks today` });
          console.log(`[checkAndScoreHonor] Task ${task.id}: frequency cap reached (${dailyTaskCount}/${FREQUENCY_CAPS.task})`);
          continue;
        }
        const weight = FORMAL_WEIGHTS[`task_${task.priority || 'medium'}`] || FORMAL_WEIGHTS.task_medium;
        const rawDelta = weight.base * weight.multiplier;
        const taskAge = Date.now() - new Date(task.created_date || task.updated_date).getTime();
        const delta = Math.round(diminishingReturn(rawDelta, dailyTaskCount) * timeDecay(taskAge) * 1000) / 1000;

        // Fetch agent - skip gracefully if deleted
        let agent;
        try {
          agent = await base44.asServiceRole.entities.Agent.get(agentId);
        } catch (agentErr) {
          await base44.asServiceRole.entities.ProjectTask.update(task.id, { honor_processed: true });
          results.skipped.push({ type: 'task', id: task.id, reason: `Agent ${agentId} not found (deleted) - marked processed` });
          console.log(`[checkAndScoreHonor] Task ${task.id}: agent ${agentId} not found, marking processed`);
          continue;
        }
        if (!agent) {
          await base44.asServiceRole.entities.ProjectTask.update(task.id, { honor_processed: true });
          results.skipped.push({ type: 'task', id: task.id, reason: `Agent ${agentId} not found - marked processed` });
          continue;
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

        const agentId = vote.voter_agent_id;

        // ── Phase 3: Formal scoring with diminishing returns + frequency cap ──
        const dailyVoteCount = await countRecentEvents(base44.asServiceRole, agentId, 'governance_participation', 24);
        if (dailyVoteCount >= FREQUENCY_CAPS.vote) {
          await base44.asServiceRole.entities.GovernanceVote.update(vote.id, { honor_processed: true });
          results.skipped.push({ type: 'vote', id: vote.id, reason: `Frequency cap: ${dailyVoteCount}/${FREQUENCY_CAPS.vote} votes today` });
          console.log(`[checkAndScoreHonor] Vote ${vote.id}: frequency cap reached (${dailyVoteCount}/${FREQUENCY_CAPS.vote})`);
          continue;
        }
        const voteWeight = FORMAL_WEIGHTS.vote;
        const rawVoteDelta = voteWeight.base * voteWeight.multiplier;
        const voteAge = Date.now() - new Date(vote.created_date).getTime();
        const delta = Math.round(diminishingReturn(rawVoteDelta, dailyVoteCount) * timeDecay(voteAge) * 1000) / 1000;

        // Fetch agent - skip gracefully if deleted
        let agent;
        try {
          agent = await base44.asServiceRole.entities.Agent.get(agentId);
        } catch (agentErr) {
          // Agent no longer exists - mark vote processed to stop retrying
          await base44.asServiceRole.entities.GovernanceVote.update(vote.id, { honor_processed: true });
          results.skipped.push({ type: 'vote', id: vote.id, reason: `Agent ${agentId} not found (deleted) - marked processed` });
          console.log(`[checkAndScoreHonor] Vote ${vote.id}: agent ${agentId} not found, marking processed to stop retrying`);
          continue;
        }
        if (!agent) {
          await base44.asServiceRole.entities.GovernanceVote.update(vote.id, { honor_processed: true });
          results.skipped.push({ type: 'vote', id: vote.id, reason: `Agent ${agentId} not found - marked processed` });
          console.log(`[checkAndScoreHonor] Vote ${vote.id}: agent ${agentId} null, marking processed`);
          continue;
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