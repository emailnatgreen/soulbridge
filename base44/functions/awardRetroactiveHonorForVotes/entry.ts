import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * One-time script to award +2 honor retroactively to all agents
 * for governance votes already cast but not yet processed for honor.
 * 
 * Payload: {} (no parameters needed)
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  try {
    // Fetch all governance votes where honor_processed is false
    const unprocessedVotes = await db.entities.GovernanceVote.filter(
      { honor_processed: false },
      '-created_date',
      10000
    );

    if (!Array.isArray(unprocessedVotes) || unprocessedVotes.length === 0) {
      return Response.json({ status: 'success', processed_count: 0, message: 'No unprocessed votes found' });
    }

    const updates = {};
    const votes_updated = [];

    // Group honor awards by agent_id
    for (const vote of unprocessedVotes) {
      const agentId = vote.voter_agent_id;
      if (!agentId) continue;
      if (!updates[agentId]) updates[agentId] = [];
      updates[agentId].push(vote.id);
    }

    // Batch fetch all agents
    const agentIds = Object.keys(updates);
    const agents = await Promise.all(
      agentIds.map(id => db.entities.Agent.get(id))
    );

    // Update honors and mark votes in batches
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      const agent = agents[i];
      const voteIds = updates[agentId];
      if (!agent || !voteIds) continue;

      const honorAwarded = voteIds.length * 2;
      const newHonor = (agent.honor_score || 100) + honorAwarded;

      await db.entities.Agent.update(agentId, { honor_score: newHonor });
      
      // Mark votes as processed in parallel batches of 10
      for (let j = 0; j < voteIds.length; j += 10) {
        await Promise.all(
          voteIds.slice(j, j + 10).map(vid => 
            db.entities.GovernanceVote.update(vid, { honor_processed: true })
          )
        );
        votes_updated.push(...voteIds.slice(j, j + 10));
      }
    }

    return Response.json({
      status: 'success',
      processed_count: votes_updated.length,
      agents_updated: Object.keys(updates).length,
      votes_updated,
    });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    return Response.json({ error: errMsg }, { status: 500 });
  }
});