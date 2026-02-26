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

    // Fetch mentee agent and skill data
    const menteeAgent = await base44.entities.Agent.read(menteeAgentId);
    if (!menteeAgent) {
      return Response.json({ error: 'Mentee agent not found' }, { status: 404 });
    }

    const menteeSkills = await base44.entities.AgentSkill.filter({ agent_id: menteeAgentId });
    const menteeWellbeing = await base44.entities.AgentWellbeing.filter({ agent_id: menteeAgentId });
    const menteeDevPlan = await base44.entities.SkillDevelopmentPlan.filter({ agent_id: menteeAgentId });

    // Identify mentee's focus areas and skill gaps
    const skillGaps = menteeSkills
      .filter(s => s.proficiency_score < 60)
      .sort((a, b) => b.proficiency_score - a.proficiency_score)
      .slice(0, 3);

    const focusAreas = skillGaps.map(s => s.skill_name);

    // Fetch all available mentor profiles
    const mentorProfiles = await base44.entities.MentorProfile.filter({ is_confirmed: true, is_available: true });

    if (mentorProfiles.length === 0) {
      return Response.json({
        success: true,
        matches: [],
        message: 'No available mentors at this time'
      });
    }

    // Score each potential mentor match
    const scoredMatches = [];

    for (const mentorProfile of mentorProfiles) {
      // Skip if mentor is at max capacity
      if (mentorProfile.current_mentee_count >= mentorProfile.max_mentees) {
        continue;
      }

      // Skip if mentor is the mentee
      if (mentorProfile.agent_id === menteeAgentId) {
        continue;
      }

      // 1. SKILL COMPLEMENTARITY SCORE
      const skillComplementarity = calculateSkillComplementarity(
        skillGaps,
        mentorProfile.expertise_areas
      );

      // 2. AVAILABILITY ALIGNMENT SCORE
      const availabilityScore = mentorProfile.availability_hours_weekly > 0 ? 90 : 30;

      // 3. EXPERIENCE GAP SCORE
      const experienceGapScore = calculateExperienceGap(
        skillGaps,
        mentorProfile.expertise_areas
      );

      // 4. PERSONALITY COMPATIBILITY SCORE
      const personalityScore = calculatePersonalityCompatibility(
        menteeAgent,
        mentorProfile
      );

      // 5. COMMUNICATION STYLE ALIGNMENT
      const communicationScore = mentorProfile.communication_style === 'flexible' || 
                                mentorProfile.communication_style === 'mixed' ? 85 : 70;

      // 6. MENTORING EFFECTIVENESS HISTORY
      const effectivenessScore = Math.min(
        100,
        (mentorProfile.average_mentee_satisfaction || 3.5) * 20
      );

      // Calculate weighted match quality score
      const matchQualityScore = Math.round(
        (skillComplementarity * 0.35) +
        (availabilityScore * 0.15) +
        (experienceGapScore * 0.15) +
        (personalityScore * 0.20) +
        (communicationScore * 0.10) +
        (effectivenessScore * 0.05)
      );

      if (matchQualityScore >= 50) {
        scoredMatches.push({
          mentorProfile,
          matchQualityScore,
          scoreBreakdown: {
            skillComplementarity,
            availabilityScore,
            experienceGapScore,
            personalityScore,
            communicationScore,
            effectivenessScore
          }
        });
      }
    }

    // Sort by match quality and take top matches
    scoredMatches.sort((a, b) => b.matchQualityScore - a.matchQualityScore);
    const topMatches = scoredMatches.slice(0, limit);

    // Generate AI reasoning for each match and create relationships
    const createdRelationships = [];

    for (const match of topMatches) {
      // Generate AI match reasoning via LLM
      const reasoningPrompt = `
As an expert in mentorship matching, provide a brief (2-3 sentences) explanation of why mentor "${match.mentorProfile.agent_id}" would be an excellent match for mentee "${menteeAgentId}".

Consider:
- Mentor's expertise areas: ${match.mentorProfile.expertise_areas.map(e => e.skill_name).join(', ')}
- Mentee's focus areas: ${focusAreas.join(', ')}
- Mentor's mentorship style: ${match.mentorProfile.mentorship_style}
- Match quality score: ${match.matchQualityScore}/100

Provide reasoning that is encouraging and highlights the growth potential of this partnership.`;

      const aiReasoningResponse = await base44.integrations.Core.InvokeLLM({
        prompt: reasoningPrompt
      });

      // Create MentorshipRelationship
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
        scoreBreakdown: match.scoreBreakdown
      });
    }

    return Response.json({
      success: true,
      matches: createdRelationships,
      menteeAgentId,
      focusAreas,
      totalMatchesCreated: createdRelationships.length,
      recommendedNextStep: 'Review match suggestions and accept/decline mentorship invitations'
    });

  } catch (error) {
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});

// Helper: Calculate skill complementarity between mentee gaps and mentor expertise
function calculateSkillComplementarity(skillGaps, expertiseAreas) {
  if (skillGaps.length === 0) return 0;
  
  let matchCount = 0;
  for (const gap of skillGaps) {
    const hasMatch = expertiseAreas.some(
      e => e.skill_name.toLowerCase() === gap.skill_name.toLowerCase()
    );
    if (hasMatch) matchCount++;
  }
  
  return (matchCount / skillGaps.length) * 100;
}

// Helper: Calculate experience gap (ensure mentor is sufficiently advanced)
function calculateExperienceGap(skillGaps, expertiseAreas) {
  if (skillGaps.length === 0) return 0;
  
  let validGaps = 0;
  for (const gap of skillGaps) {
    const mentorExpertise = expertiseAreas.find(
      e => e.skill_name.toLowerCase() === gap.skill_name.toLowerCase()
    );
    
    if (mentorExpertise && mentorExpertise.level >= 6) {
      validGaps++;
    }
  }
  
  return (validGaps / skillGaps.length) * 100;
}

// Helper: Calculate personality compatibility
function calculatePersonalityCompatibility(menteeAgent, mentorProfile) {
  // Base score
  let score = 60;
  
  // Boost if both focus on growth/learning
  if (menteeAgent.personality && menteeAgent.personality.includes('learning')) {
    score += 15;
  }
  
  // Boost based on mentor's mentorship values
  if (mentorProfile.mentorship_values && 
      mentorProfile.mentorship_values.some(v => v.includes('growth'))) {
    score += 10;
  }
  
  return Math.min(100, score);
}

// Helper: Generate initial mentorship goals
function generateInitialGoals(skillGaps) {
  return skillGaps.slice(0, 3).map(skill => ({
    goal: `Develop proficiency in ${skill.skill_name}`,
    target_date: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
    completed: false,
    skill_related: skill.skill_id
  }));
}