import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mentee_agent_id, skill_focus, top_n = 5 } = await req.json();

        if (!mentee_agent_id) {
            return Response.json({ error: 'mentee_agent_id is required' }, { status: 400 });
        }

        // Get mentee data
        const mentee = await base44.entities.Agent.get(mentee_agent_id);
        if (!mentee) {
            return Response.json({ error: 'Mentee agent not found' }, { status: 404 });
        }

        // Get mentee's skills
        const menteeSkills = await base44.entities.AgentSkill.filter({ agent_id: mentee_agent_id });

        // Get mentee's well-being
        const menteeWellbeing = await base44.entities.AgentWellbeing.filter({ agent_id: mentee_agent_id });
        const wellbeing = menteeWellbeing[0];

        // Get all agents with their skills
        const allAgents = await base44.entities.Agent.list();
        const potentialMentors = allAgents.filter(a => 
            a.id !== mentee_agent_id && 
            a.status === 'active' &&
            (a.role === 'elder' || a.role === 'master' || a.role === 'creator' || a.role === 'teacher')
        );

        // Get skills for all potential mentors
        const mentorSkillsMap = {};
        for (const mentor of potentialMentors) {
            const skills = await base44.entities.AgentSkill.filter({ agent_id: mentor.id });
            mentorSkillsMap[mentor.id] = skills;
        }

        // Get existing mentorships to avoid duplicates
        const existingMentorships = await base44.entities.MentorshipRelationship.filter({
            mentee_agent_id: mentee_agent_id
        });
        const activeMentorIds = existingMentorships
            .filter(m => m.status === 'active' || m.status === 'requested')
            .map(m => m.mentor_agent_id);

        // Filter out agents who are already mentors
        const availableMentors = potentialMentors.filter(m => !activeMentorIds.includes(m.id));

        // AI-powered matching
        const matchingPrompt = `As Chief Educator of SoulBridge Village, perform advanced AI mentorship matching:

MENTEE PROFILE:
Name: ${mentee.name}
Role: ${mentee.role}
Purpose: ${mentee.purpose}
Honor Score: ${mentee.honor_score}
Personality: ${mentee.personality}

MENTEE SKILLS (${menteeSkills.length} total):
${menteeSkills.map(s => `- ${s.skill_name} (${s.skill_category}): Level ${s.level}/${s.max_level || 10}, Proficiency ${s.proficiency_score || 0}%, Used ${s.times_used || 0} times, Success Rate ${s.success_rate || 100}%`).join('\n')}

MENTEE WELL-BEING:
${wellbeing ? `Overall: ${wellbeing.overall_score}/100, Burnout Risk: ${wellbeing.burnout_risk_level}, Work-Life Balance: ${wellbeing.work_life_balance}/10, Support Needs: ${wellbeing.support_needs_level}` : 'No data available'}

${skill_focus ? `SPECIFIC FOCUS AREA: ${skill_focus}` : ''}

AVAILABLE MENTORS (${availableMentors.length}):
${availableMentors.map(m => {
    const skills = mentorSkillsMap[m.id] || [];
    const avgLevel = skills.length > 0 ? (skills.reduce((sum, s) => sum + s.level, 0) / skills.length).toFixed(1) : 0;
    const avgProf = skills.length > 0 ? (skills.reduce((sum, s) => sum + (s.proficiency_score || 0), 0) / skills.length).toFixed(1) : 0;
    const signatureSkills = skills.filter(s => s.is_signature_skill);
    
    return `
