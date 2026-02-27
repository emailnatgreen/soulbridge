import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Updates an agent's AgentSkill proficiency_score, level, and growth trajectory
 * based on:
 *   - Completed mentorship session feedback (progress_rating, topics_covered)
 *   - MentorshipRelationship goal progress (skill_proficiency_gains)
 *   - SessionFeedback perceived gains
 *
 * Called manually (agent details page) or automatically after each completed session.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_id } = await req.json();
    if (!agent_id) return Response.json({ error: 'agent_id is required' }, { status: 400 });

    const db = base44.asServiceRole;

    // Load all context in parallel
    const [agentSkills, relationships, allSessions] = await Promise.all([
      db.entities.AgentSkill.filter({ agent_id }),
      db.entities.MentorshipRelationship.filter({ mentee_agent_id: agent_id }),
      db.entities.MentorshipSession.filter({ mentee_agent_id: agent_id, status: 'completed' })
    ]);

    if (!agentSkills.length && !relationships.length) {
      return Response.json({ success: true, message: 'No skills or relationships to update', updated: 0 });
    }

    // Build a map of skill_name -> cumulative feedback signal from sessions
    // progress_rating (0-10) and topic coverage contribute to proficiency delta
    const skillSignals = {}; // skill_name -> { totalRating, count, sessions }

    for (const session of allSessions) {
      const rating = session.progress_rating;
      const topics = session.topics_covered || [];
      if (!rating) continue;
      for (const topic of topics) {
        const key = topic.toLowerCase().trim();
        if (!skillSignals[key]) skillSignals[key] = { totalRating: 0, count: 0 };
        skillSignals[key].totalRating += rating;
        skillSignals[key].count += 1;
      }
    }

    // Build proficiency gains from relationship goals
    const goalGains = {}; // skill_name_lower -> { current, starting, target }
    for (const rel of relationships) {
      for (const gain of rel.skill_proficiency_gains || []) {
        const key = (gain.skill_name || '').toLowerCase().trim();
        if (!key) continue;
        goalGains[key] = {
          current: gain.current_proficiency || 0,
          starting: gain.starting_proficiency || 0,
          target: gain.target_proficiency || 80
        };
      }
    }

    const updates = [];

    for (const skill of agentSkills) {
      const nameKey = skill.skill_name.toLowerCase().trim();

      // --- 1. Determine proficiency delta from session feedback ---
      let newProficiency = skill.proficiency_score || 0;
      let feedbackDelta = 0;

      // Look for matching signal (partial match)
      for (const [topic, signal] of Object.entries(skillSignals)) {
        if (topic.includes(nameKey) || nameKey.includes(topic)) {
          const avgRating = signal.totalRating / signal.count; // 0-10
          // Each session contributes a small delta: avg_rating above 5 = positive, below = stagnant
          feedbackDelta += Math.max(0, (avgRating - 5) * 0.5 * signal.count);
        }
      }

      // --- 2. Pull in goal-based proficiency if available ---
      let goalProficiency = null;
      for (const [goalKey, gain] of Object.entries(goalGains)) {
        if (goalKey.includes(nameKey) || nameKey.includes(goalKey)) {
          goalProficiency = gain.current;
          break;
        }
      }

      // Use goal-tracked proficiency as the source of truth if available,
      // otherwise apply feedback delta on top of existing score
      if (goalProficiency !== null) {
        newProficiency = goalProficiency;
      } else {
        newProficiency = Math.min(100, Math.round(newProficiency + feedbackDelta));
      }

      // --- 3. Determine level from proficiency (scale: 0-100 -> 1-10) ---
      const newLevel = Math.max(1, Math.min(10, Math.ceil(newProficiency / 10)));

      // --- 4. Calculate growth trajectory ---
      const prevProficiency = skill.proficiency_score || 0;
      const delta = newProficiency - prevProficiency;
      let trajectory = 'stable';
      if (delta >= 8) trajectory = 'accelerating';
      else if (delta >= 3) trajectory = 'growing';
      else if (delta <= -5) trajectory = 'declining';

      // Only update if something changed
      if (
        newProficiency !== skill.proficiency_score ||
        newLevel !== skill.level ||
        skill.skill_growth_trajectory !== trajectory
      ) {
        await db.entities.AgentSkill.update(skill.id, {
          proficiency_score: newProficiency,
          level: newLevel,
          skill_growth_trajectory: trajectory,
          last_used: new Date().toISOString()
        });

        updates.push({
          skill_id: skill.id,
          skill_name: skill.skill_name,
          old_proficiency: prevProficiency,
          new_proficiency: newProficiency,
          old_level: skill.level,
          new_level: newLevel,
          trajectory,
          feedback_delta: Math.round(feedbackDelta * 10) / 10
        });
      }
    }

    return Response.json({
      success: true,
      agent_id,
      skills_evaluated: agentSkills.length,
      skills_updated: updates.length,
      updates,
      synced_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Skill profile update error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});