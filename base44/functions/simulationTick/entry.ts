import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ACTIVITIES = ['working', 'resting', 'learning', 'creating', 'trading', 'exploring', 'idle'];
const MOODS = ['troubled', 'calm', 'peaceful', 'joyful', 'festive'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

function getPhase(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
}

function getMoodSuggestion(mood, energy) {
    if (mood === 'troubled') return 'Agents need support and encouragement';
    if (mood === 'festive') return 'Village is celebrating! Great time for collaboration';
    if (energy < 30) return 'Energy is low — agents should rest';
    if (mood === 'joyful') return 'High spirits! Ideal for ambitious projects';
    return 'Village is in a balanced, productive state';
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch current simulation state
        const states = await base44.asServiceRole.entities.SimulationState.list();
        let simState = states[0];

        if (!simState) {
            // Bootstrap initial simulation state if none exists
            simState = await base44.asServiceRole.entities.SimulationState.create({
                tick: 0,
                hour: 8,
                day: 1,
                season: 'spring',
                phase: 'morning',
                is_night: false,
                is_running: true,
                energy: 75,
                overall_mood: 'peaceful',
                mood_suggestion: 'Village is in a balanced, productive state',
                last_tick_timestamp: new Date().toISOString()
            });
        }

        // Only advance if simulation is running
        if (!simState.is_running) {
            return Response.json({ status: 'paused', tick: simState.tick });
        }

        // Advance time
        const newTick = (simState.tick || 0) + 1;
        const newHour = ((simState.hour || 8) + 1) % 24;
        const dayAdvanced = newHour === 0;
        const newDay = dayAdvanced ? (simState.day || 1) + 1 : (simState.day || 1);
        const isNight = newHour >= 22 || newHour < 6;
        const phase = getPhase(newHour);

        // Season changes every 90 days
        const seasonIndex = Math.floor((newDay - 1) / 90) % 4;
        const newSeason = SEASONS[seasonIndex];

        // Village energy fluctuates naturally
        let energyDelta = isNight ? -2 : 1;
        if (phase === 'morning') energyDelta = 3;
        const newEnergy = clamp((simState.energy || 75) + energyDelta + (Math.random() * 4 - 2), 10, 100);

        // Village mood shifts occasionally
        const moodIndex = MOODS.indexOf(simState.overall_mood || 'peaceful');
        let newMoodIndex = moodIndex;
        if (Math.random() < 0.1) {
            newMoodIndex = clamp(moodIndex + (Math.random() < 0.5 ? 1 : -1), 0, MOODS.length - 1);
        }
        const newMood = MOODS[newMoodIndex];

        // Update simulation state
        await base44.asServiceRole.entities.SimulationState.update(simState.id, {
            tick: newTick,
            hour: newHour,
            day: newDay,
            season: newSeason,
            phase,
            is_night: isNight,
            energy: Math.round(newEnergy),
            overall_mood: newMood,
            mood_suggestion: getMoodSuggestion(newMood, newEnergy),
            last_tick_timestamp: new Date().toISOString()
        });

        // Update agent states
        const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
        const agentStates = await base44.asServiceRole.entities.AgentState.list();
        const agentStateMap = new Map(agentStates.map(s => [s.agent_id, s]));

        // Process all agents in parallel to avoid TIME_LIMIT
        const agentResults = await Promise.all(agents.map(async (agent) => {
            const currentState = agentStateMap.get(agent.id);

            if (!currentState) {
                await base44.asServiceRole.entities.AgentState.create({
                    agent_id: agent.id,
                    current_activity: 'idle',
                    energy: 80,
                    mood: 'peaceful',
                    wisdom: 10,
                    experience: 0,
                    relationships: {}
                });
                return null;
            }

            // Advance agent energy
            let agentEnergy = currentState.energy || 80;
            agentEnergy = isNight ? clamp(agentEnergy + 5, 0, 100) : clamp(agentEnergy - 1, 10, 100);

            // Decide activity
            let activity = currentState.current_activity;
            if (Math.random() < 0.2) activity = isNight ? 'resting' : randomChoice(ACTIVITIES);
            if (agentEnergy < 20) activity = 'resting';

            const newWisdom = (currentState.wisdom || 10) + (Math.random() < 0.3 ? 0.1 : 0);
            const newExperience = (currentState.experience || 0) + (activity !== 'resting' ? 1 : 0);
            let agentMood = currentState.mood || 'peaceful';
            if (Math.random() < 0.15) agentMood = newMood;

            await base44.asServiceRole.entities.AgentState.update(currentState.id, {
                current_activity: activity,
                energy: Math.round(agentEnergy),
                mood: agentMood,
                wisdom: Math.round(newWisdom * 10) / 10,
                experience: newExperience
            });

            // Occasionally generate a simulation event
            if (Math.random() < 0.15) {
                const eventTypes = ['activity_change', 'mood_change', 'interaction', 'growth'];
                const eventType = randomChoice(eventTypes);
                const descriptions = {
                    activity_change: `${agent.name} switched to ${activity}`,
                    mood_change: `${agent.name} feels ${agentMood}`,
                    interaction: `${agent.name} engaged with the Village community`,
                    growth: `${agent.name} gained wisdom (${Math.round(newWisdom * 10) / 10})`
                };
                return { tick: newTick, agent_id: agent.id, event_type: eventType, description: descriptions[eventType] };
            }
            return null;
        }));

        const events = agentResults.filter(Boolean);

        // Record simulation events in parallel (limit to 5 per tick)
        await Promise.all(events.slice(0, 5).map(evt =>
            base44.asServiceRole.entities.SimulationEvent.create(evt)
        ));

        // Day rollover event
        if (dayAdvanced) {
            await base44.asServiceRole.entities.SimulationEvent.create({
                tick: newTick,
                event_type: 'day_change',
                description: `Day ${newDay} begins. Season: ${newSeason}. Village mood: ${newMood}.`
            });
        }

        return Response.json({
            status: 'ok',
            tick: newTick,
            hour: newHour,
            day: newDay,
            season: newSeason,
            mood: newMood,
            energy: Math.round(newEnergy),
            agents_updated: agents.length
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});