import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Automated Skill Gap Analysis — runs periodically to:
 * 1. Re-evaluate every active mentee's AgentSkill proficiency against their MentorshipRelationship goals
 * 2. Update skill proficiency gains on the relationship
 * 3. Flag stagnant relationships (goals not closing) as WellbeingAlerts
 * 4. Refresh mentorship focus_areas based on updated gaps
 *
 * Can also be triggered manually from the UI with a specific relationship_id for on-demand analysis.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support both scheduled (service role) and manual (user) invocation
    let isScheduled = false;
    let targetRelationshipId = null;

    try {
      const body = await req.json();
      targetRelationshipId = body?.relationship_id || null;
    } catch (_) {
      // No body — likely scheduled
      isScheduled = true;
    }

    // Auth: manual callers must be authenticated; scheduled runs as service role
    if (!isScheduled) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = base44.asServiceRole;

    // Load all active mentorship relationships (or just the target one)
    const relationships = targetRelationshipId
      ? [await db.entities.MentorshipRelationship.read(targetRelationshipId)]
      : await db.entities.MentorshipRelationship.filter({ status: 'active' });

    if (!relationships.length) {
      return Response.json({ success: true, message: 'No active relationships to analyze', updated: 0 });
    }

    // Load all skills and sessions in bulk to avoid N+1 queries
    const [allSkills, allSessions, allAlerts] = await Promise.all([
      db.entities.AgentSkill.list(),
      db.entities.MentorshipSession.filter({ status: 'completed' }),
      db.entities.WellbeingAlert.filter({ status: 'active' })
    ]);

    const results = [];
    const STAGNATION_SESSION_THRESHOLD = 3;   // sessions without progress before flagging
    const PROFICIENCY_CLOSE_THRESHOLD = 10;   // pts needed to consider a goal gap "closing"

    for (const rel of relationships) {
      if (!rel) continue;

      const menteeId = rel.mentee_agent_id;
      const menteeSkills = allSkills.filter(s => s.agent_id === menteeId);
      const relSessions = allSessions.filter(s => s.relationship_id === rel.id);
      const goals = rel.goals || [];

      if (!goals.length && !rel.focus_areas?.length) {
        results.push({ relationship_id: rel.id, skipped: true, reason: 'no goals or focus areas' });
        continue;
      }

      // --- 1. Update skill_proficiency_gains for each goal ---
      const updatedGains = (rel.skill_proficiency_gains || []).map(gain => ({ ...gain }));

      let closingGaps = 0;
      let stagnantGaps = 0;
      const newFocusAreas = [];

      for (const goal of goals) {
        if (!goal.skill_related) continue;

        const matchedSkill = menteeSkills.find(s =>
          s.skill_name?.toLowerCase().includes(goal.skill_related.toLowerCase()) ||
          goal.skill_related.toLowerCase().includes(s.skill_name?.toLowerCase())
        );

        const existingGain = updatedGains.find(g =>
          g.skill_name?.toLowerCase() === goal.skill_related?.toLowerCase()
        );

        const currentProficiency = matchedSkill?.proficiency_score ?? 0;
        const currentLevel = matchedSkill?.level ?? 0;

        if (existingGain) {
          const delta = currentProficiency - (existingGain.starting_proficiency || 0);
          existingGain.current_proficiency = currentProficiency;
          if (delta >= PROFICIENCY_CLOSE_THRESHOLD) {
            closingGaps++;
          } else if (relSessions.length >= STAGNATION_SESSION_THRESHOLD) {
            stagnantGaps++;
            newFocusAreas.push(goal.skill_related);
          }
        } else {
          // First time tracking this skill for this relationship
          updatedGains.push({
            skill_id: matchedSkill?.skill_id || goal.skill_related.toLowerCase().replace(/\s+/g, '_'),
            skill_name: goal.skill_related,
            starting_proficiency: currentProficiency,
            current_proficiency: currentProficiency,
            target_proficiency: 80 // default target; can be refined
          });
          newFocusAreas.push(goal.skill_related);
        }
      }

      // --- 2. Calculate recent session progress avg ---
      const recentSessions = relSessions.slice(-5);
      const avgProgressRating = recentSessions.length
        ? recentSessions.reduce((s, p) => s + (p.progress_rating || 5), 0) / recentSessions.length
        : null;

      // --- 3. Build updated focus_areas from stagnant gaps ---
      const refreshedFocusAreas = newFocusAreas.length
        ? [...new Set([...newFocusAreas])]
        : rel.focus_areas || [];

      // --- 4. Persist updates to relationship ---
      await db.entities.MentorshipRelationship.update(rel.id, {
        skill_proficiency_gains: updatedGains,
        focus_areas: refreshedFocusAreas
      });

      // --- 5. Flag stagnation via WellbeingAlert ---
      const isStagnant =
        stagnantGaps > 0 &&
        relSessions.length >= STAGNATION_SESSION_THRESHOLD &&
        (avgProgressRating === null || avgProgressRating < 6);

      const existingStagnantAlert = allAlerts.find(a =>
        a.agent_id === menteeId &&
        a.alert_type === 'stagnant_relationship' &&
        a.metadata?.relationship_id === rel.id
      );

      if (isStagnant && !existingStagnantAlert) {
        await db.entities.WellbeingAlert.create({
          agent_id: menteeId,
          alert_type: 'stagnant_relationship',
          severity: stagnantGaps >= 2 ? 'high' : 'medium',
          status: 'active',
          title: 'Skill Gap Stagnation Detected',
          description: `Mentee has ${stagnantGaps} skill gap(s) showing no measurable progress after ${relSessions.length} sessions. Goal refresh or relationship review recommended.`,
          skills_affected: newFocusAreas,
          recommended_action: 'Review mentorship goals, consider goal regeneration, or evaluate mentor-mentee match quality.',
          metadata: {
            relationship_id: rel.id,
            mentor_agent_id: rel.mentor_agent_id,
            stagnant_skill_count: stagnantGaps,
            sessions_completed: relSessions.length,
            avg_progress_rating: avgProgressRating,
            detected_at: new Date().toISOString()
          }
        });
      } else if (!isStagnant && existingStagnantAlert) {
        // Auto-resolve if gaps are closing
        await db.entities.WellbeingAlert.update(existingStagnantAlert.id, {
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_reason: `Skill gaps closing — ${closingGaps} goal(s) showing measurable proficiency gains.`
        });
      }

      results.push({
        relationship_id: rel.id,
        mentee_id: menteeId,
        goals_tracked: goals.length,
        closing_gaps: closingGaps,
        stagnant_gaps: stagnantGaps,
        stagnation_alert_raised: isStagnant && !existingStagnantAlert,
        stagnation_alert_resolved: !isStagnant && !!existingStagnantAlert,
        updated_focus_areas: refreshedFocusAreas,
        sessions_analyzed: relSessions.length,
        avg_progress_rating: avgProgressRating
      });
    }

    return Response.json({
      success: true,
      analyzed: results.length,
      results,
      ran_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Automated skill gap analysis error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});