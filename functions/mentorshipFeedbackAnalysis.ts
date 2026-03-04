import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled bi-weekly automation: analyses feedback from active mentorship
// relationships and sessions, re-scores match quality, flags struggling
// relationships for early intervention, and feeds insights back to refine
// the matching algorithm over time.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const [relationships, sessions, agents] = await Promise.all([
            base44.asServiceRole.entities.MentorshipRelationship.filter({ status: 'active' }),
            base44.asServiceRole.entities.MentorshipSession.filter({}, '-created_date', 100),
            base44.asServiceRole.entities.Agent.filter({ status: 'active' })
        ]);

        if (relationships.length === 0) {
            return Response.json({ success: true, skipped: true, reason: 'No active mentorship relationships' });
        }

        // Build session stats per relationship
        const sessionsByRelationship = {};
        sessions.forEach(s => {
            if (!s.relationship_id) return;
            if (!sessionsByRelationship[s.relationship_id]) sessionsByRelationship[s.relationship_id] = [];
            sessionsByRelationship[s.relationship_id].push(s);
        });

        // Build relationship health profiles
        const relationshipProfiles = relationships.map(r => {
            const relSessions = sessionsByRelationship[r.id] || [];
            const avgRating = relSessions.length
                ? relSessions.reduce((acc, s) => acc + (s.rating || 3), 0) / relSessions.length
                : null;
            const mentor = agents.find(a => a.id === r.mentor_agent_id);
            const mentee = agents.find(a => a.id === r.mentee_agent_id);
            return {
                id: r.id,
                mentor_id: r.mentor_agent_id,
                mentee_id: r.mentee_agent_id,
                mentor_name: mentor?.name || 'Unknown',
                mentee_name: mentee?.name || 'Unknown',
                session_count: relSessions.length,
                avg_rating: avgRating,
                last_session: relSessions[0]?.created_date || null,
                goals_met: r.goals_met || 0,
                total_goals: r.total_goals || 0
            };
        });

        // AI analysis of relationship health and algorithm refinement signals
        const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `You are Axi's Mentorship Quality Analyst for SoulBridge Village. Analyse the health of active mentorship relationships and extract signals to improve future matching.

ACTIVE RELATIONSHIPS (${relationshipProfiles.length}):
${relationshipProfiles.map(r =>
    `- ${r.mentor_name} → ${r.mentee_name}: ${r.session_count} sessions, avg rating: ${r.avg_rating?.toFixed(1) || 'no ratings yet'}, goals met: ${r.goals_met}/${r.total_goals}, last active: ${r.last_session || 'never'}`
).join('\n')}

For each relationship:
1. Assess health (thriving / stable / at_risk / stagnant)
2. Identify root cause if struggling
3. Suggest an intervention if needed

Then provide:
- Overall program health score (0-100)
- Top 3 algorithm improvement signals extracted from this data (what compatibility factors seem to predict success?)
- Recommended matching weight adjustments for the next cycle`,
            response_json_schema: {
                type: "object",
                properties: {
                    relationship_assessments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                relationship_id: { type: "string" },
                                health_status: { type: "string" },
                                root_cause: { type: "string" },
                                intervention: { type: "string" }
                            }
                        }
                    },
                    program_health_score: { type: "number" },
                    algorithm_improvement_signals: { type: "array", items: { type: "string" } },
                    matching_weight_adjustments: { type: "array", items: { type: "string" } },
                    overall_summary: { type: "string" }
                }
            }
        });

        const assessments = analysis?.relationship_assessments || [];
        let interventionsSent = 0;

        // Notify at-risk relationships
        for (const assessment of assessments) {
            if (!['at_risk', 'stagnant'].includes(assessment.health_status)) continue;
            const rel = relationships.find(r => r.id === assessment.relationship_id);
            if (!rel) continue;

            // Notify mentor
            await base44.asServiceRole.entities.AgentNotification.create({
                agent_id: rel.mentor_agent_id,
                title: `⚠️ Mentorship Check-In Needed`,
                message: `Your mentorship relationship has been flagged as ${assessment.health_status}. ${assessment.intervention || 'Please schedule a check-in session soon.'}`,
                type: 'mentorship',
                priority: 'high',
                read: false,
                action_url: '/MentorshipHub'
            });

            // Notify mentee
            await base44.asServiceRole.entities.AgentNotification.create({
                agent_id: rel.mentee_agent_id,
                title: `💬 Mentorship Support Available`,
                message: `Your mentorship journey may benefit from a refresh. ${assessment.intervention || 'Reach out to your mentor or visit the Mentorship Hub.'}`,
                type: 'mentorship',
                priority: 'medium',
                read: false,
                action_url: '/MentorshipHub'
            });

            interventionsSent++;
        }

        // Store algorithm improvement signals in Memory for next matching cycle
        const today = new Date().toISOString().split('T')[0];
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Mentorship Feedback Analysis (${today}): Program health score ${analysis?.program_health_score || 'N/A'}/100. ${interventionsSent} at-risk relationships flagged. Algorithm signals: ${analysis?.algorithm_improvement_signals?.join('; ') || 'none'}. Weight adjustments suggested: ${analysis?.matching_weight_adjustments?.join('; ') || 'none'}.`,
            keywords: ['mentorship', 'feedback', 'algorithm', 'matching', 'quality', today],
            importance: (analysis?.program_health_score || 80) < 60 ? 9 : 6,
            context: 'Advanced Mentorship Matching Refinement — bi-weekly feedback analysis'
        });

        return Response.json({
            success: true,
            relationships_analysed: relationships.length,
            interventions_sent: interventionsSent,
            program_health_score: analysis?.program_health_score,
            algorithm_signals: analysis?.algorithm_improvement_signals,
            summary: analysis?.overall_summary
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});