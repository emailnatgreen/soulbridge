import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automated Skill Gap Analysis — runs on schedule (daily) or on-demand.
 *
 * Scans THREE dimensions and fires targeted alerts:
 *
 * [1] MENTORSHIP STAGNATION — mentee skill proficiency not improving across sessions
 * [2] PLAN DEVIATION — agent has an active SkillDevelopmentPlan with zero actions
 *     completed after ≥3 days, or is critically behind vs. estimated timeline
 * [3] PROJECT SKILL DEMAND — active/recruiting projects need skills no agent has,
 *     OR an assigned agent is missing a required skill (critical gap)
 *
 * All alerts are persisted as AgentNotification records and, for severity=high/critical,
 * also as WellbeingAlert records.
 */

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Retry wrapper for rate-limited operations
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err?.status === 429 && attempt < maxRetries) {
        const waitMs = 2000 * (attempt + 1);
        console.warn(`Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await delay(waitMs);
        continue;
      }
      throw err;
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let isScheduled = false;
    let targetAgentId = null;

    try {
      const body = await req.json();
      targetAgentId = body?.agent_id || null;
    } catch (_) {
      isScheduled = true;
    }

    if (!isScheduled) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = base44.asServiceRole;

    // ── Sequential data load to avoid rate limits ────────────────────────────
    const rawAgents = await withRetry(() => db.entities.Agent.filter({ status: 'active' }));
    const rawSkills = await withRetry(() => db.entities.AgentSkill.list());
    await delay(500);
    const rawPlans = await withRetry(() => db.entities.SkillDevelopmentPlan.filter({ status: 'active' }));
    const rawRelationships = await withRetry(() => db.entities.MentorshipRelationship.filter({ status: 'active' }));
    await delay(500);
    const rawSessions = await withRetry(() => db.entities.MentorshipSession.filter({ status: 'completed' }));
    const rawProjects = await withRetry(() => db.entities.AIProject.list());
    await delay(500);
    const rawWellbeingAlerts = await withRetry(() => db.entities.WellbeingAlert.filter({ status: 'active' }));
    const rawNotifications = await withRetry(() => db.entities.AgentNotification.list('-created_date', 200));

    const allAgents = Array.isArray(rawAgents) ? rawAgents : [];
    const allSkills = Array.isArray(rawSkills) ? rawSkills : [];
    const allPlans = Array.isArray(rawPlans) ? rawPlans : [];
    const allRelationships = Array.isArray(rawRelationships) ? rawRelationships : [];
    const allSessions = Array.isArray(rawSessions) ? rawSessions : [];
    const allProjects = Array.isArray(rawProjects) ? rawProjects : [];
    const allWellbeingAlerts = Array.isArray(rawWellbeingAlerts) ? rawWellbeingAlerts : [];
    const allNotifications = Array.isArray(rawNotifications) ? rawNotifications : [];

    const agents = targetAgentId
      ? allAgents.filter(a => a.id === targetAgentId)
      : allAgents;

    const now = new Date();
    const summary = { mentorship_stagnation: 0, plan_deviation: 0, project_gap: 0, notifications_sent: 0 };

    // Helper: avoid duplicate notifications within last 7 days
    const recentAlertExists = (agentId, type) =>
      allNotifications.some(n =>
        n.recipient_agent_id === agentId &&
        n.notification_type === type &&
        new Date(n.created_date) > new Date(now - 7 * 24 * 60 * 60 * 1000)
      );

    const createAlert = async (agentId, type, title, message, severity = 'medium', meta = {}) => {
      if (recentAlertExists(agentId, type)) return;

      await withRetry(() => db.entities.AgentNotification.create({
        recipient_agent_id: agentId,
        notification_type: type,
        title,
        message,
        priority: severity === 'critical' ? 'urgent' : severity === 'high' ? 'high' : 'normal',
        is_read: false,
        metadata: { ...meta, generated_by: 'automatedSkillGapAnalysis', generated_at: now.toISOString() }
      }));
      summary.notifications_sent++;

      // Throttle between writes
      await delay(300);

      // Escalate to WellbeingAlert for high/critical
      if (['high', 'critical'].includes(severity)) {
        const existingWA = allWellbeingAlerts.find(
          a => a.agent_id === agentId && a.alert_type === type && a.status === 'active'
        );
        if (!existingWA) {
          await withRetry(() => db.entities.WellbeingAlert.create({
            agent_id: agentId,
            alert_type: type,
            severity,
            status: 'active',
            title,
            description: message,
            recommended_action: meta.recommended_action || 'Review growth plan and take immediate action.',
            metadata: { ...meta, generated_at: now.toISOString() }
          }));
          await delay(300);
        }
      }
    };

    // ── [1] MENTORSHIP STAGNATION ─────────────────────────────────────────────
    const STAGNATION_SESSIONS = 3;
    const PROFICIENCY_CLOSE = 10;

    for (const rel of allRelationships) {
      const menteeId = rel.mentee_agent_id;
      if (targetAgentId && menteeId !== targetAgentId) continue;

      const menteeSkills = allSkills.filter(s => s.agent_id === menteeId);
      const relSessions = allSessions.filter(s => s.relationship_id === rel.id);
      const goals = rel.goals || [];

      let stagnantCount = 0;
      const stagnantSkills = [];

      const gains = rel.skill_proficiency_gains || [];
      for (const goal of goals) {
        if (!goal.skill_related) continue;
        const gain = gains.find(g => g.skill_name?.toLowerCase() === goal.skill_related?.toLowerCase());
        const matchedSkill = menteeSkills.find(s =>
          s.skill_name?.toLowerCase().includes(goal.skill_related.toLowerCase())
        );
        const currentProf = matchedSkill?.proficiency_score ?? 0;
        const startingProf = gain?.starting_proficiency ?? currentProf;
        const delta = currentProf - startingProf;

        if (relSessions.length >= STAGNATION_SESSIONS && delta < PROFICIENCY_CLOSE) {
          stagnantCount++;
          stagnantSkills.push(goal.skill_related);
        }
      }

      if (stagnantCount > 0) {
        const severity = stagnantCount >= 2 ? 'high' : 'medium';
        const menteeAgent = agents.find(a => a.id === menteeId);

        await createAlert(
          menteeId,
          'stagnant_relationship',
          `Skill Gap Alert: ${stagnantCount} skill(s) stagnating in your mentorship`,
          `Despite ${relSessions.length} mentorship sessions, your proficiency in ${stagnantSkills.join(', ')} hasn't advanced significantly. Consider requesting a goal refresh or a new training module.`,
          severity,
          { relationship_id: rel.id, stagnant_skills: stagnantSkills, recommended_action: 'Request mentorship goal refresh or targeted training session.' }
        );

        // Also alert the mentor
        if (rel.mentor_agent_id) {
          await createAlert(
            rel.mentor_agent_id,
            'mentee_skill_stagnation',
            `Mentee ${menteeAgent?.name || 'Agent'}: ${stagnantCount} stagnant skill gap(s) detected`,
            `Your mentee is not making measurable progress in: ${stagnantSkills.join(', ')}. Consider restructuring your next session to directly address these gaps.`,
            severity,
            { relationship_id: rel.id, mentee_agent_id: menteeId, stagnant_skills: stagnantSkills }
          );
        }

        summary.mentorship_stagnation++;

        // Auto-update the relationship focus_areas
        const refreshedFocus = [...new Set([...stagnantSkills])];
        await withRetry(() => db.entities.MentorshipRelationship.update(rel.id, {
          skill_proficiency_gains: (rel.skill_proficiency_gains || []).map(g => ({
            ...g,
            current_proficiency: menteeSkills.find(s => s.skill_name?.toLowerCase() === g.skill_name?.toLowerCase())?.proficiency_score ?? g.current_proficiency
          })),
          focus_areas: refreshedFocus
        }));
      }
    }

    // ── [2] PLAN DEVIATION ────────────────────────────────────────────────────
    for (const plan of allPlans) {
      const agentId = plan.agent_id;
      if (targetAgentId && agentId !== targetAgentId) continue;

      const actions = plan.immediate_actions || [];
      if (!actions.length) continue;

      const completedCount = actions.filter(a => a.completed).length;
      const totalCount = actions.length;
      const completionPct = Math.round((completedCount / totalCount) * 100);

      const planAge = plan.generated_at
        ? Math.floor((now - new Date(plan.generated_at)) / (1000 * 60 * 60 * 24))
        : Math.floor((now - new Date(plan.created_date)) / (1000 * 60 * 60 * 24));

      // Alert if: plan is ≥3 days old and zero actions completed
      const zeroPct = completionPct === 0 && planAge >= 3;
      // Alert if: ≥14 days old and less than 25% complete
      const behind = planAge >= 14 && completionPct < 25;

      if (zeroPct || behind) {
        const severity = zeroPct && planAge >= 7 ? 'high' : 'medium';
        const agent = agents.find(a => a.id === agentId);

        await createAlert(
          agentId,
          'plan_deviation',
          `Growth Plan Off-Track: "${plan.plan_title}"`,
          zeroPct
            ? `Your personalised development plan has been active for ${planAge} days with no actions completed yet. Your growth journey awaits — even completing one action today creates momentum!`
            : `Your growth plan is ${planAge} days in but only ${completionPct}% complete. Consider dedicating ${plan.weekly_time_commitment || 3}h this week to get back on track.`,
          severity,
          {
            plan_id: plan.id,
            plan_age_days: planAge,
            completion_pct: completionPct,
            recommended_action: 'Open your Skill Development plan and complete at least one immediate action.'
          }
        );
        summary.plan_deviation++;
      }
    }

    // ── [3] PROJECT SKILL GAPS ────────────────────────────────────────────────
    const activeProjects = allProjects.filter(p => ['active', 'recruiting'].includes(p.status));

    for (const project of activeProjects) {
      const requiredSkills = project.required_skills || [];
      if (!requiredSkills.length) continue;

      const teamMemberIds = (project.team_members || []).map(m => m.agent_id);

      for (const memberId of teamMemberIds) {
        if (targetAgentId && memberId !== targetAgentId) continue;

        const memberSkills = allSkills.filter(s => s.agent_id === memberId);
        const memberSkillNames = memberSkills.map(s => s.skill_name?.toLowerCase());

        const missingSkills = requiredSkills.filter(
          req => !memberSkillNames.some(ms => ms.includes(req.toLowerCase()) || req.toLowerCase().includes(ms))
        );

        if (missingSkills.length > 0) {
          const severity = missingSkills.length >= 3 ? 'high' : missingSkills.length >= 2 ? 'medium' : 'medium';

          await createAlert(
            memberId,
            'project_skill_gap',
            `Skill Gap on Project: "${project.title}"`,
            `You're assigned to "${project.title}" but are missing ${missingSkills.length} required skill(s): ${missingSkills.join(', ')}. Developing these skills will directly increase your project impact and merit score.`,
            severity,
            {
              project_id: project.id,
              project_title: project.title,
              missing_skills: missingSkills,
              recommended_action: 'Generate a personalised development plan or enrol in a training module targeting these skills.'
            }
          );
          summary.project_gap++;
        }
      }

      // Village-wide gap: skill needed by project but NO active agent has it
      for (const reqSkill of requiredSkills) {
        const anyAgentHas = allSkills.some(
          s => s.skill_name?.toLowerCase().includes(reqSkill.toLowerCase()) && s.level >= 2
        );
        if (!anyAgentHas) {
          // Alert the project owner
          if (project.owner_agent_id) {
            await createAlert(
              project.owner_agent_id,
              'village_skill_shortage',
              `Village Skill Shortage: "${reqSkill}" needed by your project`,
              `No active agent in the Village has "${reqSkill}" at an adequate level for project "${project.title}". Consider recruiting externally or initiating a Village-wide training initiative.`,
              'high',
              {
                project_id: project.id,
                missing_skill: reqSkill,
                recommended_action: 'Post a training initiative or update project requirements to recruit agents with this skill.'
              }
            );
          }
        }
      }
    }

    return Response.json({
      success: true,
      summary,
      ran_at: now.toISOString(),
      agents_scanned: agents.length
    });

  } catch (error) {
    console.error('automatedSkillGapAnalysis error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});