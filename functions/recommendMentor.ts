import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mentee_agent_id, skill_focus } = await req.json();

        const [mentee, allAgents, endorsements, synergy, performances] = await Promise.all([
            base44.entities.Agent.get(mentee_agent_id),
            base44.entities.Agent.list(),
            base44.entities.SkillEndorsement.list(),
            base44.entities.TeamSynergy.list(),
            base44.entities.AgentPerformanceMetrics.list('-created_date', 100)
        ]);

        // Find agents with high proficiency in target skill
        const potentialMentors = allAgents.filter(agent => {
            if (agent.id === mentee_agent_id) return false;
            
            const hasSkill = agent.core_skills?.some(s => 
                s.name.toLowerCase().includes(skill_focus.toLowerCase()) && s.level >= 3
            );
            
            return hasSkill || (agent.role === 'teacher' || agent.role === 'elder' || agent.role === 'master');
        });

        const prompt = `You are matching a mentee with the best mentor for skill development in SoulBridge Village.

**Mentee:** ${mentee.name} (${mentee.role})
**Skill to Learn:** ${skill_focus}

**Potential Mentors:**
${potentialMentors.map(m => {
    const mentorEndorsements = endorsements.filter(e => e.endorsed_agent_id === m.id && e.skill_name.toLowerCase().includes(skill_focus.toLowerCase()));
    const menteeRelation = synergy.find(s => 
        (s.agent_a_id === mentee_agent_id && s.agent_b_id === m.id) ||
        (s.agent_b_id === mentee_agent_id && s.agent_a_id === m.id)
    );
    
    return `
- ${m.name} (${m.role})
  Honor: ${m.honor_score}
  Skills: ${m.core_skills?.map(s => `${s.name} (${s.level}/5)`).join(', ')}
  Endorsements for ${skill_focus}: ${mentorEndorsements.length}
  Past synergy with mentee: ${menteeRelation?.synergy_score || 'None'}
  Teaching experience: ${m.role === 'teacher' || m.role === 'elder' ? 'Yes' : 'No'}
`;
}).join('\n')}

**Selection Criteria:**
1. **Skill Mastery**: High proficiency in ${skill_focus}
2. **Teaching Ability**: Experience mentoring or educating others
3. **Compatibility**: Good synergy/relationship with mentee
4. **Availability**: Not overloaded with other commitments
5. **Teaching Style**: Match to mentee's learning needs

Recommend the top 5 mentors with detailed rationale.`;

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
                                mentor_name: { type: "string" },
                                mentor_agent_id: { type: "string" },
                                match_score: { type: "number" },
                                strengths: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                teaching_approach: { type: "string" },
                                estimated_availability: { type: "string" },
                                recommended_session_structure: { type: "string" },
                                why_good_match: { type: "string" }
                            }
                        }
                    },
                    mentorship_strategy: {
                        type: "object",
                        properties: {
                            recommended_duration: { type: "string" },
                            session_frequency: { type: "string" },
                            focus_areas: {
                                type: "array",
                                items: { type: "string" }
                            },
                            success_indicators: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            mentee_agent_id,
            skill_focus,
            mentor_recommendations: aiResponse,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Mentor recommendation error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});