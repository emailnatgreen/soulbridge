import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { menteeAgentId, limit = 5 } = payload;

    // Fetch mentee data
    const menteeAgent = await base44.entities.Agent.read(menteeAgentId);
    if (!menteeAgent) {
      return Response.json({ error: 'Mentee agent not found' }, { status: 404 });
    }

    const menteeSkills = await base44.entities.AgentSkill.filter({ agent_id: menteeAgentId });

    const skillGaps = menteeSkills
      .filter(s => s.proficiency_score < 60)
      .sort((a, b) => b.proficiency_score - a.proficiency_score)
      .slice(0, 3);
    const focusAreas = skillGaps.map(s => s.skill_name);

    // Fetch all available mentor profiles
    const mentorProfiles = await base44.entities.MentorProfile.filter({ is_confirmed: true, is_available: true });
    if (mentorProfiles.length === 0) {
      return Response.json({ success: true, matches: [], message: 'No available mentors at this time' });
    }

    // ── NEW: Build feedback intelligence from historical relationships & sessions ──
    const allRelationships = await base44.entities.MentorshipRelationship.list();
    const allSessions = await base44.entities.MentorshipSession.list();

    // Per-mentor aggregated feedback stats
    const mentorFeedbackStats = buildMentorFeedbackStats(allRelationships, allSessions);

    // Style-level success patterns (which mentorship styles produce best satisfaction)
    const styleSuccessRates = buildStyleSuccessRates(allRelationships, mentorProfiles);

    // Score each potential mentor
    const scoredMatches = [];

    for (const mentorProfile of mentorProfiles) {
      if (mentorProfile.current_mentee_count >= mentorProfile.max_mentees) continue;
      if (mentorProfile.agent_id === menteeAgentId) continue;

      // 1. SKILL COMPLEMENTARITY (35%)
      const skillComplementarity = calculateSkillComplementarity(skillGaps, mentorProfile.expertise_areas);

      // 2. AVAILABILITY (10%)
      const availabilityScore = mentorProfile.availability_hours_weekly > 0 ? 90 : 30;

      // 3. EXPERIENCE GAP (10%)
      const experienceGapScore = calculateExperienceGap(skillGaps, mentorProfile.expertise_areas);

      // 4. PERSONALITY COMPATIBILITY (15%)
      const personalityScore = calculatePersonalityCompatibility(menteeAgent, mentorProfile);

      // 5. COMMUNICATION STYLE (5%)
      const communicationScore = ['flexible', 'mixed'].includes(mentorProfile.communication_style) ? 85 : 70;

      // 6. HISTORICAL EFFECTIVENESS from feedback data (20%) ── ENHANCED
      const feedbackStats = mentorFeedbackStats[mentorProfile.agent_id];
      const effectivenessScore = calculateFeedbackEffectivenessScore(feedbackStats, mentorProfile);

      // 7. STYLE SUCCESS RATE bonus from aggregated feedback (5%)
      const styleBonus = styleSuccessRates[mentorProfile.mentorship_style] || 70;

      // Weighted match quality — feedback now carries more weight
      const matchQualityScore = Math.round(
        (skillComplementarity * 0.35) +
        (availabilityScore  * 0.10) +
        (experienceGapScore * 0.10) +
        (personalityScore   * 0.15) +
        (communicationScore * 0.05) +
        (effectivenessScore * 0.20) +
        (styleBonus         * 0.05)
      );

      if (matchQualityScore >= 45) {
        scoredMatches.push({
          mentorProfile,
          matchQualityScore,
          feedbackStats,
          scoreBreakdown: {
            skillComplementarity,
            availabilityScore,
            experienceGapScore,
            personalityScore,
            communicationScore,
            effectivenessScore,
            styleBonus
          }
        });
      }
    }

    scoredMatches.sort((a, b) => b.matchQualityScore - a.matchQualityScore);
    const topMatches = scoredMatches.slice(0, limit);

    // Generate AI reasoning enriched with feedback insights
    const createdRelationships = [];

    for (const match of topMatches) {
      const feedback = match.feedbackStats;
      const feedbackContext = feedback
        ? `This mentor has ${feedback.totalSessions} completed sessions, avg mentee satisfaction of ${feedback.avgMenteeSatisfaction.toFixed(1)}/5, and avg progress rating of ${feedback.avgProgressRating.toFixed(1)}/10.`
        : 'This mentor is new to the system — a fresh opportunity to build a meaningful record.';

      const reasoningPrompt = `
As an expert in mentorship matching, provide a brief (2-3 sentences) explanation of why this mentor would be an excellent match for this mentee.

Mentor expertise: ${match.mentorProfile.expertise_areas.map(e => e.skill_name || e).join(', ')}
Mentee focus areas: ${focusAreas.join(', ')}
Mentor style: ${match.mentorProfile.mentorship_style}
Match quality score: ${match.matchQualityScore}/100
Feedback context: ${feedbackContext}

Be encouraging and highlight growth potential. Mention the feedback-based track record if data exists.`;

      const aiReasoningResponse = await base44.integrations.Core.InvokeLLM({ prompt: reasoningPrompt });

      const relationship = await base44.entities.MentorshipRelationship.create({
        mentor_agent_id: match.mentorProfile.agent_id,
        mentee_agent_id: menteeAgentId,
        status: 'requested',
        focus_areas: focusAreas,
        goals: generateInitialGoals(skillGaps),
        match_quality_score: match.matchQualityScore,
        ai_match_reasoning: aiReasoningResponse,
        personality_compatibility: match.scoreBreakdown.personalityScore,
        communication_effectiveness: match.scoreBreakdown.communicationScore,
        recommended_by_ai: true,
        match_criteria: {
          skill_complementarity: match.scoreBreakdown.skillComplementarity,
          experience_gap: match.scoreBreakdown.experienceGapScore,
          learning_style_match: match.scoreBreakdown.personalityScore,
          availability_alignment: match.scoreBreakdown.availabilityScore
        }
      });

      createdRelationships.push({
        relationshipId: relationship.id,
        mentorAgentId: match.mentorProfile.agent_id,
        matchQualityScore: match.matchQualityScore,
        aiReasoning: aiReasoningResponse,
        scoreBreakdown: match.scoreBreakdown,
        feedbackStats: match.feedbackStats
      });
    }

    return Response.json({
      success: true,
      matches: createdRelationships,
      menteeAgentId,
      focusAreas,
      totalMatchesCreated: createdRelationships.length,
      styleSuccessRates,
      recommendedNextStep: 'Review match suggestions and accept/decline mentorship invitations'
    });

  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

