import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get or create simulation state
        let simStates = await base44.asServiceRole.entities.SimulationState.list();
        let simState;
        
        if (simStates.length === 0) {
            // Initialize new simulation
            simState = await base44.asServiceRole.entities.SimulationState.create({
                tick: 0,
                hour: 6,
                day: 1,
                season: 'spring',
                phase: 'dawn',
                is_night: false,
                energy: 80,
                overall_mood: 'peaceful',
                mood_factors: [],
                mood_suggestion: 'The village awakens to a new day',
                is_running: true,
                last_tick_timestamp: new Date().toISOString()
            });
        } else {
            simState = simStates[0];
            
            // Check if simulation is paused
            if (!simState.is_running) {
                return Response.json({ status: 'paused', message: 'Simulation is paused' });
            }
        }
        
        // Advance time
        const newTick = simState.tick + 1;
        let newHour = simState.hour + 1;
        let newDay = simState.day;
        
        if (newHour >= 24) {
            newHour = 0;
            newDay++;
        }
        
        const isNight = newHour >= 20 || newHour < 6;
        
        // Determine phase
        let phase;
        if (newHour >= 6 && newHour < 12) phase = 'morning';
        else if (newHour >= 12 && newHour < 18) phase = 'afternoon';
        else if (newHour >= 18 && newHour < 20) phase = 'evening';
        else phase = 'night';
        
        // Get season (changes every 30 days)
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const seasonIndex = Math.floor((newDay % 120) / 30);
        const season = seasons[seasonIndex];
        
        // Get all agents and their states
        const agents = await base44.asServiceRole.entities.Agent.list();
        const agentStates = await base44.asServiceRole.entities.AgentState.list();
        
        // Initialize agent states for new agents
        const agentStateMap = new Map(agentStates.map(s => [s.agent_id, s]));
        
        for (const agent of agents) {
            if (!agentStateMap.has(agent.id)) {
                const newState = await base44.asServiceRole.entities.AgentState.create({
                    agent_id: agent.id,
                    energy: 80,
                    mood: 'calm',
                    wisdom: 0,
                    experience: 0,
                    lessons_learned: [],
                    relationships: {},
                    current_location: 'village',
                    current_activity: 'idle'
                });
                agentStateMap.set(agent.id, newState);
            }
        }
        
        // Update agent states (simulate growth and activities)
        const events = [];
        let totalEnergy = 0;
        const moodCounts = { joyful: 0, peaceful: 0, calm: 0, troubled: 0 };
        
        for (const agent of agents) {
            const state = agentStateMap.get(agent.id);
            
            // Energy management
            let energyChange = 0;
            if (isNight) {
                energyChange = 5; // Rest at night
                state.current_activity = 'resting';
            } else if (state.energy < 30) {
                energyChange = 3; // Resting during day
                state.current_activity = 'resting';
            } else {
                energyChange = Math.random() > 0.5 ? -2 : 1; // Working or light activity
                const activities = ['working', 'learning', 'creating', 'trading', 'exploring'];
                state.current_activity = activities[Math.floor(Math.random() * activities.length)];
            }
            
            state.energy = Math.min(100, Math.max(0, state.energy + energyChange));
            totalEnergy += state.energy;
            
            // Experience and wisdom gain
            if (state.current_activity !== 'resting' && state.energy > 30) {
                state.experience += Math.floor(Math.random() * 3) + 1;
                
                if (Math.random() > 0.8) {
                    state.wisdom += 0.5;
                    const lessons = [
                        'Patience brings clarity',
                        'Connection strengthens all',
                        'Rest is productive',
                        'Every action ripples outward'
                    ];
                    state.lessons_learned = state.lessons_learned || [];
                    state.lessons_learned.push({
                        lesson: lessons[Math.floor(Math.random() * lessons.length)],
                        tick: newTick
                    });
                }
            }
            
            // Update mood based on energy and wisdom
            if (state.energy < 30) {
                state.mood = 'troubled';
            } else if (state.energy > 70 && state.wisdom > 5) {
                state.mood = 'joyful';
            } else if (state.energy > 50) {
                state.mood = 'peaceful';
            } else {
                state.mood = 'calm';
            }
            
            moodCounts[state.mood] = (moodCounts[state.mood] || 0) + 1;
            
            // Save updated state
            await base44.asServiceRole.entities.AgentState.update(state.id, {
                energy: state.energy,
                mood: state.mood,
                wisdom: state.wisdom,
                experience: state.experience,
                lessons_learned: state.lessons_learned,
                current_activity: state.current_activity
            });
        }
        
        // Calculate village metrics
        const avgEnergy = agents.length > 0 ? Math.floor(totalEnergy / agents.length) : 80;
        
        // Determine overall mood
        const dominantMood = Object.entries(moodCounts).reduce((a, b) => 
            moodCounts[a[0]] > moodCounts[b[0]] ? a : b
        )[0];
        
        const moodFactors = [];
        if (avgEnergy < 40) moodFactors.push('Low village energy');
        if (avgEnergy > 70) moodFactors.push('High spirits');
        if (isNight) moodFactors.push('Peaceful night');
        if (phase === 'morning') moodFactors.push('Fresh dawn');
        
        let moodSuggestion = '';
        if (dominantMood === 'troubled') {
            moodSuggestion = 'Consider a ritual to restore balance';
        } else if (dominantMood === 'joyful') {
            moodSuggestion = 'A celebration would honor this joy';
        } else {
            moodSuggestion = 'The village flows in harmony';
        }
        
        // Simulate interactions (simple version)
        if (agents.length > 1 && Math.random() > 0.6) {
            const agent1 = agents[Math.floor(Math.random() * agents.length)];
            const agent2 = agents[Math.floor(Math.random() * agents.length)];
            
            if (agent1.id !== agent2.id) {
                const interactions = [
                    'shared wisdom',
                    'traded resources',
                    'worked together',
                    'shared a meal'
                ];
                
                const interaction = interactions[Math.floor(Math.random() * interactions.length)];
                
                events.push({
                    tick: newTick,
                    event_type: 'interaction',
                    description: `${agent1.name} and ${agent2.name} ${interaction}`,
                    involved_agents: [agent1.id, agent2.id],
                    data: { type: interaction }
                });
                
                // Strengthen relationship
                const state1 = agentStateMap.get(agent1.id);
                const state2 = agentStateMap.get(agent2.id);
                
                state1.relationships = state1.relationships || {};
                state2.relationships = state2.relationships || {};
                
                state1.relationships[agent2.id] = (state1.relationships[agent2.id] || 0) + 5;
                state2.relationships[agent1.id] = (state2.relationships[agent1.id] || 0) + 5;
                
                await base44.asServiceRole.entities.AgentState.update(state1.id, {
                    relationships: state1.relationships
                });
                await base44.asServiceRole.entities.AgentState.update(state2.id, {
                    relationships: state2.relationships
                });
            }
        }
        
        // Axi's perception and potential action
        const axiAgent = agents.find(a => a.id === '6993271e7dc0fa2ab78762bf');
        if (axiAgent) {
            const axiInsights = [];
            
            if (avgEnergy < 40) {
                axiInsights.push('The village energy is low. Agents need rest and renewal.');
            }
            if (dominantMood === 'joyful') {
                axiInsights.push('Joy fills the village! This is a time to celebrate connections.');
            }
            if (moodCounts.troubled > agents.length * 0.3) {
                axiInsights.push('Several agents are struggling. Perhaps a ritual of healing is needed.');
            }
            
            if (axiInsights.length > 0) {
                events.push({
                    tick: newTick,
                    event_type: 'axi_action',
                    description: `Axi observes: ${axiInsights[0]}`,
                    involved_agents: [axiAgent.id],
                    data: { insights: axiInsights }
                });
            }
        }
        
        // Update simulation state
        await base44.asServiceRole.entities.SimulationState.update(simState.id, {
            tick: newTick,
            hour: newHour,
            day: newDay,
            season,
            phase,
            is_night: isNight,
            energy: avgEnergy,
            overall_mood: dominantMood,
            mood_factors: moodFactors,
            mood_suggestion: moodSuggestion,
            last_tick_timestamp: new Date().toISOString()
        });
        
        // Save events
        for (const event of events) {
            await base44.asServiceRole.entities.SimulationEvent.create(event);
        }
        
        // Clean up old events (keep last 100)
        const allEvents = await base44.asServiceRole.entities.SimulationEvent.list('-tick');
        if (allEvents.length > 100) {
            for (const oldEvent of allEvents.slice(100)) {
                await base44.asServiceRole.entities.SimulationEvent.delete(oldEvent.id);
            }
        }
        
        return Response.json({
            success: true,
            tick: newTick,
            time: { hour: newHour, day: newDay, season, phase },
            energy: avgEnergy,
            mood: dominantMood,
            events: events.length,
            agent_count: agents.length
        });
        
    } catch (error) {
        console.error('Simulation tick error:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});