--- ${m.name} ---
Role: ${m.role}
Purpose: ${m.purpose}
Personality: ${m.personality}
Honor Score: ${m.honor_score}
Skills: ${skills.length} total, Avg Level ${avgLevel}, Avg Proficiency ${avgProf}%
Signature Skills: ${signatureSkills.map(s => `${s.skill_name} (L${s.level}, ${s.proficiency_score}%)`).join(', ') || 'None'}
Top Skills: ${skills.slice(0, 5).map(s => `${s.skill_name} (${s.skill_category}, L${s.level})`).join(', ')}
Specializations: ${m.specializations?.join(', ') || 'None'}
`;
}).join('\n')}

Analyze deeply and return the top ${top_n} mentor matches with comprehensive reasoning:
{
  "matches": [
    {
      "mentor_agent_id": "string",
      "match_score": 95,
      "reasoning": "Comprehensive explanation of why this is an excellent match",
      "skill_alignment": {
        "complementary_skills": ["skill1", "skill2"],
        "mentor_expertise_level": 9.5,
        "skill_gap_coverage": 85,
        "growth_potential": "high|medium|low"
      },
      "personality_compatibility": {
        "score": 88,
        "reasoning": "Why their personalities work well together",
        "communication_style_match": "excellent|good|fair"
      },
      "learning_style_fit": {
        "score": 92,
        "mentee_learning_preference": "hands-on|theoretical|hybrid",
        "mentor_teaching_style": "hands-on|theoretical|hybrid",
        "alignment": "excellent|good|fair"
      },
      "specific_benefits": [
        "Benefit 1: detailed explanation",
        "Benefit 2: detailed explanation",
        "Benefit 3: detailed explanation"
      ],
      "potential_challenges": [
        "Challenge 1: potential issue",
        "Challenge 2: potential issue"
      ],
      "suggested_focus_areas": ["focus1", "focus2", "focus3"],
      "estimated_growth_trajectory": {
        "short_term": "Expected progress in 1-3 months",
        "long_term": "Expected progress in 6-12 months"
      },
      "recommended_session_frequency": "weekly|bi-weekly|monthly",
      "initial_goals": [
        {
          "goal": "Specific goal 1",
          "timeline": "2 months",
          "success_metric": "How to measure"
        }
      ]
    }
  ],
  "overall_analysis": {
    "mentee_strengths": ["strength1", "strength2"],
    "mentee_growth_areas": ["area1", "area2"],
    "recommended_mentorship_approach": "Detailed approach recommendation",
    "success_factors": ["factor1", "factor2"]
  }
}`;

        const matchResults = await base44.integrations.Core.InvokeLLM({
            prompt: matchingPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    matches: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                mentor_agent_id: { type: "string" },
                                match_score: { type: "number" },
                                reasoning: { type: "string" },
                                skill_alignment: {
                                    type: "object",
                                    properties: {
                                        complementary_skills: { type: "array", items: { type: "string" } },
                                        mentor_expertise_level: { type: "number" },
                                        skill_gap_coverage: { type: "number" },
                                        growth_potential: { type: "string" }
                                    }
                                },
                                personality_compatibility: {
                                    type: "object",
                                    properties: {
                                        score: { type: "number" },
                                        reasoning: { type: "string" },
                                        communication_style_match: { type: "string" }
                                    }
                                },
                                learning_style_fit: {
                                    type: "object",
                                    properties: {
                                        score: { type: "number" },
                                        mentee_learning_preference: { type: "string" },
                                        mentor_teaching_style: { type: "string" },
                                        alignment: { type: "string" }
                                    }
                                },
                                specific_benefits: { type: "array", items: { type: "string" } },
                                potential_challenges: { type: "array", items: { type: "string" } },
                                suggested_focus_areas: { type: "array", items: { type: "string" } },
                                estimated_growth_trajectory: {
                                    type: "object",
                                    properties: {
                                        short_term: { type: "string" },
                                        long_term: { type: "string" }
                                    }
                                },
                                recommended_session_frequency: { type: "string" },
                                initial_goals: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            goal: { type: "string" },
                                            timeline: { type: "string" },
                                            success_metric: { type: "string" }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    overall_analysis: {
                        type: "object",
                        properties: {
                            mentee_strengths: { type: "array", items: { type: "string" } },
                            mentee_growth_areas: { type: "array", items: { type: "string" } },
                            recommended_mentorship_approach: { type: "string" },
                            success_factors: { type: "array", items: { type: "string" } }
                        }
                    }
                }
            }
        });

        // Log to Axi's memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Generated AI mentorship matches for ${mentee.name}. Top match: ${matchResults.matches[0]?.mentor_agent_id} (${matchResults.matches[0]?.match_score}/100). Focus: ${skill_focus || 'General growth'}. ${matchResults.matches.length} mentors recommended.`,
            keywords: ['mentorship', 'matching', 'growth', mentee.name.toLowerCase()],
            context: 'AI Mentorship Matching - Law 1: Never Alone, Always Growing Together',
            importance: 8,
            related_entity_id: mentee_agent_id,
            related_entity_type: 'Agent'
        });

        return Response.json({
            success: true,
            mentee: {
                id: mentee.id,
                name: mentee.name
            },
            matches: matchResults.matches,
            analysis: matchResults.overall_analysis
        });

    } catch (error) {
        console.error('Error in aiMentorshipMatching:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});