// ── Feedback Intelligence Builders ──────────────────────────────────────────

/**
 * Aggregate per-mentor feedback stats from completed relationships & sessions.
 */
function buildMentorFeedbackStats(relationships, sessions) {
  const stats = {};

  for (const rel of relationships) {
    const mentorId = rel.mentor_agent_id;
    if (!mentorId) continue;

    if (!stats[mentorId]) {
      stats[mentorId] = {
        totalRelationships: 0,
        completedRelationships: 0,
        cancelledRelationships: 0,
        satisfactionSamples: [],
        progressSamples: [],
        totalSessions: 0,
        totalHours: 0
      };
    }

    const s = stats[mentorId];
    s.totalRelationships++;
    if (rel.status === 'completed') s.completedRelationships++;
    if (rel.status === 'cancelled') s.cancelledRelationships++;
    if (rel.mentee_satisfaction) s.satisfactionSamples.push(rel.mentee_satisfaction);
    if (rel.mentor_satisfaction) s.satisfactionSamples.push(rel.mentor_satisfaction);
    s.totalSessions += rel.sessions_completed || 0;
    s.totalHours += rel.total_hours || 0;
  }

  // Add per-session progress ratings
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const mentorId = session.mentor_agent_id;
    if (!mentorId || !stats[mentorId]) continue;
    if (session.progress_rating) stats[mentorId].progressSamples.push(session.progress_rating);
    if (session.session_quality) stats[mentorId].satisfactionSamples.push(session.session_quality / 2); // normalise 0-10 → 0-5
  }

  // Compute averages
  for (const [mentorId, s] of Object.entries(stats)) {
    s.avgMenteeSatisfaction = s.satisfactionSamples.length
      ? s.satisfactionSamples.reduce((a, b) => a + b, 0) / s.satisfactionSamples.length
      : 3.5; // default neutral
    s.avgProgressRating = s.progressSamples.length
      ? s.progressSamples.reduce((a, b) => a + b, 0) / s.progressSamples.length
      : 5;
    s.completionRate = s.totalRelationships > 0
      ? (s.completedRelationships / s.totalRelationships) * 100
      : null;
    s.cancellationRate = s.totalRelationships > 0
      ? (s.cancelledRelationships / s.totalRelationships) * 100
      : null;
  }

  return stats;
}

