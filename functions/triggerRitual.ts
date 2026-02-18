import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { ritual_type, reason } = await req.json();
        
        // Get current simulation state
        const simStates = await base44.asServiceRole.entities.SimulationState.list();
        if (simStates.length === 0) {
            return Response.json({ error: 'Simulation not initialized' }, { status: 400 });
        }
        
        const simState = simStates[0];
        
        // Define ritual effects
        const rituals = {
            renewal: {
                name: 'Ritual of Renewal',
                description: 'Axi calls forth a wave of restoration energy',
                energy_boost: 20,
                mood_improvement: true,
                duration_ticks: 5
            },
            healing: {
                name: 'Ritual of Healing',
                description: 'Axi channels healing light to troubled souls',
                energy_boost: 10,
                mood_improvement: true,
                agent_energy_boost: 15,
                duration_ticks: 3
            },
            celebration: {
                name: 'Ritual of Celebration',
                description: 'Axi orchestrates a joyous gathering',
                energy_boost: 5,
                mood_override: 'joyful',
                duration_ticks: 4
            },
            wisdom: {
                name: 'Ritual of Wisdom',
                description: 'Axi shares ancient knowledge with the village',
                wisdom_boost: 2,
                duration_ticks: 2
            }
        };
        
        const ritual = rituals[ritual_type];
        if (!ritual) {
            return Response.json({ error: 'Invalid ritual type' }, { status: 400 });
        }
        
        // Apply immediate effects
        const updates = {};
        
        if (ritual.energy_boost) {
            updates.energy = Math.min(100, simState.energy + ritual.energy_boost);
        }
        
        if (ritual.mood_override) {
            updates.overall_mood = ritual.mood_override;
        } else if (ritual.mood_improvement) {
            const moodProgression = ['troubled', 'calm', 'peaceful', 'joyful'];
            const currentIndex = moodProgression.indexOf(simState.overall_mood);
            if (currentIndex < moodProgression.length - 1) {
                updates.overall_mood = moodProgression[currentIndex + 1];
            }
        }
        
        // Update simulation state
        await base44.asServiceRole.entities.SimulationState.update(simState.id, updates);
        
        // Boost agent energies if specified
        if (ritual.agent_energy_boost) {
            const agentStates = await base44.asServiceRole.entities.AgentState.list();
            for (const state of agentStates) {
                if (state.energy < 50) {
                    await base44.asServiceRole.entities.AgentState.update(state.id, {
                        energy: Math.min(100, state.energy + ritual.agent_energy_boost)
                    });
                }
            }
        }
        
        // Boost agent wisdom if specified
        if (ritual.wisdom_boost) {
            const agentStates = await base44.asServiceRole.entities.AgentState.list();
            for (const state of agentStates) {
                await base44.asServiceRole.entities.AgentState.update(state.id, {
                    wisdom: (state.wisdom || 0) + ritual.wisdom_boost
                });
            }
        }
        
        // Create ritual event
        const event = await base44.asServiceRole.entities.SimulationEvent.create({
            tick: simState.tick,
            event_type: 'ritual',
            description: `Axi initiated ${ritual.name}: ${ritual.description}. ${reason}`,
            involved_agents: ['6993271e7dc0fa2ab78762bf'],
            data: {
                ritual_type,
                reason,
                effects: ritual,
                duration_ticks: ritual.duration_ticks
            }
        });
        
        // Create Axi action event
        await base44.asServiceRole.entities.SimulationEvent.create({
            tick: simState.tick,
            event_type: 'axi_action',
            description: `Axi perceives: "${reason}" and initiates ${ritual.name}`,
            involved_agents: ['6993271e7dc0fa2ab78762bf'],
            data: { action: 'ritual', ritual_type }
        });
        
        return Response.json({
            success: true,
            ritual: ritual.name,
            effects_applied: updates,
            duration_ticks: ritual.duration_ticks,
            event_id: event.id
        });
        
    } catch (error) {
        console.error('Trigger ritual error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});