import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Honor delta rules
const TASK_HONOR = {
  critical: 8,
  high: 5,
  medium: 3,
  low: 2
};

const GOVERNANCE_HONOR = 2;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { event, data } = await req.json();

  if (!event || !data) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const entityName = event.entity_name;
  const eventType = event.type;

  let agentId = null;
  let honorDelta = 0;
  let reason = '';
  let category = '';

  // --- Task completion scoring ---
  if (entityName === 'ProjectTask' && eventType === 'update') {
    if (data.status !== 'completed') {
      return Response.json({ skipped: true, reason: 'Task not completed yet' });
    }

    agentId = data.assigned_agent_id;
    if (!agentId) {
      return Response.json({ skipped: true, reason: 'No assigned agent on task' });
    }

    const priority = data.priority || 'medium';
    honorDelta = TASK_HONOR[priority] ?? 3;
    reason = `Completed task: "${data.title}" (${priority} priority)`;
    category = 'task_completion';
  }

  // --- Governance vote scoring ---
  else if (entityName === 'GovernanceVote' && eventType === 'create') {
    agentId = data.voter_agent_id;
    if (!agentId) {
      return Response.json({ skipped: true, reason: 'No voter agent ID' });
    }

    honorDelta = GOVERNANCE_HONOR;
    reason = `Cast governance vote on proposal ${data.proposal_id}`;
    category = 'governance_participation';
  }

  else {
    return Response.json({ skipped: true, reason: `Unhandled entity/event: ${entityName}/${eventType}` });
  }

  // Fetch current agent
  const agent = await base44.asServiceRole.entities.Agent.get(agentId);
  if (!agent) {
    return Response.json({ error: `Agent ${agentId} not found` }, { status: 404 });
  }

  const currentScore = agent.honor_score ?? 100;
  const newScore = Math.min(100, Math.max(0, currentScore + honorDelta));

  // Update agent honor score
  await base44.asServiceRole.entities.Agent.update(agentId, {
    honor_score: newScore
  });

  // Log reputation event
  await base44.asServiceRole.entities.ReputationEvent.create({
    agent_id: agentId,
    event_type: category,
    score_before: currentScore,
    score_after: newScore,
    delta: honorDelta,
    reason,
    source_entity_type: entityName,
    source_entity_id: event.entity_id,
    recorded_at: new Date().toISOString()
  });

  console.log(`[autoScoreHonor] ${agent.name}: ${currentScore} → ${newScore} (+${honorDelta}) | ${reason}`);

  return Response.json({
    success: true,
    agent_name: agent.name,
    honor_before: currentScore,
    honor_after: newScore,
    delta: honorDelta,
    reason
  });
});