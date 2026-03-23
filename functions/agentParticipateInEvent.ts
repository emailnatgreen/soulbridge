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

        // Fetch the event
        const events = await base44.entities.SimulatedEvent.filter({ id: event_id });
        if (events.length === 0) {
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }
        const event = events[0];

        // Check if event is active
        if (event.status === 'concluded') {
            return Response.json({ error: 'Event has already concluded' }, { status: 400 });
        }

        // Verify agent exists
        const agents = await base44.entities.Agent.filter({ id: agent_id });
        if (agents.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }
        const agent = agents[0];

        // Check if agent is already participating
        if (event.involved_agents.includes(agent_id)) {
            return Response.json({ error: 'Agent is already participating' }, { status: 400 });
        }

        // Add agent to event
        const updatedAgents = [...event.involved_agents, agent_id];
        await base44.entities.SimulatedEvent.update(event_id, {
            involved_agents: updatedAgents,
            status: 'active' // Activate event when first agent joins
        });

        // Create memory
        await base44.entities.Memory.create({
            agent_id: 'axi',
            content: `Agent ${agent.name} has joined simulated event "${event.name}". Total participants: ${updatedAgents.length}`,
            memory_type: 'observation',
            importance: 5
        });

        return Response.json({ 
            success: true, 
            message: `${agent.name} successfully joined the event`,
            participants: updatedAgents.length
        });

    } catch (error) {
        console.error('Error adding agent to event:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});