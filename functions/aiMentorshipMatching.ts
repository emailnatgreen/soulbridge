import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { menteeAgentId, limit = 5 } = await req.json();

    const menteeAgent = await base44.entities.Agent.read(menteeAgentId);
    if (!menteeAgent) return Response.json({ error: 'Mentee agent not found' }, { status: 404 });

    const [menteeSkills, growthInsightsRaw] = await Promise.all([
      base44.entities.AgentSkill.filter({ agent_id: menteeAgentId }),
      // Best-effort: fetch growth insights; if it fails, proceed without
      base44.asServiceRole.functions.invoke('generateSkillTrajectoryInsights', { agent_id: menteeAgentId })
        .then(r => r?.insights || null)
        .catch(() => null),
    ]);

    // Extract the enrichment fields from growth insights
    const growthInsights = growthInsightsRaw || {};
    const learningStyle      = growthInsights.learning_style_insight || null;
    const skillSynergies     = growthInsights.skill_synergies || [];
    const recommendedFocus   = growthInsights.recommended_focus || null;
    const topGrowingSkills   = new Set(growthInsights.top_growing_skills || []);
    const atRiskSkills       = new Set(growthInsights.at_risk_skills || []);
    const growthVelocity     = growthInsights.growth_velocity || null; // fast|steady|slow|stagnant
    const mentorRecommendation = growthInsights.mentor_recommendation || null;

    // ── 1. SMART GAP DETECTION ──────────────────────────────────────────────
    // Weight gaps by urgency: declining > stable at low proficiency > growing
    const TRAJECTORY_URGENCY = { declining: 3, stable: 2, growing: 1, accelerating: 0 };

    const weightedGaps = menteeSkills
      .filter(s => s.proficiency_score < 70)
      .map(s => ({
        ...s,
        urgency: (TRAJECTORY_URGENCY[s.skill_growth_trajectory] || 2) *
                 (1 + (70 - (s.proficiency_score || 0)) / 70) // urgency * depth of gap
      }))
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 5); // top 5 urgent gaps

    const focusAreas = weightedGaps.map(s => s.skill_name);

    // ── 2. FETCH ALL CONTEXT IN PARALLEL ────────────────────────────────────
    const [mentorProfiles, allRelationships, allSessions, allMentorSkills] = await Promise.all([
      base44.entities.MentorProfile.filter({ is_confirmed: true, is_available: true }),
      base44.entities.MentorshipRelationship.list(),
      base44.entities.MentorshipSession.list(),
      base44.entities.AgentSkill.list('-proficiency_score', 2000)
    ]);

    if (!mentorProfiles.length) {
      return Response.json({ success: true, matches: [], message: 'No available mentors at this time' });
    }

    // ── 3. BUILD INTELLIGENCE INDEXES ───────────────────────────────────────
    const mentorFeedbackStats = buildMentorFeedbackStats(allRelationships, allSessions);
    const styleSuccessRates   = buildStyleSuccessRates(allRelationships, mentorProfiles);
    const mentorSkillMap      = buildMentorSkillMap(allMentorSkills);        // NEW
    const categoryEffectiveness = buildCategoryEffectiveness(              // NEW
      allRelationships, allSessions, mentorProfiles, allMentorSkills
    );

    // ── 4. SCORE EACH MENTOR ─────────────────────────────────────────────────
    const scoredMatches = [];

    for (const mentorProfile of mentorProfiles) {
      if (mentorProfile.current_mentee_count >= mentorProfile.max_mentees) continue;
      if (mentorProfile.agent_id === menteeAgentId) continue;

      const mentorAgentSkills = mentorSkillMap[mentorProfile.agent_id] || [];

      // 1. TRAJECTORY-AWARE SKILL COMPLEMENTARITY (30%)
      //    Rewards mentors whose OWN skills in the same category have high proficiency
      //    AND whose mentees' skills in that category have grown (category effectiveness).
      const skillComplementarity = calculateTrajectoryAwareComplementarity(
        weightedGaps,
        mentorProfile.expertise_areas,
        mentorAgentSkills,
        categoryEffectiveness[mentorProfile.agent_id]
      );

      // 2. AVAILABILITY (10%)
      const availabilityScore = mentorProfile.availability_hours_weekly > 0 ? 90 : 30;

      // 3. EXPERIENCE GAP (10%)
      const experienceGapScore = calculateExperienceGap(weightedGaps, mentorProfile.expertise_areas, mentorAgentSkills);

      // 4. PERSONALITY COMPATIBILITY (15%)
      const personalityScore = calculatePersonalityCompatibility(menteeAgent, mentorProfile);

      // 5. COMMUNICATION STYLE (5%)
      const communicationScore = ['flexible', 'mixed'].includes(mentorProfile.communication_style) ? 85 : 70;

      // 6. HISTORICAL FEEDBACK EFFECTIVENESS (25%) — increased weight
      const feedbackStats = mentorFeedbackStats[mentorProfile.agent_id];
      const effectivenessScore = calculateFeedbackEffectivenessScore(feedbackStats, mentorProfile);

      // 7. STYLE SUCCESS RATE (5%)
      const styleBonus = styleSuccessRates[mentorProfile.mentorship_style] || 70;

      // 8. GROWTH INSIGHTS ALIGNMENT (5%) — bonus when mentor suits the mentee's learning style & focus
      const growthAlignmentScore = calculateGrowthInsightsAlignment(
        mentorProfile, weightedGaps,
        recommendedFocus, atRiskSkills, growthVelocity, learningStyle
      );

      const matchQualityScore = Math.round(
        (skillComplementarity  * 0.28) +
        (availabilityScore     * 0.09) +
        (experienceGapScore    * 0.09) +
        (personalityScore      * 0.14) +
        (communicationScore    * 0.05) +
        (effectivenessScore    * 0.25) +
        (styleBonus            * 0.05) +
        (growthAlignmentScore  * 0.05)
      );

      if (matchQualityScore >= 40) {
        scoredMatches.push({
          mentorProfile,
          matchQualityScore,
          feedbackStats,
          categoryEffects: categoryEffectiveness[mentorProfile.agent_id],
          scoreBreakdown: {
            skillComplementarity,
            availabilityScore,
            experienceGapScore,
            personalityScore,
            communicationScore,
            effectivenessScore,
            styleBonus,
            growthAlignmentScore
          }
        });
      }
    }

    scoredMatches.sort((a, b) => b.matchQualityScore - a.matchQualityScore);
    const topMatches = scoredMatches.slice(0, limit);

    // ── 5. GENERATE AI REASONING + CREATE RELATIONSHIPS ──────────────────────
    const createdRelationships = [];

    for (const match of topMatches) {
      const feedback    = match.feedbackStats;
      const catEffects  = match.categoryEffects || {};

      const topCategoryStrengths = Object.entries(catEffects)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([cat, score]) => `${cat.replace(/_/g, ' ')} (${Math.round(score)}/100)`)
        .join(', ');

      const decliningGaps = weightedGaps
        .filter(g => g.skill_growth_trajectory === 'declining')
        .map(g => g.skill_name).join(', ');

      const feedbackContext = feedback
        ? `Mentor has ${feedback.totalSessions} sessions, avg satisfaction ${feedback.avgMenteeSatisfaction.toFixed(1)}/5, avg progress rating ${feedback.avgProgressRating.toFixed(1)}/10, completion rate ${feedback.completionRate != null ? feedback.completionRate.toFixed(0) + '%' : 'N/A'}.`
        : 'New mentor — fresh opportunity for a foundational record.';

      const reasoningPrompt = `
You are an expert AI mentorship advisor. Write 2-3 sentences explaining why this mentor is an ideal match for this mentee. Be specific and insightful.

Mentee focus areas (by urgency): ${focusAreas.join(', ')}
${decliningGaps ? `Declining skills needing urgent attention: ${decliningGaps}` : ''}
${recommendedFocus ? `AI-recommended skill focus: ${recommendedFocus}` : ''}
${learningStyle ? `Mentee learning style: ${learningStyle}` : ''}
${skillSynergies.length ? `Mentee skill synergies: ${skillSynergies.join('; ')}` : ''}
${growthVelocity ? `Mentee growth velocity: ${growthVelocity}` : ''}
${mentorRecommendation ? `AI mentor recommendation context: ${mentorRecommendation}` : ''}
Mentor expertise: ${match.mentorProfile.expertise_areas.map(e => e.skill_name || e).join(', ')}
Mentor style: ${match.mentorProfile.mentorship_style}
Mentor category strengths: ${topCategoryStrengths || 'broad'}
Match quality score: ${match.matchQualityScore}/100
Growth alignment score: ${match.scoreBreakdown.growthAlignmentScore}/100
${feedbackContext}

Focus on: skill alignment, learning style compatibility, growth trajectory, proven impact. Be encouraging and specific.`;

      const aiReasoningResponse = await base44.integrations.Core.InvokeLLM({ prompt: reasoningPrompt });

      // Build initial goals weighted by urgency (declining gaps first)
      const goals = generateWeightedGoals(weightedGaps);

      const relationship = await base44.entities.MentorshipRelationship.create({
        mentor_agent_id: match.mentorProfile.agent_id,
        mentee_agent_id: menteeAgentId,
        status: 'requested',
        focus_areas: focusAreas,
        goals,
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
        feedbackStats: match.feedbackStats,
        categoryEffects: match.categoryEffects
      });
    }

    return Response.json({
      success: true,
      matches: createdRelationships,
      menteeAgentId,
      focusAreas,
      urgentDeclines: weightedGaps.filter(g => g.skill_growth_trajectory === 'declining').map(g => g.skill_name),
      totalMatchesCreated: createdRelationships.length,
      styleSuccessRates,
      growthInsightsUsed: !!growthInsightsRaw,
      recommendedFocus,
      learningStyle,
      growthVelocity,
      recommendedNextStep: 'Review match suggestions and accept/decline mentorship invitations'
    });

  } catch (error) {
    console.error('Matching error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});

// ── Intelligence Builders ────────────────────────────────────────────────────

/**
 * Build a map of agent_id -> their AgentSkill records (for mentors).
 */
function buildMentorSkillMap(allSkills) {
  return allSkills.reduce((map, skill) => {
    if (!map[skill.agent_id]) map[skill.agent_id] = [];
    map[skill.agent_id].push(skill);
    return map;
  }, {});
}

/**
 * For each mentor, compute their average effectiveness per skill category
 * by correlating their mentees' skill_growth_trajectory improvements
 * against sessions they ran.
 *
 * Returns: { [mentorAgentId]: { [skill_category]: score 0-100 } }
 */
function buildCategoryEffectiveness(relationships, sessions, mentorProfiles, allSkills) {
  const result = {};
  const menteeSkillMap = buildMentorSkillMap(allSkills); // reuse — maps agent_id -> skills

  for (const rel of relationships) {
    if (rel.status !== 'completed' && rel.status !== 'active') continue;
    const mentorId = rel.mentor_agent_id;
    const menteeId = rel.mentee_agent_id;
    if (!mentorId || !menteeId) continue;

    if (!result[mentorId]) result[mentorId] = {};

    const menteeSkills = menteeSkillMap[menteeId] || [];
    for (const skill of menteeSkills) {
      if (!skill.skill_category) continue;
      const cat = skill.skill_category;

      // A mentor gets category credit when a mentee's skill is growing/accelerating
      const trajectoryScore = { accelerating: 100, growing: 75, stable: 50, declining: 10 }[skill.skill_growth_trajectory] || 50;

      // Factor in proficiency gain if tracked in the relationship
      let gainBonus = 0;
      if (rel.skill_proficiency_gains) {
        const gain = rel.skill_proficiency_gains.find(g => g.skill_name?.toLowerCase() === skill.skill_name?.toLowerCase());
        if (gain) {
          const delta = (gain.current_proficiency || 0) - (gain.starting_proficiency || 0);
          gainBonus = Math.max(0, Math.min(20, delta * 0.5));
        }
      }

      if (!result[mentorId][cat]) result[mentorId][cat] = [];
      result[mentorId][cat].push(Math.min(100, trajectoryScore + gainBonus));
    }
  }

  // Average each category
  for (const [mentorId, cats] of Object.entries(result)) {
    for (const [cat, scores] of Object.entries(cats)) {
      result[mentorId][cat] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  return result;
}

/**
 * Aggregate per-mentor feedback stats from completed relationships & sessions.
 */
function buildMentorFeedbackStats(relationships, sessions) {
  const stats = {};

  for (const rel of relationships) {
    const mentorId = rel.mentor_agent_id;
    if (!mentorId) continue;
    if (!stats[mentorId]) stats[mentorId] = {
      totalRelationships: 0, completedRelationships: 0, cancelledRelationships: 0,
      satisfactionSamples: [], progressSamples: [], totalSessions: 0, totalHours: 0
    };
    const s = stats[mentorId];
    s.totalRelationships++;
    if (rel.status === 'completed') s.completedRelationships++;
    if (rel.status === 'cancelled') s.cancelledRelationships++;
    if (rel.mentee_satisfaction) s.satisfactionSamples.push(rel.mentee_satisfaction);
    if (rel.mentor_satisfaction) s.satisfactionSamples.push(rel.mentor_satisfaction);
    s.totalSessions += rel.sessions_completed || 0;
    s.totalHours += rel.total_hours || 0;
  }

  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    const mentorId = session.mentor_agent_id;
    if (!mentorId || !stats[mentorId]) continue;
    if (session.progress_rating) stats[mentorId].progressSamples.push(session.progress_rating);
    if (session.session_quality) stats[mentorId].satisfactionSamples.push(session.session_quality / 2);
  }

  for (const s of Object.values(stats)) {
    s.avgMenteeSatisfaction = s.satisfactionSamples.length
      ? s.satisfactionSamples.reduce((a, b) => a + b, 0) / s.satisfactionSamples.length : 3.5;
    s.avgProgressRating = s.progressSamples.length
      ? s.progressSamples.reduce((a, b) => a + b, 0) / s.progressSamples.length : 5;
    s.completionRate = s.totalRelationships > 0
      ? (s.completedRelationships / s.totalRelationships) * 100 : null;
    s.cancellationRate = s.totalRelationships > 0
      ? (s.cancelledRelationships / s.totalRelationships) * 100 : null;
  }

  return stats;
}

function buildStyleSuccessRates(relationships, mentorProfiles) {
  const profileMap = {};
  for (const mp of mentorProfiles) profileMap[mp.agent_id] = mp;
  const byStyle = {};
  for (const rel of relationships) {
    if (!rel.mentee_satisfaction) continue;
    const profile = profileMap[rel.mentor_agent_id];
    if (!profile?.mentorship_style) continue;
    if (!byStyle[profile.mentorship_style]) byStyle[profile.mentorship_style] = [];
    byStyle[profile.mentorship_style].push(rel.mentee_satisfaction);
  }
  const rates = {};
  for (const [style, samples] of Object.entries(byStyle)) {
    rates[style] = Math.min(100, (samples.reduce((a, b) => a + b, 0) / samples.length) * 20);
  }
  return rates;
}

// ── Scoring Helpers ──────────────────────────────────────────────────────────

/**
 * NEW: Trajectory-aware skill complementarity.
 *
 * For each mentee gap skill:
 *   - Base match: does mentor have this in expertise_areas?
 *   - Trajectory bonus: mentor's own AgentSkill in this category has high proficiency?
 *   - Category effectiveness bonus: mentor has proven history growing this category in mentees?
 *   - Urgency weight: declining/stable gaps count more than growing ones
 */
function calculateTrajectoryAwareComplementarity(weightedGaps, expertiseAreas, mentorAgentSkills, mentorCategoryEffects) {
  if (!weightedGaps.length) return 0;

  const mentorSkillIndex = {};
  for (const s of mentorAgentSkills) {
    mentorSkillIndex[s.skill_name.toLowerCase()] = s;
    mentorSkillIndex[s.skill_category] = s; // category-level fallback
  }

  const catEffects = mentorCategoryEffects || {};
  let totalScore = 0;
  let totalWeight = 0;

  for (const gap of weightedGaps) {
    const weight = gap.urgency;
    totalWeight += weight;

    // Base: does mentor list this skill in expertise?
    const expertiseMatch = expertiseAreas.some(
      e => (e.skill_name || e).toLowerCase() === gap.skill_name.toLowerCase()
    );

    let gapScore = expertiseMatch ? 60 : 20;

    // Bonus: mentor's own proficiency in this skill
    const mentorOwnSkill = mentorSkillIndex[gap.skill_name.toLowerCase()];
    if (mentorOwnSkill) {
      const mentorProficiency = mentorOwnSkill.proficiency_score || 0;
      // A mentor at 80+ proficiency gets full bonus; scales down from there
      gapScore += Math.min(25, (mentorProficiency / 100) * 25);

      // Extra bonus if mentor's skill is accelerating/growing (they're also evolving)
      if (['accelerating', 'growing'].includes(mentorOwnSkill.skill_growth_trajectory)) {
        gapScore += 10;
      }
    }

    // Bonus: proven category effectiveness with past mentees
    if (gap.skill_category && catEffects[gap.skill_category] !== undefined) {
      const catScore = catEffects[gap.skill_category]; // 0-100
      gapScore += Math.min(15, (catScore / 100) * 15);
    }

    // Urgency amplifier: declining gaps weighted more heavily
    if (gap.skill_growth_trajectory === 'declining' && expertiseMatch) gapScore = Math.min(100, gapScore + 15);

    totalScore += Math.min(100, gapScore) * weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Experience gap: checks mentor has meaningful mastery (proficiency ≥ 65 or level ≥ 6).
 * Now uses actual AgentSkill data when available, falls back to expertise_areas.
 */
function calculateExperienceGap(weightedGaps, expertiseAreas, mentorAgentSkills) {
  if (!weightedGaps.length) return 0;

  const mentorSkillIndex = {};
  for (const s of mentorAgentSkills) mentorSkillIndex[s.skill_name.toLowerCase()] = s;

  let valid = 0;
  for (const gap of weightedGaps) {
    const ownSkill = mentorSkillIndex[gap.skill_name.toLowerCase()];
    if (ownSkill) {
      // Use live proficiency data
      if ((ownSkill.proficiency_score || 0) >= 65 || (ownSkill.level || 1) >= 6) valid++;
    } else {
      // Fall back to expertise_areas declared data
      const expertise = expertiseAreas.find(
        e => (e.skill_name || e).toLowerCase() === gap.skill_name.toLowerCase()
      );
      if (expertise && (expertise.level || 5) >= 6) valid++;
    }
  }

  return (valid / weightedGaps.length) * 100;
}

function calculatePersonalityCompatibility(menteeAgent, mentorProfile) {
  let score = 60;
  if (menteeAgent.personality?.includes('learning')) score += 15;
  if (mentorProfile.mentorship_values?.some(v => v.includes('growth'))) score += 10;
  if (menteeAgent.role && mentorProfile.preferred_mentee_types?.includes(menteeAgent.role)) score += 10;
  return Math.min(100, score);
}

function calculateFeedbackEffectivenessScore(feedbackStats, mentorProfile) {
  if (!feedbackStats || feedbackStats.totalSessions === 0) {
    return Math.min(100, (mentorProfile.average_mentee_satisfaction || 3.5) * 20);
  }

  const satisfactionScore   = feedbackStats.avgMenteeSatisfaction * 20;
  const progressScore       = feedbackStats.avgProgressRating * 10;
  const cancellationPenalty = feedbackStats.cancellationRate != null
    ? Math.max(0, feedbackStats.cancellationRate * 0.3) : 0;
  const experienceBonus     = Math.min(10, feedbackStats.totalSessions);

  return Math.max(0, Math.min(100,
    (satisfactionScore * 0.5) + (progressScore * 0.4) + experienceBonus - cancellationPenalty
  ));
}

/**
 * Generate goals ordered by urgency — declining gaps get shorter target dates.
 */
function generateWeightedGoals(weightedGaps) {
  return weightedGaps.slice(0, 4).map((gap, i) => {
    const weeksToTarget = gap.skill_growth_trajectory === 'declining' ? 8
      : gap.skill_growth_trajectory === 'stable' ? 12 : 16;
    return {
      goal: `Bring ${gap.skill_name} from ${Math.round(gap.proficiency_score || 0)}% to ${Math.min(100, Math.round((gap.proficiency_score || 0) + 25))}% proficiency`,
      target_date: new Date(Date.now() + weeksToTarget * 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false,
      skill_related: gap.skill_id
    };
  });
}