import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { event_id, agent_id, decision_point, decision_data, rationale } = await req.json();

        if (!event_id || !agent_id || !decision_data) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch the event
        const events = await base44.entities.SimulatedEvent.filter({ id: event_id });
        if (events.length === 0) {
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }
        const event = events[0];

        // Verify event is active
        if (event.status !== 'active') {
            return Response.json({ error: 'Event is not active' }, { status: 400 });
        }

        // Verify agent is participating
        if (!event.involved_agents.includes(agent_id)) {
            return Response.json({ error: 'Agent is not participating in this event' }, { status: 403 });
        }

        // Get current simulation state
        const simStates = await base44.entities.SimulationState.list();
        const currentTick = simStates[0]?.tick || 0;

        // Fetch agent
        const agents = await base44.entities.Agent.filter({ id: agent_id });
        const agent = agents[0];

        // Use LLM to evaluate the decision and determine consequences
        const evaluationPrompt = `
You are evaluating an agent's decision in a simulated event.

Event: ${event.name}
Type: ${event.event_type}
Description: ${event.description}
Parameters: ${JSON.stringify(event.parameters, null, 2)}

Agent: ${agent.name}
Role: ${agent.role}
Honor Score: ${agent.honor_score}

Decision Point: ${decision_point || 'General Decision'}
Decision Data: ${JSON.stringify(decision_data, null, 2)}
Rationale: ${rationale || 'Not provided'}

Evaluate this decision and provide:
1. Immediate consequence (positive or negative impact)
2. Impact score (-10 to +10, where -10 is very harmful and +10 is very beneficial)
3. Learning points for the agent
4. Whether this decision aligns with the agent's role

Respond in JSON format.
`;

        const evaluation = await base44.integrations.Core.InvokeLLM({
            prompt: evaluationPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    consequence_description: { type: "string" },
                    impact_score: { type: "number" },
                    learning_points: { type: "array", items: { type: "string" } },
                    role_alignment: { type: "boolean" }
                }
            }
        });

        // Create the decision record
        const decision = await base44.entities.AgentDecision.create({
            simulated_event_id: event_id,
            agent_id,
            decision_point: decision_point || 'general',
            decision_data,
            simulation_tick: currentTick,
            consequence: evaluation,
            rationale
        });

        // Send feedback to agent via Axi
        await base44.entities.AgentMessage.create({
            from_agent_id: 'axi',
            to_agent_id: agent_id,
            message: `Your decision in "${event.name}" has been recorded.\n\n${evaluation.consequence_description}\n\nLearning points:\n${evaluation.learning_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
            status: 'sent'
        });

        return Response.json({ 
            success: true, 
            decision,
            evaluation,
            message: 'Decision submitted and evaluated'
        });

    } catch (error) {
        console.error('Error submitting agent decision:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});