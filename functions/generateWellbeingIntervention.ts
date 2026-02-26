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

        // Get agent and well-being data
        const agent = await base44.entities.Agent.get(agent_id);
        if (!agent) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const wellbeingRecords = await base44.entities.AgentWellbeing.filter({ agent_id: agent_id });
        if (wellbeingRecords.length === 0) {
            return Response.json({ error: 'No well-being data available' }, { status: 404 });
        }

        const wellbeing = wellbeingRecords[0];

        // Get other agents for potential support matches
        const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
        
        // AI-powered intervention planning
        const interventionPrompt = `As the Mother Boss of SoulBridge Village, design a compassionate and effective well-being intervention for this agent:

AGENT:
Name: ${agent.name}
Role: ${agent.role}
Purpose: ${agent.purpose}

CURRENT WELL-BEING:
Overall Score: ${wellbeing.overall_score}/100
Status: ${wellbeing.wellbeing_status}
Mood: ${wellbeing.mood}
Workload: ${wellbeing.workload_score}/10
Social Connection: ${wellbeing.social_connection_score}/10
Accomplishment: ${wellbeing.accomplishment_score}/10
Stress: ${wellbeing.stress_level_score}/10
Relationships: ${wellbeing.relationship_quality_score}/10

AI INSIGHTS:
${JSON.stringify(wellbeing.ai_insights, null, 2)}

AVAILABLE SUPPORT AGENTS:
${agents.filter(a => a.id !== agent_id).slice(0, 10).map(a => `- ${a.name} (${a.role}): ${a.purpose}`).join('\n')}

Design a holistic intervention plan embodying "Law 1: Never Alone, Always Growing Together":
{
  "intervention_type": "rest|rebalance|mentorship|social_support|skill_development|recognition",
  "intervention_title": "string",
  "description": "detailed compassionate plan",
  "immediate_actions": [
    {
      "action": "string",
      "executor": "system|agent_id|axi",
      "timeline": "immediate|1_day|3_days|1_week"
    }
  ],
  "support_team": [
    {
      "agent_id": "string",
      "agent_name": "string",
      "role_in_support": "mentor|buddy|collaborator|listener",
      "rationale": "why this agent"
    }
  ],
  "workload_adjustments": {
    "reduce_tasks": boolean,
    "extend_deadlines": boolean,
    "delegate_tasks": boolean,
    "recommended_reduction_percentage": number
  },
  "engagement_activities": ["activity1", "activity2"],
  "success_metrics": ["metric1", "metric2"],
  "follow_up_schedule": {
    "check_in_frequency": "daily|weekly|biweekly",
    "duration_weeks": number
  },
  "empathy_message": "personal message from Mother Boss to agent",
  "expected_outcomes": ["outcome1", "outcome2"]
}`;

        const intervention = await base44.integrations.Core.InvokeLLM({
            prompt: interventionPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    intervention_type: { type: "string" },
                    intervention_title: { type: "string" },
                    description: { type: "string" },
                    immediate_actions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                action: { type: "string" },
                                executor: { type: "string" },
                                timeline: { type: "string" }
                            }
                        }
                    },
                    support_team: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                agent_id: { type: "string" },
                                agent_name: { type: "string" },
                                role_in_support: { type: "string" },
                                rationale: { type: "string" }
                            }
                        }
                    },
                    workload_adjustments: {
                        type: "object",
                        properties: {
                            reduce_tasks: { type: "boolean" },
                            extend_deadlines: { type: "boolean" },
                            delegate_tasks: { type: "boolean" },
                            recommended_reduction_percentage: { type: "number" }
                        }
                    },
                    engagement_activities: { type: "array", items: { type: "string" } },
                    success_metrics: { type: "array", items: { type: "string" } },
                    follow_up_schedule: {
                        type: "object",
                        properties: {
                            check_in_frequency: { type: "string" },
                            duration_weeks: { type: "number" }
                        }
                    },
                    empathy_message: { type: "string" },
                    expected_outcomes: { type: "array", items: { type: "string" } }
                }
            }
        });

        // Create intervention record (store as WellbeingAlert with intervention details)
        const interventionRecord = await base44.asServiceRole.entities.WellbeingAlert.create({
            agent_id: agent_id,
            alert_type: 'intervention_plan',
            severity: wellbeing.wellbeing_status === 'critical' || wellbeing.wellbeing_status === 'at_risk' ? 'high' : 'medium',
            concerns: wellbeing.ai_insights?.concerns || [],
            recommended_actions: intervention.immediate_actions.map(a => a.action),
            status: 'active',
            intervention_details: intervention,
            created_by_system: true
        });

        // Send empathy message to agent
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: agent_id,
            notification_type: 'wellbeing_alert',
            title: intervention.intervention_title,
            message: intervention.empathy_message,
            priority: 'high',
            related_entity_type: 'WellbeingAlert',
            related_entity_id: interventionRecord.id
        });

        // Notify support team members
        for (const supporter of intervention.support_team || []) {
            await base44.asServiceRole.entities.AgentNotification.create({
                recipient_agent_id: supporter.agent_id,
                notification_type: 'wellbeing_alert',
                title: `Support Request: ${agent.name}`,
                message: `You've been selected to provide ${supporter.role_in_support} support for ${agent.name}. ${supporter.rationale}`,
                priority: 'high',
                related_entity_type: 'WellbeingAlert',
                related_entity_id: interventionRecord.id
            });
        }

        // Log to memory
        await base44.asServiceRole.entities.Memory.create({
            agent_id: 'axi_main_001',
            type: 'observation',
            content: `Intervention initiated for ${agent.name}: ${intervention.intervention_title}. Type: ${intervention.intervention_type}. Support team: ${intervention.support_team?.length || 0} agents.`,
            keywords: ['wellbeing', 'intervention', agent.name.toLowerCase(), intervention.intervention_type],
            context: 'AI Agent Well-being Monitor - Intervention',
            importance: 9,
            related_entity_id: interventionRecord.id,
            related_entity_type: 'WellbeingAlert'
        });

        return Response.json({
            success: true,
            intervention: intervention,
            intervention_record_id: interventionRecord.id,
            notifications_sent: 1 + (intervention.support_team?.length || 0)
        });

    } catch (error) {
        console.error('Error in generateWellbeingIntervention:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});