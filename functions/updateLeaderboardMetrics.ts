import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const VERDICT_SCORE = { 'Refined Vintage': 3, 'Acceptable': 2, 'Synthetic Slop': 1 };
const DIM_MAP = {
  empathy:             'Empathy & Acknowledgement',
  clarity:             'Clarity & Professionalism',
  problem_solving:     'Problem-Solving Orientation',
  de_escalation:       'De-escalation Effectiveness',
  brand_voice:         'Brand Voice & Tone',
  context_integration: 'Context Integration',
};
const DIMS = Object.keys(DIM_MAP);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow both user-triggered and service-role calls
    const { agent_id } = await req.json();
    if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

    // Fetch agent, skills, and reviews in parallel
    const [agents, skills, reviews] = await Promise.all([
      base44.asServiceRole.entities.Agent.filter({ id: agent_id }, 'name', 1),
      base44.asServiceRole.entities.AgentSkill.filter({ agent_id, skill_category: 'diplomacy' }),
      base44.asServiceRole.entities.GhostReview.filter({ assigned_agent_id: agent_id, status: 'Evaluated' }),
    ]);

    const agent = agents[0];
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

    // --- Calculate dimension scores from AgentSkill records ---
    // updateDiplomacySkills stores skills by full label name (e.g. "Empathy & Acknowledgement")
    const dimScores = {};
    for (const dim of DIMS) {
      const fullLabel = DIM_MAP[dim];
      const skill = skills.find(s => s.name === fullLabel || s.skill_name === fullLabel);
      dimScores[dim] = skill?.level ?? null;
    }

    // Overall diplomacy score: average of available dimension scores
    const availableScores = Object.values(dimScores).filter(v => v !== null);
    const overallScore = availableScores.length
      ? Math.round(availableScores.reduce((a, b) => a + b, 0) / availableScores.length)
      : 0;

    // --- Review metrics ---
    const reviewsCompleted = reviews.length;

    let verdictScoreSum = 0;
    let refinedVintageCount = 0;

    for (const r of reviews) {
      const verdict = r.ai_verdict || 'Acceptable';
      verdictScoreSum += VERDICT_SCORE[verdict] ?? 2;
      if (verdict === 'Refined Vintage') refinedVintageCount++;
    }

    const averageVerdictScore = reviewsCompleted > 0
      ? Math.round((verdictScoreSum / reviewsCompleted) * 100) / 100
      : 0;

    const refinedVintageRatio = reviewsCompleted > 0
      ? Math.round((refinedVintageCount / reviewsCompleted) * 10000) / 100
      : 0;

    // --- Check for existing entry ---
    const existing = await base44.asServiceRole.entities.DiplomacyLeaderboardEntry.filter({ agent_id });
    const entryData = {
      agent_id,
      agent_name: agent.name,
      agent_avatar_url: agent.avatar_url || null,
      agent_role: agent.role || 'citizen',
      overall_diplomacy_score: overallScore,
      dimension_scores: dimScores,
      reviews_completed: reviewsCompleted,
      average_verdict_score: averageVerdictScore,
      refined_vintage_ratio: refinedVintageRatio,
      honor_score: agent.honor_score ?? 100,
      last_updated: new Date().toISOString(),
    };

    let entry;
    if (existing.length > 0) {
      entry = await base44.asServiceRole.entities.DiplomacyLeaderboardEntry.update(existing[0].id, entryData);
    } else {
      entry = await base44.asServiceRole.entities.DiplomacyLeaderboardEntry.create(entryData);
    }

    return Response.json({ success: true, entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});