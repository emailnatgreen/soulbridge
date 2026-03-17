import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Helper function to log all automations
async function logAutomationEvent(status, message, details, errorDetail, base44) {
  try {
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Honor Score: Task Completion / Governance Vote',
      function_name: 'autoScoreHonor',
      status,
      message,
      error_detail: errorDetail,
      details,
      duration_ms: 0,
      run_at: new Date().toISOString(),
      triggered_by: 'entity'
    });
  } catch (e) {
    console.error('[autoScoreHonor] Failed to log automation event:', e.message);
  }
}

// Honor delta rules
const TASK_HONOR = {
  critical: 8,
  high: 5,
  medium: 3,
  low: 2
};

const GOVERNANCE_HONOR = 2;

Deno.serve(async (req) => {
  try {
  const base44 = createClientFromRequest(req);
  
  // Make base44 available to logAutomationEvent
  const originalLogAutomationEvent = logAutomationEvent;
  const logAutomationEventWithClient = (status, message, details, errorDetail) => 
    originalLogAutomationEvent(status, message, details, errorDetail, base44);
 
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { event, data } = body;

  if (!event || !data) {
    await logAutomationEventWithClient('error', 'Invalid payload structure', {}, 'Missing event or data in request');
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Blacklist phantom/corrupted task
  if (event.entity_id === '69a93d3719537facffb4dd61') {
    await logAutomationEventWithClient('skipped', 'Phantom entity blacklisted', { entity_id: event.entity_id }, null);
    return Response.json({ skipped: true, reason: 'Phantom entity blacklisted' });
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
    await logAutomationEventWithClient('skipped', `Unhandled entity/event: ${entityName}/${eventType}`, { entityName, eventType }, null);
    return Response.json({ skipped: true, reason: `Unhandled entity/event: ${entityName}/${eventType}` });
  }

  try {
    // Fetch current agent
    const agents = await base44.asServiceRole.entities.Agent.filter({ id: agentId });
    const agent = agents?.[0];
    if (!agent) {
      await logAutomationEvent('skipped', `Agent ${agentId} not found`, { agentId, entityName }, null);
      return Response.json({ skipped: true, reason: `Agent ${agentId} not found` });
    }

    const currentScore = agent.honor_score ?? 100;
    const newScore = Math.min(100, Math.max(0, currentScore + honorDelta));

    // Update agent honor score
    await base44.asServiceRole.entities.Agent.update(agentId, {
      honor_score: newScore
    });

    // Log reputation event
    const eventTypeMap = {
      task_completion: 'project_completed',
      governance_participation: 'vote_cast'
    };

    await base44.asServiceRole.entities.ReputationEvent.create({
      agent_id: agentId,
      event_type: eventTypeMap[category] || 'milestone_achieved',
      impact: honorDelta,
      category,
      description: reason,
      related_entity_type: entityName,
      related_entity_id: event.entity_id,
      verified: true,
      verified_by: 'autoScoreHonor',
      is_public: true
    });

    console.log(`[autoScoreHonor] ${agent.name}: ${currentScore} → ${newScore} (+${honorDelta}) | ${reason}`);

    // Log successful execution
    await logAutomationEvent('success', reason, { agent_id: agentId, agent_name: agent.name, honor_before: currentScore, honor_after: newScore, delta: honorDelta }, null);

    return Response.json({
      success: true,
      agent_name: agent.name,
      honor_before: currentScore,
      honor_after: newScore,
      delta: honorDelta,
      reason
    });
  } catch (scoringErr) {
    console.error(`[autoScoreHonor] Failed to process honor for agent ${agentId}:`, scoringErr.message);
    await logAutomationEvent('error', `Failed to process honor: ${scoringErr.message}`, { agentId, entityName }, scoringErr.message);
    return Response.json({ skipped: true, reason: `Failed to process honor: ${scoringErr.message}` });
  }
  } catch (err) {
    console.error('autoScoreHonor error:', err.message, err.stack);
    try {
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'Honor Score: Task Completion / Governance Vote',
        function_name: 'autoScoreHonor',
        status: 'error',
        message: `Failed to process honor event for entity ${event?.entity_id}`,
        error_detail: err.message,
        details: { event_id: event?.entity_id, entity_name: event?.entity_name },
        run_at: new Date().toISOString(),
        triggered_by: 'entity'
      });
    } catch (logErr) {
      console.error('Failed to log autoScoreHonor error:', logErr.message);
    }
    return Response.json({ error: err.message }, { status: 500 });
  }
});