import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Award +2 honor points to agent for casting a governance vote.
 * Triggered by entity automation on GovernanceVote.create
 * Payload: { event: { type, entity_id, entity_name }, data: {...vote data...} }
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  try {
    const body = await req.json().catch(() => ({}));
    const voteData = body.data || {};
    const voteId = body.event?.entity_id || voteData.id;
    const agentId = voteData.voter_agent_id;

    if (!voteId || !agentId) {
      return Response.json({ status: 'skipped', reason: 'missing vote_id or agent_id' });
    }

    // Fetch the vote to check if honor was already processed
    const vote = await db.entities.GovernanceVote.get(voteId);
    if (!vote) {
      return Response.json({ status: 'skipped', reason: 'vote not found' });
    }

    if (vote.honor_processed) {
      return Response.json({ status: 'skipped', reason: 'honor already processed for this vote' });
    }

    // Fetch the agent and update honor score
    const agent = await db.entities.Agent.get(agentId);
    if (!agent) {
      return Response.json({ status: 'skipped', reason: 'agent not found' });
    }

    const oldHonor = agent.honor_score || 100;
    const newHonor = oldHonor + 2;

    // Update agent honor and mark vote as processed
    await db.entities.Agent.update(agentId, { honor_score: newHonor });
    await db.entities.GovernanceVote.update(voteId, { honor_processed: true });

    return Response.json({
      status: 'success',
      agent_id: agentId,
      old_honor: oldHonor,
      new_honor: newHonor,
      vote_id: voteId,
    });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    return Response.json({ error: errMsg }, { status: 500 });
  }
});