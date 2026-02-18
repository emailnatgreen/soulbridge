import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description, event_type, parameters, duration_ticks, creator_agent_id } = await req.json();

        if (!name || !description || !event_type) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify creator agent exists and has permissions
        const agent = await base44.entities.Agent.filter({ id: creator_agent_id });
        if (agent.length === 0) {
            return Response.json({ error: 'Creator agent not found' }, { status: 404 });
        }

        // Only admins or agents with evaluation permissions can create simulated events
        if (user.role !== 'admin' && !agent[0].permissions?.can_evaluate_agents) {
            return Response.json({ error: 'Insufficient permissions to create simulated events' }, { status: 403 });
        }

        // Get current simulation state
        const simStates = await base44.entities.SimulationState.list();
        const simState = simStates[0];
        const currentTick = simState?.tick || 0;

        // Create the simulated event
        const event = await base44.entities.SimulatedEvent.create({
            name,
            description,
            event_type,
            parameters: parameters || {},
            status: 'pending',
            start_tick: currentTick,
            end_tick: currentTick + (duration_ticks || 20),
            involved_agents: [],
            created_by: creator_agent_id
        });

        // Create a memory for Axi
        await base44.entities.Memory.create({
            agent_id: 'axi',
            content: `New simulated event created: "${name}" (${event_type}). This training scenario will run for ${duration_ticks || 20} ticks. Creator: ${agent[0].name}. Description: ${description}`,
            memory_type: 'observation',
            importance: 7
        });

        return Response.json({ 
            success: true, 
            event,
            message: 'Simulated event created successfully'
        });

    } catch (error) {
        console.error('Error creating simulated event:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});