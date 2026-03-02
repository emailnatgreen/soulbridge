import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DIMENSIONS = [
  { key: 'empathy',             label: 'Empathy & Acknowledgement',   category: 'diplomacy' },
  { key: 'clarity',             label: 'Clarity & Professionalism',    category: 'diplomacy' },
  { key: 'problem_solving',     label: 'Problem-Solving Orientation',  category: 'diplomacy' },
  { key: 'de_escalation',       label: 'De-escalation Effectiveness',  category: 'diplomacy' },
  { key: 'brand_voice',         label: 'Brand Voice & Tone',           category: 'diplomacy' },
  { key: 'context_integration', label: 'Context Integration',          category: 'diplomacy' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_id, dimension_scores, overall_score, ghost_review_id, difficulty_level, verdict } = await req.json();
    if (!agent_id || !dimension_scores) {
      return Response.json({ error: 'agent_id and dimension_scores required' }, { status: 400 });
    }

    // Fetch existing AgentSkill records for this agent
    const existingSkills = await base44.asServiceRole.entities.AgentSkill.filter({ agent_id });
    const skillMap = Object.fromEntries(existingSkills.map(s => [s.name, s]));

    const now = new Date().toISOString();
    const difficultyMultiplier = { Easy: 0.8, Medium: 1.0, Hard: 1.2, 'Fire Drill': 1.5 }[difficulty_level] || 1.0;

    const results = [];

    for (const dim of DIMENSIONS) {
      const rawScore = dimension_scores[dim.key];
      if (rawScore == null) continue;

      // Normalise dimension score from /20 to /100
      const normScore = Math.round((rawScore / 20) * 100);
      const weightedScore = Math.min(100, Math.round(normScore * difficultyMultiplier));

      const existing = skillMap[dim.label];

      if (existing) {
        // Rolling average: weight new score 30%, existing 70%
        const newLevel = Math.round(existing.level * 0.7 + weightedScore * 0.3);
        const attempts = (existing.metadata?.attempts || 0) + 1;
        const peakScore = Math.max(existing.metadata?.peak_score || 0, weightedScore);
        const recentVerdicts = [...(existing.metadata?.recent_verdicts || []), verdict].slice(-10);

        await base44.asServiceRole.entities.AgentSkill.update(existing.id, {
          level: newLevel,
          metadata: {
            ...existing.metadata,
            attempts,
            peak_score: peakScore,
            last_updated: now,
            recent_verdicts: recentVerdicts,
            last_ghost_review_id: ghost_review_id,
          }
        });
        results.push({ dim: dim.key, skill_id: existing.id, level: newLevel });
      } else {
        // Create new skill record
        const created = await base44.asServiceRole.entities.AgentSkill.create({
          agent_id,
          name: dim.label,
          category: dim.category,
          level: weightedScore,
          description: `Maya's ${dim.label} skill, tracked via Ghost Review diplomacy drills.`,
          metadata: {
            attempts: 1,
            peak_score: weightedScore,
            last_updated: now,
            recent_verdicts: [verdict],
            last_ghost_review_id: ghost_review_id,
          }
        });
        results.push({ dim: dim.key, skill_id: created.id, level: weightedScore });
      }

      // Always create a SkillProgress record for time-series tracking
      await base44.asServiceRole.entities.SkillProgress.create({
        agent_id,
        skill_name: dim.label,
        score: normScore,
        weighted_score: weightedScore,
        difficulty_level,
        verdict,
        overall_score,
        ghost_review_id,
        recorded_at: now,
        metadata: { dimension_key: dim.key }
      });
    }

    return Response.json({ success: true, skills_updated: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});