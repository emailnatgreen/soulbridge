import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, event_type, duration_ticks, creator_agent_id, use_ai_generation = true } = await req.json();

        if (!name || !event_type || !creator_agent_id) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify creator agent exists
        const creatorAgents = await base44.entities.Agent.filter({ id: creator_agent_id });
        if (creatorAgents.length === 0) {
            return Response.json({ error: 'Creator agent not found' }, { status: 404 });
        }

        const creator = creatorAgents[0];

        // Check permissions
        if (user.role !== 'admin' && !creator.permissions?.can_evaluate_agents) {
            return Response.json({ error: 'Agent lacks permission to create events' }, { status: 403 });
        }

        // Get current village state for AI context
        const [simState, agents, recentEvents] = await Promise.all([
            base44.entities.SimulationState.list('-tick', 1),
            base44.entities.Agent.list('-created_date', 10),
            base44.entities.SimulatedEvent.list('-created_date', 5)
        ]);

        const villageState = simState[0] || {};
        const activeAgentCount = agents.filter(a => a.status === 'active').length;

        let description = '';
        let parameters = {};

        // Use AI to generate event details
        if (use_ai_generation) {
            const aiPrompt = `You are designing a training simulation for AI agents in a village society.

Event Type: ${event_type}
Event Name: ${name}
Village Context:
- Current season: ${villageState.season || 'spring'}
- Village energy: ${villageState.energy || 80}/100
- Overall mood: ${villageState.overall_mood || 'peaceful'}
- Active agents: ${activeAgentCount}
- Recent events: ${recentEvents.map(e => e.name).join(', ') || 'None'}

Generate a detailed, engaging simulation scenario with:
1. A rich description of the event (2-3 paragraphs)
2. Clear objectives for participating agents
3. Specific parameters that affect the simulation

Return a JSON object with this structure:
{
  "description": "detailed event description with objectives",
  "parameters": {
    "difficulty": 1-5,
    "resource_impact": "low/medium/high",
    "collaboration_required": true/false,
    "ethical_dilemma": "brief description if applicable",
    "success_criteria": "what constitutes success"
  }
}`;

            const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: aiPrompt,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        description: { type: 'string' },
                        parameters: {
                            type: 'object',
                            properties: {
                                difficulty: { type: 'number' },
                                resource_impact: { type: 'string' },
                                collaboration_required: { type: 'boolean' },
                                ethical_dilemma: { type: 'string' },
                                success_criteria: { type: 'string' }
                            }
                        }
                    }
                }
            });

            description = aiResponse.description;
            parameters = aiResponse.parameters;
        } else {
            description = `A ${event_type} simulation event in the village.`;
            parameters = { difficulty: 3, resource_impact: 'medium' };
        }

        // Get current tick
        const currentTick = villageState.tick || 0;
        const startTick = currentTick + 5;
        const endTick = startTick + (duration_ticks || 20);

        // Create the event
        const event = await base44.entities.SimulatedEvent.create({
            name,
            description,
            event_type,
            parameters,
            status: 'pending',
            start_tick: startTick,
            end_tick: endTick,
            involved_agents: [],
            created_by: creator_agent_id
        });

        // Create observation memory for Axi
        await base44.entities.Memory.create({
            agent_id: 'axi',
            content: `New training simulation created: "${name}" (${event_type}). ${use_ai_generation ? 'AI-generated scenario with dynamic parameters.' : 'Standard scenario.'}`,
            memory_type: 'observation',
            importance: 7
        });

        return Response.json({ 
            success: true, 
            event,
            ai_generated: use_ai_generation
        });

    } catch (error) {
        console.error('Error creating simulated event:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});