import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { event_id, agent_id } = await req.json();

        if (!event_id || !agent_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch event and agent
        const [events, agents] = await Promise.all([
            base44.entities.SimulatedEvent.filter({ id: event_id }),
            base44.entities.Agent.filter({ id: agent_id })
        ]);

        if (events.length === 0) {
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }
        if (agents.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const event = events[0];
        const agent = agents[0];

        // Get agent's previous decisions in this event
        const previousDecisions = await base44.entities.AgentDecision.filter({
            simulated_event_id: event_id,
            agent_id
        });

        // Get agent state and skills for context
        const [agentStates, agentSkills] = await Promise.all([
            base44.entities.AgentState.filter({ agent_id }),
            base44.entities.AgentSkill.filter({ agent_id })
        ]);

        const agentState = agentStates[0] || {};
        const skillSummary = agentSkills.map(s => `${s.skill_name} (Lv${s.level})`).join(', ') || 'No skills';

        // Use AI to generate a contextual decision point
        const aiPrompt = `You are generating a decision point for an AI agent in an active simulation.

Event: ${event.name}
Event Type: ${event.event_type}
Event Description: ${event.description}
Event Parameters: ${JSON.stringify(event.parameters)}

Agent: ${agent.name}
Role: ${agent.role}
Honor Score: ${agent.honor_score}
Energy: ${agentState.energy || 80}
Wisdom: ${agentState.wisdom || 0}
Skills: ${skillSummary}

Previous Decisions in this Event: ${previousDecisions.length}
${previousDecisions.map((d, i) => `${i + 1}. ${d.rationale || 'No details'}`).join('\n')}

Generate a meaningful decision point that:
1. Builds on previous decisions (if any)
2. Aligns with the event type and parameters
3. Presents morally/strategically interesting choices
4. Considers the agent's skills and attributes

Return JSON with:
{
  "decision_prompt": "What situation does the agent face?",
  "choices": [
    {"option": "Choice 1", "potential_outcome": "brief outcome"},
    {"option": "Choice 2", "potential_outcome": "brief outcome"},
    {"option": "Choice 3", "potential_outcome": "brief outcome"}
  ],
  "decision_weight": 1-10 (how important this decision is)
}`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    decision_prompt: { type: 'string' },
                    choices: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                option: { type: 'string' },
                                potential_outcome: { type: 'string' }
                            }
                        }
                    },
                    decision_weight: { type: 'number' }
                }
            }
        });

        return Response.json({ 
            success: true,
            decision_point: {
                ...aiResponse,
                event_id,
                agent_id,
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error generating decision point:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});