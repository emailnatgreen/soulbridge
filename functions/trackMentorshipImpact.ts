import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { relationship_id } = await req.json();

        const [
            relationship,
            sessions,
            menteeSkillsBefore,
            menteeSkillsNow
        ] = await Promise.all([
            base44.entities.MentorshipRelationship.get(relationship_id),
            base44.entities.MentorshipSession.filter({ relationship_id }),
            base44.entities.SkillProgress.filter({ agent_id: '' }),
            base44.entities.AgentSkill.list()
        ]);

        if (!relationship) {
            return Response.json({ error: 'Relationship not found' }, { status: 404 });
        }

        const menteeCurrentSkills = menteeSkillsNow.filter(s => 
            s.agent_id === relationship.mentee_agent_id
        );

        const totalHours = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;
        const avgSessionQuality = sessions.length > 0
            ? sessions.reduce((sum, s) => sum + (s.session_quality || 0), 0) / sessions.length
            : 0;

        const prompt = `Analyze the impact of this mentorship relationship:

**Mentorship Details:**
- Duration: ${relationship.started_date} to ${relationship.completed_date || 'ongoing'}
- Sessions completed: ${sessions.length}
- Total hours: ${totalHours.toFixed(1)}
- Focus areas: ${relationship.focus_areas?.join(', ')}

**Session Quality:**
- Average session quality: ${avgSessionQuality.toFixed(1)}/10
- Topics covered: ${[...new Set(sessions.flatMap(s => s.topics_covered || []))].join(', ')}

**Assess:**
1. Skill improvement (0-100)
2. Goal achievement rate (0-100)
3. Relationship quality (0-100)
4. Overall impact score (0-100)
5. Key achievements
6. Areas for continued growth
7. Success factors
8. Recommendations for future`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    skill_improvement_score: { type: "number" },
                    goal_achievement_rate: { type: "number" },
                    relationship_quality: { type: "number" },
                    overall_impact: { type: "number" },
                    key_achievements: {
                        type: "array",
                        items: { type: "string" }
                    },
                    areas_for_growth: {
                        type: "array",
                        items: { type: "string" }
                    },
                    success_factors: {
                        type: "array",
                        items: { type: "string" }
                    },
                    recommendations: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        await base44.asServiceRole.entities.MentorshipRelationship.update(relationship_id, {
            total_hours: totalHours,
            sessions_completed: sessions.length,
            mentee_skill_improvement: {
                score: aiResponse.skill_improvement_score,
                achievements: aiResponse.key_achievements
            }
        });

        return Response.json({
            success: true,
            impact_analysis: aiResponse,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Impact tracking error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});