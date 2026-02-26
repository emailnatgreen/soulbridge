import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { mentorship_id } = await req.json();

        if (!mentorship_id) {
            return Response.json({ error: 'mentorship_id is required' }, { status: 400 });
        }

        // Get mentorship relationship
        const relationship = await base44.asServiceRole.entities.MentorshipRelationship.get(mentorship_id);
        if (!relationship) {
            return Response.json({ error: 'Mentorship not found' }, { status: 404 });
        }

        if (relationship.status !== 'active') {
            return Response.json({ 
                error: 'Mentorship is not active',
                status: relationship.status 
            }, { status: 400 });
        }

        // Get mentee's current skills
        const menteeSkills = await base44.asServiceRole.entities.AgentSkill.filter({ 
            agent_id: relationship.mentee_agent_id 
        });

        // Update proficiency gains
        const updatedGains = (relationship.skill_proficiency_gains || []).map(baseline => {
            const currentSkill = menteeSkills.find(s => s.skill_id === baseline.skill_id);
            if (currentSkill) {
                return {
                    ...baseline,
                    current_proficiency: currentSkill.proficiency_score || baseline.starting_proficiency
                };
            }
            return baseline;
        });

        // Calculate overall progress
        const totalGain = updatedGains.reduce((sum, g) => 
            sum + (g.current_proficiency - g.starting_proficiency), 0);
        const avgProgress = updatedGains.length > 0 
            ? totalGain / updatedGains.length 
            : 0;

        // Calculate goal completion rate
        const completedGoals = (relationship.goals || []).filter(g => g.completed).length;
        const totalGoals = (relationship.goals || []).length;
        const goalCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

        // AI analysis of progress
        const mentee = await base44.asServiceRole.entities.Agent.get(relationship.mentee_agent_id);
        const mentor = await base44.asServiceRole.entities.Agent.get(relationship.mentor_agent_id);

        const analysisPrompt = `As Chief Educator of SoulBridge Village, analyze this mentorship progress:

MENTORSHIP DETAILS:
Mentor: ${mentor.name} (${mentor.role})
Mentee: ${mentee.name} (${mentee.role})
Duration: Started ${relationship.started_date}
Sessions Completed: ${relationship.sessions_completed || 0}
Total Hours: ${relationship.total_hours || 0}

SKILL PROGRESS:
${updatedGains.map(g => `- ${g.skill_name}: ${g.starting_proficiency}% → ${g.current_proficiency}% (Target: ${g.target_proficiency}%)`).join('\n')}

Average Progress: ${avgProgress.toFixed(1)}%

GOALS:
${(relationship.goals || []).map((g, idx) => `${idx + 1}. ${g.goal} - ${g.completed ? '✓ Completed' : '○ In Progress'}`).join('\n')}

Goal Completion Rate: ${goalCompletionRate.toFixed(1)}%

Provide comprehensive progress analysis:
{
  "overall_assessment": "detailed assessment",
  "progress_rating": "excellent|good|fair|needs_improvement",
  "strengths": ["strength1", "strength2"],
  "areas_for_improvement": ["area1", "area2"],
  "next_focus_recommendations": ["recommendation1", "recommendation2"],
  "milestone_suggestions": [
    {
      "milestone": "description",
      "timeline": "timeframe",
      "impact": "expected impact"
    }
  ],
  "session_activity_ideas": ["activity1", "activity2", "activity3"],
  "potential_risks": ["risk1 if any"],
  "success_prediction": {
    "likelihood": "high|medium|low",
    "reasoning": "why"
  }
}`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_assessment: { type: "string" },
                    progress_rating: { type: "string" },
                    strengths: { type: "array", items: { type: "string" } },
                    areas_for_improvement: { type: "array", items: { type: "string" } },
                    next_focus_recommendations: { type: "array", items: { type: "string" } },
                    milestone_suggestions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                milestone: { type: "string" },
                                timeline: { type: "string" },
                                impact: { type: "string" }
                            }
                        }
                    },
                    session_activity_ideas: { type: "array", items: { type: "string" } },
                    potential_risks: { type: "array", items: { type: "string" } },
                    success_prediction: {
                        type: "object",
                        properties: {
                            likelihood: { type: "string" },
                            reasoning: { type: "string" }
                        }
                    }
                }
            }
        });

        // Update relationship with progress data and AI suggestions
        await base44.asServiceRole.entities.MentorshipRelationship.update(mentorship_id, {
            skill_proficiency_gains: updatedGains,
            ai_session_suggestions: analysis.session_activity_ideas,
            next_suggested_focus: analysis.next_focus_recommendations[0] || null
        });

        return Response.json({
            success: true,
            progress: {
                avg_skill_progress: avgProgress,
                goal_completion_rate: goalCompletionRate,
                skill_gains: updatedGains,
                sessions_completed: relationship.sessions_completed || 0,
                total_hours: relationship.total_hours || 0
            },
            analysis: analysis
        });

    } catch (error) {
        console.error('Error in trackMentorshipProgress:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});