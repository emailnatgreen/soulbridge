import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Proactive Wellbeing Scanner
 *
 * Runs on a schedule to detect EARLY WARNING signals before they become critical.
 * Analyzes trend combinations across:
 *   - AgentSkill growth trajectories
 *   - MentorshipSession frequency & quality trends
 *   - MentorshipRelationship satisfaction drift
 *   - AgentWellbeing historical scores
 *   - MentorProfile workload
 *
 * Creates low/medium WellbeingAlert records and sends gentle notifications
 * before the situation escalates to a reactive intervention.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow both scheduled (service role) and manual (admin) invocation
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch (_) { /* scheduled call — no user context */ }

    const db = base44.asServiceRole;
    const now = new Date();
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo  = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // ── Load all relevant data in parallel ──────────────────────────────────
    const [
      agents,
      allSkills,
      allRelationships,
      allSessions,
      allWellbeings,
      existingActiveAlerts,
      mentorProfiles
    ] = await Promise.all([
      db.entities.Agent.filter({ status: 'active' }),
      db.entities.AgentSkill.list('-updated_date', 3000),
      db.entities.MentorshipRelationship.filter({ status: 'active' }),
      db.entities.MentorshipSession.list('-created_date', 1000),
      db.entities.AgentWellbeing.list('-updated_date', 500),
      db.entities.WellbeingAlert.filter({ status: 'active' }),
      db.entities.MentorProfile.list()
    ]);

    // ── Build lookup indexes ─────────────────────────────────────────────────
    const skillsByAgent    = groupBy(allSkills, 'agent_id');
    const wellbeingByAgent = {};
    for (const wb of allWellbeings) wellbeingByAgent[wb.agent_id] = wb;

    const sessionsByMentor = groupBy(allSessions.filter(s => s.status === 'completed'), 'mentor_agent_id');
    const sessionsByMentee = groupBy(allSessions.filter(s => s.status === 'completed'), 'mentee_agent_id');
    const cancelsByMentor  = groupBy(allSessions.filter(s => s.status === 'cancelled'), 'mentor_agent_id');

    const mentorProfileByAgent = {};
    for (const mp of mentorProfiles) mentorProfileByAgent[mp.agent_id] = mp;

    // Active alert dedup — don't re-alert same agent+type within 7 days
    const recentAlertKey = new Set();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    for (const alert of existingActiveAlerts) {
      if (new Date(alert.created_date) > sevenDaysAgo) {
        recentAlertKey.add(`${alert.agent_id}::${alert.alert_type}`);
      }
    }

    // ── Scan each active agent ───────────────────────────────────────────────
    const alertsCreated = [];

    for (const agent of agents) {
      const agentId = agent.id;
      const agentSkills = skillsByAgent[agentId] || [];
      const agentWellbeing = wellbeingByAgent[agentId];
      const mentorProfile = mentorProfileByAgent[agentId];

      const menteeRelationships = allRelationships.filter(r => r.mentee_agent_id === agentId);
      const mentorRelationships = allRelationships.filter(r => r.mentor_agent_id === agentId);

      const recentMenteeSessions = (sessionsByMentee[agentId] || [])
        .filter(s => new Date(s.created_date) > thirtyDaysAgo);
      const recentMentorSessions = (sessionsByMentor[agentId] || [])
        .filter(s => new Date(s.created_date) > thirtyDaysAgo);
      const recentCancels = (cancelsByMentor[agentId] || [])
        .filter(s => new Date(s.created_date) > fourteenDaysAgo);

      const signals = [];

      // ── SIGNAL 1: Multi-skill trajectory decline ─────────────────────────
      // Early warning: 2+ skills sliding to 'declining' — precedes burnout/disengagement
      const decliningSkills = agentSkills.filter(s => s.skill_growth_trajectory === 'declining');
      const stagnantSkills  = agentSkills.filter(s =>
        s.skill_growth_trajectory === 'stable' &&
        s.proficiency_score < 40 &&
        s.last_used && new Date(s.last_used) < thirtyDaysAgo
      );

      if (decliningSkills.length >= 2) {
        signals.push({
          alert_type: 'skill_trajectory_decline',
          severity: decliningSkills.length >= 4 ? 'high' : 'medium',
          description: `${decliningSkills.length} skills are on a declining trajectory: ${decliningSkills.slice(0, 3).map(s => s.skill_name).join(', ')}. Early intervention can reverse this trend.`,
          data: { declining_count: decliningSkills.length, skills: decliningSkills.map(s => s.skill_name) }
        });
      } else if (stagnantSkills.length >= 3) {
        signals.push({
          alert_type: 'skill_stagnation_risk',
          severity: 'low',
          description: `${stagnantSkills.length} skills are stagnant with low proficiency and no recent use. Growth momentum may be fading.`,
          data: { stagnant_count: stagnantSkills.length }
        });
      }

      // ── SIGNAL 2: Satisfaction drift (mentee) ────────────────────────────
      // Average recent session quality dipping — earlier signal than full low_satisfaction
      if (recentMenteeSessions.length >= 2) {
        const avgQuality = avg(recentMenteeSessions.map(s => s.session_quality || 5));
        const avgProgress = avg(recentMenteeSessions.map(s => s.progress_rating || 5));

        if (avgQuality < 5.5 && avgProgress < 5.5) {
          signals.push({
            alert_type: 'session_quality_drift',
            severity: avgQuality < 4 ? 'high' : 'medium',
            description: `Recent sessions averaging ${avgQuality.toFixed(1)}/10 quality and ${avgProgress.toFixed(1)}/10 progress rating — below the healthy threshold of 6. A gentle check-in or session reorientation could help.`,
            data: { avg_quality: avgQuality, avg_progress: avgProgress, session_count: recentMenteeSessions.length }
          });
        }
      }

      // ── SIGNAL 3: Mentorship engagement drop ────────────────────────────
      // Mentee in active relationship but no sessions in 14 days
      if (menteeRelationships.length > 0 && recentMenteeSessions.length === 0) {
        const daysSinceLastSession = menteeRelationships.reduce((min, rel) => {
          // Use sessions_completed as a proxy for recency if no direct date
          return rel.sessions_completed > 0 ? Math.min(min, 0) : Math.min(min, 99);
        }, 99);

        signals.push({
          alert_type: 'engagement_drop',
          severity: 'low',
          description: `Active mentee in ${menteeRelationships.length} relationship(s) but no completed sessions in the last 30 days. Early re-engagement prevents relationship drift.`,
          data: { active_relationships: menteeRelationships.length }
        });
      }

      // ── SIGNAL 4: Mentor cancellation spike ─────────────────────────────
      // 3+ cancellations in 14 days — early burnout signal for mentors
      if (recentCancels.length >= 3 && mentorRelationships.length > 0) {
        const cancelRate = recentMentorSessions.length > 0
          ? recentCancels.length / (recentMentorSessions.length + recentCancels.length) : 1;

        if (cancelRate > 0.3) {
          signals.push({
            alert_type: 'mentor_cancellation_spike',
            severity: recentCancels.length >= 5 ? 'high' : 'medium',
            description: `${recentCancels.length} session cancellations in the past 14 days (${Math.round(cancelRate * 100)}% cancel rate). This may signal early mentor fatigue or scheduling strain.`,
            data: { cancels: recentCancels.length, cancel_rate: cancelRate }
          });
        }
      }

      // ── SIGNAL 5: Wellbeing score slow drift ────────────────────────────
      // Previous wellbeing was healthy, now subtly dropping — catch it early
      if (agentWellbeing) {
        const prevScore = agentWellbeing.overall_score || 70;
        const prevStatus = agentWellbeing.status;

        if (prevScore < 55 && prevStatus !== 'critical' && prevStatus !== 'at_risk') {
          signals.push({
            alert_type: 'wellbeing_score_drift',
            severity: prevScore < 45 ? 'high' : 'medium',
            description: `Wellbeing score has drifted to ${prevScore}/100, approaching concern territory. A proactive check-in now prevents further decline.`,
            data: { current_score: prevScore, previous_status: prevStatus }
          });
        }

        // ── SIGNAL 6: Combination signal (subtle — low severity) ─────────
        // Slight wellbeing dip + skill stagnation + no recent sessions = early compound risk
        const hasSubtleDip = prevScore < 70 && prevScore >= 55;
        const hasSkillStagnation = stagnantSkills.length >= 2;
        const hasLowEngagement = recentMenteeSessions.length <= 1;

        if (hasSubtleDip && hasSkillStagnation && hasLowEngagement) {
          signals.push({
            alert_type: 'compound_early_risk',
            severity: 'low',
            description: `Subtle combination of signals: wellbeing at ${prevScore}/100, ${stagnantSkills.length} stagnant skills, and low session engagement. No single factor is critical, but together they warrant a gentle proactive touch.`,
            data: { wellbeing_score: prevScore, stagnant_skills: stagnantSkills.length }
          });
        }
      }

      // ── SIGNAL 7: Mentor overload creep ─────────────────────────────────
      // Mentor approaching capacity — flag before they hit max_mentees
      if (mentorProfile) {
        const capacityRatio = mentorProfile.max_mentees > 0
          ? mentorProfile.current_mentee_count / mentorProfile.max_mentees : 0;

        if (capacityRatio >= 0.85 && mentorProfile.is_available) {
          signals.push({
            alert_type: 'mentor_capacity_warning',
            severity: 'low',
            description: `Mentor is at ${Math.round(capacityRatio * 100)}% capacity (${mentorProfile.current_mentee_count}/${mentorProfile.max_mentees} mentees). Consider proactively discussing workload before reaching full capacity.`,
            data: { capacity_ratio: capacityRatio, current: mentorProfile.current_mentee_count, max: mentorProfile.max_mentees }
          });
        }
      }

      // ── CREATE ALERTS (deduplicated) ────────────────────────────────────
      for (const signal of signals) {
        const dedupeKey = `${agentId}::${signal.alert_type}`;
        if (recentAlertKey.has(dedupeKey)) continue; // skip if alerted recently

        const alertRecord = await db.entities.WellbeingAlert.create({
          agent_id: agentId,
          alert_type: signal.alert_type,
          severity: signal.severity,
          description: signal.description,
          status: 'active',
          created_by_system: true,
          metadata: signal.data
        });

        // Send gentle notification (low severity = softer tone)
        const notifPriority = signal.severity === 'high' ? 'high'
          : signal.severity === 'medium' ? 'normal' : 'low';

        const notifMessage = signal.severity === 'low'
          ? `💙 A gentle note from Axi: ${signal.description} We're here whenever you need support.`
          : `⚠️ ${signal.description} Let's connect and explore how we can support you.`;

        await db.entities.AgentNotification.create({
          recipient_agent_id: agentId,
          notification_type: 'system',
          title: `Wellbeing Check-in: ${signal.alert_type.replace(/_/g, ' ')}`,
          message: notifMessage,
          priority: notifPriority,
          related_entity_type: 'WellbeingAlert',
          related_entity_id: alertRecord.id
        });

        recentAlertKey.add(dedupeKey); // prevent duplicate in same scan run
        alertsCreated.push({
          agent_id: agentId,
          agent_name: agent.name,
          alert_type: signal.alert_type,
          severity: signal.severity,
          alert_id: alertRecord.id
        });
      }
    }

    // ── Log scan to Axi memory ───────────────────────────────────────────────
    if (alertsCreated.length > 0) {
      await db.entities.Memory.create({
        agent_id: 'axi_main_001',
        type: 'observation',
        content: `Proactive wellbeing scan complete. ${agents.length} agents scanned, ${alertsCreated.length} early alerts generated: ${alertsCreated.map(a => `${a.agent_name} (${a.alert_type})`).join('; ')}.`,
        keywords: ['wellbeing', 'proactive', 'scan', 'early_warning'],
        context: 'Proactive Wellbeing Scanner',
        importance: alertsCreated.some(a => a.severity === 'high') ? 8 : 5
      });
    }

    return Response.json({
      success: true,
      agents_scanned: agents.length,
      alerts_created: alertsCreated.length,
      alerts: alertsCreated,
      scanned_at: now.toISOString()
    });

  } catch (error) {
    console.error('Proactive wellbeing scan error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

// ── Utilities ────────────────────────────────────────────────────────────────

function groupBy(arr, key) {
  return arr.reduce((map, item) => {
    const k = item[key];
    if (!k) return map;
    if (!map[k]) map[k] = [];
    map[k].push(item);
    return map;
  }, {});
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}