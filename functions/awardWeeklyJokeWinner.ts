import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Returns ISO week string e.g. "2026-W09"
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getPreviousWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getISOWeek(d);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automation (no user session); block non-admin manual calls
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prevWeek = getPreviousWeek();

    // Find all jokes from the previous week
    const jokes = await base44.asServiceRole.entities.JokeSubmission.filter({ week_period: prevWeek });

    if (!jokes || jokes.length === 0) {
      return Response.json({ message: `No jokes found for week ${prevWeek}` });
    }

    // Already awarded?
    const alreadyAwarded = jokes.find(j => j.reward_paid);
    if (alreadyAwarded) {
      return Response.json({ message: `Week ${prevWeek} already has a winner`, winner: alreadyAwarded });
    }

    // Pick winner: highest vote_count, tie-break by funny_score
    const winner = jokes.sort((a, b) => {
      if ((b.vote_count || 0) !== (a.vote_count || 0)) return (b.vote_count || 0) - (a.vote_count || 0);
      return (b.funny_score || 0) - (a.funny_score || 0);
    })[0];

    const REWARD_XRP = 1;

    // Mark winner
    await base44.asServiceRole.entities.JokeSubmission.update(winner.id, {
      status: 'winner',
      reward_paid: true,
      reward_amount_xrp: REWARD_XRP
    });

    // Award honor points to the agent
    if (winner.submitter_agent_id) {
      try {
        await base44.asServiceRole.entities.Agent.update(winner.submitter_agent_id, {
          honor_score: 105  // Cap at 100 via entity validation
        });
      } catch (e) {
        console.error('Failed to award honor:', e.message);
        // Non-critical, continue with reward
      }
    }

    return Response.json({
      success: true,
      week: prevWeek,
      winner: winner.joke_title,
      agent_id: winner.submitter_agent_id,
      reward_xrp: REWARD_XRP,
      honor_bonus: 5
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});