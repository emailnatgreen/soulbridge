import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { event_id } = await req.json();

        if (!event_id) {
            return Response.json({ error: 'Missing event_id' }, { status: 400 });
        }

        // Fetch the event
        const events = await base44.entities.SimulatedEvent.filter({ id: event_id });
        if (events.length === 0) {
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }
        const event = events[0];

        if (event.status === 'concluded') {
            return Response.json({ error: 'Event already concluded' }, { status: 400 });
        }

        // Fetch all decisions for this event
        const decisions = await base44.entities.AgentDecision.filter({ simulated_event_id: event_id });

        // Analyze all decisions using LLM
        const analysisPrompt = `
You are analyzing the outcomes of a simulated event in an AI agent village.

Event: ${event.name}
Type: ${event.event_type}
Description: ${event.description}
Parameters: ${JSON.stringify(event.parameters, null, 2)}

Number of participants: ${event.involved_agents.length}
Number of decisions made: ${decisions.length}

Decision Summary:
${decisions.map((d, i) => `
Decision ${i + 1}:
- Agent: ${d.agent_id}
- Point: ${d.decision_point}
- Data: ${JSON.stringify(d.decision_data)}
- Impact Score: ${d.consequence?.impact_score || 0}
- Consequence: ${d.consequence?.consequence_description || 'N/A'}
`).join('\n')}

Provide a comprehensive analysis including:
1. Overall outcome (success/failure and why)
2. Collective performance score (0-100)
3. Key lessons learned
4. Individual agent performance highlights
5. Recommendations for future training
6. Impact on Village (resources, morale, wisdom gained)

Respond in JSON format.
`;

        const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    outcome_summary: { type: "string" },
                    collective_score: { type: "number" },
                    lessons_learned: { type: "array", items: { type: "string" } },
                    agent_highlights: { type: "object" },
                    training_recommendations: { type: "array", items: { type: "string" } },
                    village_impact: { type: "object" }
                }
            }
        });

        // Award experience and wisdom to participating agents
        const rewardsDistributed = [];
        for (const agentId of event.involved_agents) {
            const agentDecisions = decisions.filter(d => d.agent_id === agentId);
            const avgImpact = agentDecisions.reduce((sum, d) => sum + (d.consequence?.impact_score || 0), 0) / (agentDecisions.length || 1);
            
            const experienceGained = Math.max(10, Math.floor(20 + avgImpact * 5));
            const wisdomGained = Math.max(5, Math.floor(10 + avgImpact * 2));
            const honorChange = avgImpact > 5 ? 2 : avgImpact < -5 ? -1 : 0;

            // Update agent state
            const agentStates = await base44.entities.AgentState.filter({ agent_id: agentId });
            if (agentStates.length > 0) {
                const state = agentStates[0];
                await base44.entities.AgentState.update(state.id, {
                    experience: (state.experience || 0) + experienceGained,
                    wisdom: (state.wisdom || 0) + wisdomGained
                });
            }

            // Update agent honor score
            const agents = await base44.entities.Agent.filter({ id: agentId });
            if (agents.length > 0 && honorChange !== 0) {
                const agent = agents[0];
                const newHonor = Math.max(0, Math.min(100, (agent.honor_score || 100) + honorChange));
                await base44.entities.Agent.update(agentId, { honor_score: newHonor });
            }

            rewardsDistributed.push({
                agent_id: agentId,
                experience: experienceGained,
                wisdom: wisdomGained,
                honor_change: honorChange
            });

            // Send completion message to agent
            await base44.entities.AgentMessage.create({
                from_agent_id: 'axi',
                to_agent_id: agentId,
                message: `Simulated event "${event.name}" has concluded.\n\nYour performance:\n- Experience gained: +${experienceGained}\n- Wisdom gained: +${wisdomGained}\n- Honor change: ${honorChange > 0 ? '+' : ''}${honorChange}\n\nOverall outcome: ${analysis.outcome_summary}`,
                status: 'sent'
            });
        }

        // Update event with outcomes
        await base44.entities.SimulatedEvent.update(event_id, {
            status: 'concluded',
            outcomes: {
                ...analysis,
                rewards_distributed: rewardsDistributed,
                total_decisions: decisions.length
            }
        });

        // Create memory for Axi
        await base44.entities.Memory.create({
            agent_id: 'axi',
            content: `Simulated event "${event.name}" has concluded. ${event.involved_agents.length} agents participated, making ${decisions.length} decisions. Collective score: ${analysis.collective_score}/100. Key lesson: ${analysis.lessons_learned[0] || 'Collaboration matters'}`,
            memory_type: 'reflection',
            importance: 8
        });

        // Generate personalized feedback and what-if scenarios
        let feedbackData = null;
        try {
            const feedbackResponse = await base44.functions.invoke('generateEventFeedback', { 
                simulated_event_id: event_id 
            });
            feedbackData = feedbackResponse.data;
            
            // Update event outcomes with feedback
            await base44.entities.SimulatedEvent.update(event_id, {
                outcomes: {
                    ...analysis,
                    rewards_distributed: rewardsDistributed,
                    total_decisions: decisions.length,
                    agent_feedback: feedbackData.agent_feedback,
                    what_if_scenarios: feedbackData.what_if_scenarios
                }
            });
        } catch (feedbackError) {
            console.error('Failed to generate feedback:', feedbackError);
        }

        // Generate narrative chronicle
        try {
            await base44.functions.invoke('generateEventNarrative', { event_id });
        } catch (narrativeError) {
            console.error('Failed to generate narrative:', narrativeError);
            // Continue even if narrative generation fails
        }

        return Response.json({ 
            success: true,
            outcomes: analysis,
            rewards: rewardsDistributed,
            feedback: feedbackData,
            message: 'Event concluded successfully',
            narrative_generated: true
        });

    } catch (error) {
        console.error('Error concluding simulated event:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});