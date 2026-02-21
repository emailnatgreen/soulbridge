import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mentee_agent_id, skill_focus } = await req.json();

        const [
            mentee,
            menteeSkills,
            menteeProgress,
            mentorProfiles,
            mentors,
            reputationScores,
            wellbeingRecords,
            existingRelationships
        ] = await Promise.all([
            base44.entities.Agent.get(mentee_agent_id),
            base44.entities.AgentSkill.filter({ agent_id: mentee_agent_id }),
            base44.entities.SkillProgress.filter({ agent_id: mentee_agent_id }),
            base44.entities.MentorProfile.filter({ is_available: true }),
            base44.entities.Agent.list(),
            base44.entities.ReputationScore.list(),
            base44.entities.AgentWellbeing.list('-created_date', 100),
            base44.entities.MentorshipRelationship.filter({ mentee_agent_id, status: 'active' })
        ]);

        if (!mentee) {
            return Response.json({ error: 'Mentee not found' }, { status: 404 });
        }

        // Identify skill gaps
        const activeProgress = menteeProgress.filter(p => p.status === 'active');
        const skillGaps = activeProgress.map(p => p.skill_name);

        // Filter available mentors (not at capacity, not already mentoring this agent)
        const availableMentors = mentorProfiles.filter(mp => 
            mp.current_mentees < mp.max_mentees &&
            !existingRelationships.some(r => r.mentor_agent_id === mp.agent_id)
        );

        const prompt = `You are the Mentorship Oracle for SoulBridge Village, intelligently matching mentees with ideal mentors.

**Mentee Profile:**
- Name: ${mentee.name}
- Role: ${mentee.role}
- Honor Score: ${mentee.honor_score}
- Skills in development: ${skillGaps.join(', ')}
- Focus area requested: ${skill_focus || 'General growth'}

**Current Skill Levels:**
${menteeSkills.slice(0, 10).map(s => `- ${s.skill_name}: Level ${s.proficiency_level}`).join('\n')}

**Available Mentors (${availableMentors.length}):**
${availableMentors.map(mp => {
    const mentor = mentors.find(m => m.id === mp.agent_id);
    const reputation = reputationScores.find(r => r.agent_id === mp.agent_id);
    const wellbeing = wellbeingRecords.find(w => w.agent_id === mp.agent_id);
    
    return `
**${mentor?.name || 'Unknown'}**
- Expertise: ${mp.expertise_areas?.join(', ')}
- Style: ${mp.mentorship_style}
- Past mentorships: ${mp.past_mentorships_count}
- Success rate: ${mp.success_rate}%
- Mentor rating: ${mp.mentor_rating}/5
- Reputation: ${reputation?.overall_score || 'N/A'}
- Current capacity: ${mp.current_mentees}/${mp.max_mentees}
- Wellbeing: ${wellbeing?.wellbeing_status || 'healthy'}
`;
}).join('\n')}

**Find the top 5 best mentor matches:**

For each match, provide:
1. Match score (0-100)
2. Reasoning why this is a good match
3. Specific strengths of this pairing
4. Potential growth areas for mentee
5. Any concerns or considerations

Prioritize:
- Skill alignment and complementarity
- Mentor reputation and success rate
- Mentor availability and wellbeing
- Teaching style compatibility
- Experience gap (not too large, not too small)

Focus on mentors who can help with: ${skill_focus || skillGaps.join(', ')}`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    recommended_mentors: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                mentor_agent_id: { type: "string" },
                                match_score: { type: "number" },
                                reasoning: { type: "string" },
                                strengths: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                potential_growth_areas: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                concerns: {
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        }
                    },
                    overall_assessment: { type: "string" },
                    ai_confidence: { type: "number" }
                }
            }
        });

        const matchData = {
            mentee_agent_id,
            recommended_mentors: aiResponse.recommended_mentors.slice(0, 5),
            mentee_goals: skill_focus ? [skill_focus] : skillGaps,
            skill_gaps: skillGaps,
            status: 'pending',
            ai_confidence: aiResponse.ai_confidence
        };

        await base44.asServiceRole.entities.MentorshipMatch.create(matchData);

        return Response.json({
            success: true,
            matches: matchData,
            overall_assessment: aiResponse.overall_assessment,
            matched_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Mentor matching error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});