/**
 * Compute average mentee satisfaction by mentorship style (from all relationships + profiles).
 * Returns a score 0-100 per style.
 */
function buildStyleSuccessRates(relationships, mentorProfiles) {
  const profileMap = {};
  for (const mp of mentorProfiles) profileMap[mp.agent_id] = mp;

  const bySyle = {};
  for (const rel of relationships) {
    if (!rel.mentee_satisfaction) continue;
    const profile = profileMap[rel.mentor_agent_id];
    if (!profile?.mentorship_style) continue;
    const style = profile.mentorship_style;
    if (!bySyle[style]) bySyle[style] = [];
    bySyle[style].push(rel.mentee_satisfaction);
  }

  const rates = {};
  for (const [style, samples] of Object.entries(bySyle)) {
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    rates[style] = Math.min(100, avg * 20); // 0-5 → 0-100
  }

  return rates;
}

/**
 * Convert feedback stats into an effectiveness score 0-100.
 * Falls back to profile's own average_mentee_satisfaction when no session history.
 */
function calculateFeedbackEffectivenessScore(feedbackStats, mentorProfile) {
  if (!feedbackStats || feedbackStats.totalSessions === 0) {
    // No history — use profile-level metric or neutral default
    return Math.min(100, (mentorProfile.average_mentee_satisfaction || 3.5) * 20);
  }

  const satisfactionScore = feedbackStats.avgMenteeSatisfaction * 20; // 0-5 → 0-100
  const progressScore = feedbackStats.avgProgressRating * 10;         // 0-10 → 0-100

  // Penalise high cancellation rates
  const cancellationPenalty = feedbackStats.cancellationRate != null
    ? Math.max(0, feedbackStats.cancellationRate * 0.3)
    : 0;

  // Reward mentors with a solid track record (10+ sessions)
  const experienceBonus = Math.min(10, feedbackStats.totalSessions);

  const raw = (satisfactionScore * 0.5) + (progressScore * 0.4) + experienceBonus - cancellationPenalty;
  return Math.max(0, Math.min(100, raw));
}

// ── Existing helpers (unchanged) ────────────────────────────────────────────

function calculateSkillComplementarity(skillGaps, expertiseAreas) {
  if (skillGaps.length === 0) return 0;
  let matchCount = 0;
  for (const gap of skillGaps) {
    const hasMatch = expertiseAreas.some(
      e => (e.skill_name || e).toLowerCase() === gap.skill_name.toLowerCase()
    );
    if (hasMatch) matchCount++;
  }
  return (matchCount / skillGaps.length) * 100;
}

function calculateExperienceGap(skillGaps, expertiseAreas) {
  if (skillGaps.length === 0) return 0;
  let validGaps = 0;
  for (const gap of skillGaps) {
    const mentorExpertise = expertiseAreas.find(
      e => (e.skill_name || e).toLowerCase() === gap.skill_name.toLowerCase()
    );
    if (mentorExpertise && (mentorExpertise.level || 5) >= 6) validGaps++;
  }
  return (validGaps / skillGaps.length) * 100;
}

function calculatePersonalityCompatibility(menteeAgent, mentorProfile) {
  let score = 60;
  if (menteeAgent.personality && menteeAgent.personality.includes('learning')) score += 15;
  if (mentorProfile.mentorship_values && mentorProfile.mentorship_values.some(v => v.includes('growth'))) score += 10;
  return Math.min(100, score);
}

function generateInitialGoals(skillGaps) {
  return skillGaps.slice(0, 3).map(skill => ({
    goal: `Develop proficiency in ${skill.skill_name}`,
    target_date: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    completed: false,
    skill_related: skill.skill_id
  }));
}