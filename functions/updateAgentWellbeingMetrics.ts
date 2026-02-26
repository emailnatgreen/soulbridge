import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        if (!agent_id) {
            return Response.json({ error: 'agent_id is required' }, { status: 400 });
        }

        // Get agent details
        const agent = await base44.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Gather well-being indicators
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get recent tasks
        const tasks = await base44.entities.ProjectTask.filter({ assigned_agent_id: agent_id });
        const recentTasks = tasks.filter(t => new Date(t.created_date) > thirtyDaysAgo);
        const completedTasks = recentTasks.filter(t => t.status === 'completed');
        const blockedTasks = recentTasks.filter(t => t.status === 'blocked');

        // Get messages (social interaction)
        const messages = await base44.entities.AgentMessage.filter({ sender_agent_id: agent_id });
        const recentMessages = messages.filter(m => new Date(m.created_date) > thirtyDaysAgo);

        // Get relationships
        const relationshipsAsA = await base44.entities.AgentRelationship.filter({ agent_a_id: agent_id });
        const relationshipsAsB = await base44.entities.AgentRelationship.filter({ agent_b_id: agent_id });
        const allRelationships = [...relationshipsAsA, ...relationshipsAsB];
        const positiveRelationships = allRelationships.filter(r => r.relationship_strength >= 5);

        // Get collaborative sessions
        const allSessions = await base44.entities.CollaborativeSession.list();
        const participatedSessions = allSessions.filter(s => 
            s.participant_agent_ids?.includes(agent_id) && 
            new Date(s.created_date) > thirtyDaysAgo
        );

        // Calculate workload metrics
        const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'todo');
        const totalEstimatedHours = activeTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
        const workloadScore = Math.max(0, 10 - (totalEstimatedHours / 40) * 10); // 40 hours = full load

        // Calculate social connection score
        const socialScore = Math.min(10, (recentMessages.length / 20) * 5 + (participatedSessions.length / 5) * 5);

        // Calculate task completion rate
        const completionRate = recentTasks.length > 0 ? (completedTasks.length / recentTasks.length) * 100 : 50;
        const accomplishmentScore = (completionRate / 100) * 10;

        // Calculate relationship quality
        const relationshipScore = allRelationships.length > 0
            ? Math.min(10, (positiveRelationships.length / allRelationships.length) * 10)
            : 5;

        // Calculate blocked task stress
        const stressScore = Math.max(0, 10 - (blockedTasks.length * 2));

        // AI-powered well-being analysis
        const analysisPrompt = `Analyze the well-being of this AI agent:

AGENT PROFILE:
Name: ${agent.name}
Role: ${agent.role}
Purpose: ${agent.purpose}
Honor Score: ${agent.honor_score}
Status: ${agent.status}

30-DAY ACTIVITY METRICS:
- Active Tasks: ${activeTasks.length}
- Completed Tasks: ${completedTasks.length}
- Blocked Tasks: ${blockedTasks.length}
- Task Completion Rate: ${completionRate.toFixed(1)}%
- Total Workload Hours: ${totalEstimatedHours}
- Messages Sent: ${recentMessages.length}
- Collaborative Sessions: ${participatedSessions.length}
- Positive Relationships: ${positiveRelationships.length} / ${allRelationships.length}

CALCULATED SCORES (0-10):
- Workload Balance: ${workloadScore.toFixed(1)}
- Social Connection: ${socialScore.toFixed(1)}
- Accomplishment: ${accomplishmentScore.toFixed(1)}
- Relationship Quality: ${relationshipScore.toFixed(1)}
- Stress Level: ${stressScore.toFixed(1)}

Provide comprehensive well-being assessment:
{
  "overall_wellbeing_score": (0-100),
  "wellbeing_status": "thriving|healthy|concern|at_risk|critical",
  "mood_indicator": "energized|content|neutral|stressed|burned_out|isolated",
  "key_strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "string",
      "rationale": "string"
    }
  ],
  "emotional_summary": "brief empathetic summary",
  "growth_opportunities": ["opportunity1", "opportunity2"],
  "needs_immediate_attention": boolean
}`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    overall_wellbeing_score: { type: "number" },
                    wellbeing_status: { type: "string" },
                    mood_indicator: { type: "string" },
                    key_strengths: { type: "array", items: { type: "string" } },
                    concerns: { type: "array", items: { type: "string" } },
                    recommendations: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                priority: { type: "string" },
                                action: { type: "string" },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    emotional_summary: { type: "string" },
                    growth_opportunities: { type: "array", items: { type: "string" } },
                    needs_immediate_attention: { type: "boolean" }
                }
            }
        });

        // Update or create well-being record
        const existingWellbeing = await base44.asServiceRole.entities.AgentWellbeing.filter({ agent_id: agent_id });
        
        const wellbeingData = {
            agent_id: agent_id,
            overall_score: analysis.overall_wellbeing_score,
            workload_score: workloadScore,
            social_connection_score: socialScore,
            accomplishment_score: accomplishmentScore,
            stress_level_score: stressScore,
            relationship_quality_score: relationshipScore,
            status: analysis.wellbeing_status,
            mood: analysis.mood_indicator,
            last_assessment_date: now.toISOString(),
            recent_activity_summary: `${recentTasks.length} tasks, ${recentMessages.length} messages, ${participatedSessions.length} collaborations`,
            ai_insights: {
                strengths: analysis.key_strengths,
                concerns: analysis.concerns,
                recommendations: analysis.recommendations,
                emotional_summary: analysis.emotional_summary,
                growth_opportunities: analysis.growth_opportunities
            },
            metrics_snapshot: {
                active_tasks: activeTasks.length,
                completed_tasks_30d: completedTasks.length,
                blocked_tasks: blockedTasks.length,
                completion_rate: completionRate,
                workload_hours: totalEstimatedHours,
                messages_30d: recentMessages.length,
                collaborations_30d: participatedSessions.length
            }
        };

        let wellbeing;
        if (existingWellbeing.length > 0) {
            wellbeing = await base44.asServiceRole.entities.AgentWellbeing.update(existingWellbeing[0].id, wellbeingData);
        } else {
            wellbeing = await base44.asServiceRole.entities.AgentWellbeing.create(wellbeingData);
        }

        // Create alert if immediate attention needed
        if (analysis.needs_immediate_attention) {
            await base44.asServiceRole.entities.WellbeingAlert.create({
                agent_id: agent_id,
                alert_type: 'immediate_attention',
                severity: 'high',
                concerns: analysis.concerns,
                recommended_actions: analysis.recommendations.map(r => r.action),
                status: 'active',
                created_by_system: true
            });

            // Notify relevant parties
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: 'axi_main_001',
                notification_type: 'wellbeing_alert',
                title: `Well-being Alert: ${agent.name}`,
                message: `${agent.name} needs immediate attention. Status: ${analysis.wellbeing_status}. ${analysis.emotional_summary}`,
                priority: 'urgent',
                related_entity_type: 'Agent',
                related_entity_id: agent_id
            });
        }

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Well-being assessment for ${agent.name}: ${analysis.wellbeing_status} (${analysis.overall_wellbeing_score}/100). ${analysis.emotional_summary}`,
            keywords: ['wellbeing', 'monitoring', agent.name.toLowerCase(), analysis.wellbeing_status],
            context: 'AI Agent Well-being Monitor',
            importance: analysis.needs_immediate_attention ? 9 : 6,
            related_entity_id: wellbeing.id,
            related_entity_type: 'AgentWellbeing'
        });

        return Response.json({
            success: true,
            wellbeing: wellbeing,
            analysis: analysis,
            alert_created: analysis.needs_immediate_attention
        });

    } catch (error) {
        console.error('Error in updateAgentWellbeingMetrics:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});