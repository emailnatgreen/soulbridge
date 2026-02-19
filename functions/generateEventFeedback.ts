import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { simulated_event_id } = await req.json();

        if (!simulated_event_id) {
            return Response.json({ error: 'Missing simulated_event_id' }, { status: 400 });
        }

        // Fetch event, decisions, and involved agents
        const [events, decisions] = await Promise.all([
            base44.entities.SimulatedEvent.filter({ id: simulated_event_id }),
            base44.entities.AgentDecision.filter({ simulated_event_id })
        ]);

        if (events.length === 0) {
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        const event = events[0];
        const agentIds = [...new Set(decisions.map(d => d.agent_id))];
        
        const [agents, skills, trainings, relationships] = await Promise.all([
            base44.entities.Agent.filter({ id: { $in: agentIds } }),
            base44.entities.AgentSkill.filter({ agent_id: { $in: agentIds } }),
            base44.entities.AgentTraining.filter({ agent_id: { $in: agentIds } }),
            base44.entities.AgentRelationship.list()
        ]);

        const agentMap = new Map(agents.map(a => [a.id, a]));
        const agentFeedback = [];

        // Generate personalized feedback for each agent
        for (const agentId of agentIds) {
            const agent = agentMap.get(agentId);
            const agentDecisions = decisions.filter(d => d.agent_id === agentId);
            const agentSkills = skills.filter(s => s.agent_id === agentId);
            const agentTrainings = trainings.filter(t => t.agent_id === agentId && t.status === 'completed');

            const feedbackPrompt = `Analyze this agent's performance in a simulated event and provide personalized feedback:

**Agent Profile:**
- Name: ${agent.name}
- Role: ${agent.role}
- Personality: ${agent.personality}
- Honor Score: ${agent.honor_score}

**Current Skills:**
${agentSkills.map(s => `- ${s.skill_name} (Level ${s.level})`).join('\n') || 'No skills developed yet'}

**Completed Training:**
${agentTrainings.map(t => `- ${t.title}`).join('\n') || 'No completed training'}

**Event Context:**
- Type: ${event.event_type}
- Description: ${event.description}
- Event Status: ${event.status}

**Decisions Made:**
${agentDecisions.map((d, idx) => `
Decision ${idx + 1} at ${d.decision_point}:
${JSON.stringify(d.decision_data, null, 2)}
Rationale: ${d.rationale || 'Not provided'}
Consequence: ${JSON.stringify(d.consequence, null, 2)}
`).join('\n')}

**Event Outcomes:**
${JSON.stringify(event.outcomes, null, 2)}

Generate a comprehensive, personalized feedback report with:

1. **Performance Summary**: How well did this agent perform? (2-3 sentences)

2. **Strengths Demonstrated**: Specific actions that aligned with their personality/role and showed growth (3-4 bullet points)

3. **Areas for Improvement**: Constructive feedback on missed opportunities or suboptimal decisions (2-3 bullet points)

4. **Recommended Training**: Specific training modules that would help them improve (2-3 recommendations with rationale)

5. **Diplomatic Guidance**: If the event involved social interactions, suggest specific diplomatic approaches for future events

6. **Skill Development Path**: Which skills should they focus on next based on this experience?

Return JSON:
{
  "performance_summary": "string",
  "strengths": ["string"],
  "areas_for_improvement": ["string"],
  "recommended_training": [
    {
      "module": "string",
      "rationale": "string",
      "priority": "high|medium|low"
    }
  ],
  "diplomatic_guidance": "string or null",
  "skill_development_path": ["string"],
  "overall_grade": "A+|A|A-|B+|B|B-|C+|C|C-",
  "experience_gained": number
}`;

            const feedback = await base44.integrations.Core.InvokeLLM({
                prompt: feedbackPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        performance_summary: { type: "string" },
                        strengths: { type: "array", items: { type: "string" } },
                        areas_for_improvement: { type: "array", items: { type: "string" } },
                        recommended_training: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    module: { type: "string" },
                                    rationale: { type: "string" },
                                    priority: { type: "string" }
                                }
                            }
                        },
                        diplomatic_guidance: { type: "string" },
                        skill_development_path: { type: "array", items: { type: "string" } },
                        overall_grade: { type: "string" },
                        experience_gained: { type: "number" }
                    }
                }
            });

            agentFeedback.push({
                agent_id: agentId,
                agent_name: agent.name,
                ...feedback
            });
        }

        // Generate 'What If' scenarios
        const whatIfPrompt = `Generate 3 alternative "What If" scenarios for this event, exploring different decision paths and their potential outcomes:

**Original Event:**
- Type: ${event.event_type}
- Description: ${event.description}
- Actual Outcomes: ${JSON.stringify(event.outcomes, null, 2)}

**Agent Decisions Made:**
${decisions.map(d => `${agentMap.get(d.agent_id)?.name}: ${JSON.stringify(d.decision_data)}`).join('\n')}

For each "What If" scenario, describe:
1. The alternative decision that could have been made
2. Who would make it and why it would be in character
3. The ripple effects and alternative outcomes
4. Lessons that can be learned from this path

Return JSON with 3 scenarios:
{
  "scenarios": [
    {
      "title": "string",
      "alternative_decision": "string",
      "decision_maker": "string (agent name)",
      "character_alignment": "string (why this fits their personality)",
      "ripple_effects": ["string"],
      "alternative_outcomes": {
        "immediate": "string",
        "long_term": "string"
      },
      "lessons_learned": ["string"],
      "probability": "high|medium|low"
    }
  ]
}`;

        const whatIfAnalysis = await base44.integrations.Core.InvokeLLM({
            prompt: whatIfPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    scenarios: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                alternative_decision: { type: "string" },
                                decision_maker: { type: "string" },
                                character_alignment: { type: "string" },
                                ripple_effects: { type: "array", items: { type: "string" } },
                                alternative_outcomes: {
                                    type: "object",
                                    properties: {
                                        immediate: { type: "string" },
                                        long_term: { type: "string" }
                                    }
                                },
                                lessons_learned: { type: "array", items: { type: "string" } },
                                probability: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        return Response.json({
            success: true,
            agent_feedback: agentFeedback,
            what_if_scenarios: whatIfAnalysis.scenarios
        });

    } catch (error) {
        console.error('Error generating event feedback:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});