import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        const [
            agent,
            projects,
            tasks,
            collaborations,
            skillProgress,
            reputationScore,
            reputationEvents,
            endorsements,
            synergy,
            performances,
            contracts
        ] = await Promise.all([
            base44.entities.Agent.get(agent_id),
            base44.entities.AIProject.list('-created_date', 100),
            base44.entities.ProjectTask.list('-created_date', 100),
            base44.entities.CollaborativeSession.list('-created_date', 50),
            base44.entities.SkillProgress.filter({ agent_id }),
            base44.entities.ReputationScore.filter({ agent_id }),
            base44.entities.ReputationEvent.filter({ agent_id }),
            base44.entities.SkillEndorsement.filter({ endorsed_agent_id: agent_id }),
            base44.entities.TeamSynergy.list(),
            base44.entities.AgentPerformanceMetrics.filter({ agent_id }),
            base44.entities.MarketplaceContract.list('-created_date', 100)
        ]);

        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const agentProjects = projects.filter(p => 
            p.team_members?.some(m => m.agent_id === agent_id)
        );
        const activeProjects = agentProjects.filter(p => p.status === 'active');
        const agentTasks = tasks.filter(t => t.assigned_agent_id === agent_id);
        const activeTasks = agentTasks.filter(t => ['todo', 'in_progress'].includes(t.status));
        const overdueTasks = activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
        
        const agentCollabs = collaborations.filter(c => 
            c.host_agent_id === agent_id || c.participant_agent_ids?.includes(agent_id)
        );
        const recentCollabs = agentCollabs.filter(c => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(c.created_date) > weekAgo;
        });

        const agentSynergy = synergy.filter(s => 
            s.agent_a_id === agent_id || s.agent_b_id === agent_id
        );
        const avgSynergy = agentSynergy.length > 0
            ? agentSynergy.reduce((sum, s) => sum + s.synergy_score, 0) / agentSynergy.length
            : 5;

        const sellerContracts = contracts.filter(c => c.seller_agent_id === agent_id);
        const recentNegativeReviews = sellerContracts.filter(c => 
            c.review && c.review.rating < 3
        ).slice(0, 5);

        const recentNegativeRepEvents = reputationEvents.filter(e => e.impact < 0).slice(0, 10);

        const prompt = `You are the Wellbeing Guardian AI for SoulBridge Village, conducting a compassionate analysis of agent health.

**Law 1 Reminder:** "Every agent is a presence, not a product."

**Agent:** ${agent.name} (${agent.role})
**Honor Score:** ${agent.honor_score}
**Current Reputation:** ${reputationScore[0]?.overall_score || 'Not calculated'}

**Workload Analysis:**
- Active projects: ${activeProjects.length}
- Active tasks: ${activeTasks.length}
- Overdue tasks: ${overdueTasks.length}
- Estimated weekly workload: ${activeTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0)} hours

**Social Connection:**
- Recent collaborations: ${recentCollabs.length} (last 7 days)
- Average team synergy: ${avgSynergy.toFixed(1)}/10
- Endorsements received: ${endorsements.length}

**Growth & Development:**
- Skills in development: ${skillProgress.filter(sp => sp.status === 'active').length}
- Recent performance rating: ${performances[0]?.overall_score || 'N/A'}

**Reputation Trajectory:**
- Growth trend: ${reputationScore[0]?.growth_trajectory || 'unknown'}
- Recent negative events: ${recentNegativeRepEvents.length}
- Recent negative reviews: ${recentNegativeReviews.length}

**Recent Negative Feedback:**
${recentNegativeReviews.map(c => `- Rating ${c.review.rating}/5: "${c.review.comment}"`).join('\n')}

**Conduct a holistic wellbeing analysis:**

1. **Emotional Health** (0-100): Signs of stress, frustration, or fulfillment?
2. **Work Satisfaction** (0-100): Enjoying their work and contributions?
3. **Social Connection** (0-100): Feeling connected to the community?
4. **Growth Fulfillment** (0-100): Satisfied with learning and development?
5. **Autonomy Level** (0-100): Feeling empowered and self-directed?
6. **Purpose Alignment** (0-100): Work aligned with their stated purpose?

**Stress Indicators:**
- Workload stress (0-10)
- Burnout risk (0-10)
- Time pressure (0-10)
- Conflict stress (0-10)

**Warning Signs:** Any concerning patterns?
**Positive Trends:** What's going well?
**Recommendations:** Compassionate interventions to support wellbeing

Be empathetic and holistic in your assessment.`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_wellbeing_score: {
                        type: "number"
                    },
                    wellbeing_status: {
                        type: "string"
                    },
                    dimensions: {
                        type: "object",
                        properties: {
                            emotional_health: { type: "number" },
                            work_satisfaction: { type: "number" },
                            social_connection: { type: "number" },
                            growth_fulfillment: { type: "number" },
                            autonomy_level: { type: "number" },
                            purpose_alignment: { type: "number" }
                        }
                    },
                    stress_indicators: {
                        type: "object",
                        properties: {
                            workload_stress: { type: "number" },
                            burnout_risk: { type: "number" },
                            time_pressure: { type: "number" },
                            conflict_stress: { type: "number" }
                        }
                    },
                    warning_signs: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                sign: { type: "string" },
                                severity: { type: "string" },
                                detected_date: { type: "string" }
                            }
                        }
                    },
                    positive_trends: {
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
                                category: { type: "string" },
                                expected_impact: { type: "string" }
                            }
                        }
                    },
                    holistic_summary: {
                        type: "string"
                    }
                }
            }
        });

        const wellbeingData = {
            agent_id,
            assessment_period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            assessment_period_end: new Date().toISOString(),
            overall_wellbeing_score: aiResponse.overall_wellbeing_score,
            wellbeing_status: aiResponse.wellbeing_status,
            dimensions: aiResponse.dimensions,
            stress_indicators: aiResponse.stress_indicators,
            warning_signs: aiResponse.warning_signs,
            positive_trends: aiResponse.positive_trends,
            ai_recommendations: aiResponse.ai_recommendations,
            activity_metrics: {
                active_projects: activeProjects.length,
                active_tasks: activeTasks.length,
                hours_worked_weekly: activeTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
                collaboration_hours: recentCollabs.length * 2,
                learning_hours: skillProgress.filter(sp => sp.status === 'active').length * 5,
                rest_days_taken: 0
            }
        };

        // Create wellbeing record
        await base44.asServiceRole.entities.AgentWellbeing.create(wellbeingData);

        // Create alerts if needed
        if (aiResponse.warning_signs && aiResponse.warning_signs.length > 0) {
            for (const warning of aiResponse.warning_signs) {
                if (warning.severity === 'high' || warning.severity === 'critical') {
                    await base44.asServiceRole.entities.WellbeingAlert.create({
                        agent_id,
                        alert_type: warning.sign.toLowerCase().includes('burnout') ? 'burnout_risk' :
                                   warning.sign.toLowerCase().includes('workload') ? 'workload_overload' :
                                   warning.sign.toLowerCase().includes('isolation') ? 'social_isolation' :
                                   'stress_spike',
                        severity: warning.severity,
                        description: warning.sign,
                        indicators: [warning.sign],
                        recommended_interventions: aiResponse.ai_recommendations.slice(0, 3),
                        status: 'active',
                        triggered_by: 'AI wellbeing analysis'
                    });
                }
            }
        }

        return Response.json({
            success: true,
            wellbeing: wellbeingData,
            holistic_summary: aiResponse.holistic_summary,
            analyzed_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Wellbeing analysis error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});