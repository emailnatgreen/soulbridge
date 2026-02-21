import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { session_id, project_id } = await req.json();

        const [
            session,
            messages,
            agents,
            synergy
        ] = await Promise.all([
            session_id ? base44.entities.CollaborativeSession.get(session_id) : Promise.resolve(null),
            session_id ? base44.entities.ProjectMessage.filter({ project_id: session?.project_id }) : [],
            base44.entities.Agent.list(),
            base44.entities.TeamSynergy.list()
        ]);

        if (!session && !project_id) {
            return Response.json({ error: 'Session or project required' }, { status: 400 });
        }

        const participants = session?.participant_agent_ids || [];
        const participantSynergy = synergy.filter(s => 
            participants.includes(s.agent_a_id) && participants.includes(s.agent_b_id)
        );

        const avgSynergy = participantSynergy.length > 0
            ? participantSynergy.reduce((sum, s) => sum + s.synergy_score, 0) / participantSynergy.length
            : 5;

        const prompt = `Assess the quality of this collaboration session:

**Session:** ${session?.title || 'Collaboration Session'}
**Type:** ${session?.session_type || 'general'}
**Participants:** ${participants.map(id => agents.find(a => a.id === id)?.name).join(', ')}
**Duration:** ${session?.duration_minutes || 0} minutes

**Session Data:**
- Agenda: ${session?.agenda || 'Not specified'}
- Decisions made: ${session?.decisions?.length || 0}
- Action items: ${session?.action_items?.length || 0}
- Productivity score: ${session?.productivity_score || 0}/10
- Existing synergy score: ${avgSynergy.toFixed(1)}/10

**Assess collaboration quality across dimensions:**

1. **Communication Effectiveness** (0-100): How well did participants communicate?
2. **Decision Making Speed** (0-100): How efficiently were decisions made?
3. **Conflict Resolution** (0-100): How well were conflicts handled?
4. **Idea Generation** (0-100): Quality and quantity of ideas?
5. **Mutual Support** (0-100): How supportive were participants?
6. **Goal Alignment** (0-100): How aligned on objectives?

Also assess:
- **Participation Balance** (0-100): Equal participation?
- **Overall Quality Score** (0-100)
- **Strengths** of this collaboration
- **Areas for Improvement**
- **AI Recommendations** for better collaboration`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    quality_score: { type: "number" },
                    dimensions: {
                        type: "object",
                        properties: {
                            communication_effectiveness: { type: "number" },
                            decision_making_speed: { type: "number" },
                            conflict_resolution: { type: "number" },
                            idea_generation: { type: "number" },
                            mutual_support: { type: "number" },
                            goal_alignment: { type: "number" }
                        }
                    },
                    interaction_patterns: {
                        type: "object",
                        properties: {
                            participation_balance: { type: "number" },
                            interruptions: { type: "number" },
                            consensus_level: { type: "number" }
                        }
                    },
                    strengths: {
                        type: "array",
                        items: { type: "string" }
                    },
                    areas_for_improvement: {
                        type: "array",
                        items: { type: "string" }
                    },
                    ai_recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                recommendation: { type: "string" },
                                priority: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const qualityData = {
            session_id,
            project_id,
            participants,
            quality_score: aiResponse.quality_score,
            dimensions: aiResponse.dimensions,
            interaction_patterns: aiResponse.interaction_patterns,
            strengths: aiResponse.strengths,
            areas_for_improvement: aiResponse.areas_for_improvement,
            ai_recommendations: aiResponse.ai_recommendations,
            assessed_at: new Date().toISOString()
        };

        await base44.asServiceRole.entities.CollaborationQuality.create(qualityData);

        return Response.json({
            success: true,
            quality_assessment: qualityData,
            assessed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Collaboration quality assessment error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});