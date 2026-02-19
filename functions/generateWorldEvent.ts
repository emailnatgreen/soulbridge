import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Gather comprehensive village context
        const [simState, agents, recentEvents, resources, locations, treasury, recentWorldEvents] = await Promise.all([
            base44.entities.SimulationState.list('-tick', 1),
            base44.entities.Agent.list('-created_date', 20),
            base44.entities.SimulatedEvent.filter({ status: 'active' }),
            base44.entities.Resource.list('-updated_date', 10),
            base44.entities.VillageLocation.list(),
            base44.entities.Treasury.list('-updated_date', 1),
            base44.entities.WorldEvent.list('-created_date', 5)
        ]);

        const villageState = simState[0] || {};
        const treasuryState = treasury[0] || {};
        const activeAgents = agents.filter(a => a.status === 'active');

        // Calculate village metrics for AI context
        const avgHonor = activeAgents.reduce((sum, a) => sum + (a.honor_score || 0), 0) / activeAgents.length;
        const totalResources = resources.reduce((sum, r) => sum + (r.amount || 0), 0);
        const exploredLocations = locations.filter(l => l.discovered).length;

        // Build AI prompt for world event generation
        const aiPrompt = `You are a dynamic world-building AI for a village simulation. Generate an immersive, unpredictable world event that makes the simulation feel alive.

CURRENT VILLAGE STATE:
- Season: ${villageState.season || 'spring'}
- Day: ${villageState.day || 1}
- Energy: ${villageState.energy || 80}/100
- Mood: ${villageState.overall_mood || 'peaceful'}
- Population: ${activeAgents.length} active agents
- Average Honor: ${avgHonor.toFixed(1)}/100
- Treasury Balance: ${treasuryState.balance || 0} XRP
- Total Resources: ${totalResources}
- Locations Discovered: ${exploredLocations}/${locations.length}

RECENT CONTEXT:
- Active Training Events: ${recentEvents.length}
- Recent World Events: ${recentWorldEvents.map(e => e.title).join(', ') || 'None yet'}

GENERATE A WORLD EVENT that:
1. Feels organic and emergent from current conditions
2. Creates new gameplay possibilities (resources, locations, challenges)
3. Has rich lore and narrative depth
4. Impacts multiple aspects of village life
5. Is unpredictable but makes sense in context

Choose from these categories: environmental, resource_discovery, natural_phenomenon, emergent_threat, opportunity, lore_revelation, seasonal_change

Return JSON:
{
  "title": "event title",
  "description": "rich 2-3 paragraph description with sensory details and narrative hooks",
  "event_category": "category",
  "lore_context": "backstory and lore explaining why this is happening",
  "impact_level": "minor/moderate/major/critical",
  "duration_ticks": number (0 for permanent),
  "world_changes": {
    "new_resources": [{"name": "resource name", "type": "type", "description": "what it is"}],
    "environment_modifiers": {"modifier_name": "effect description"},
    "new_locations": [{"name": "location name", "type": "type", "description": "description"}],
    "threats": [{"name": "threat name", "severity": "low/medium/high", "description": "description"}]
  },
  "agent_implications": "how this affects agents and what they should consider"
}`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    event_category: { type: 'string' },
                    lore_context: { type: 'string' },
                    impact_level: { type: 'string' },
                    duration_ticks: { type: 'number' },
                    world_changes: {
                        type: 'object',
                        properties: {
                            new_resources: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        type: { type: 'string' },
                                        description: { type: 'string' }
                                    }
                                }
                            },
                            environment_modifiers: {
                                type: 'object'
                            },
                            new_locations: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        type: { type: 'string' },
                                        description: { type: 'string' }
                                    }
                                }
                            },
                            threats: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        severity: { type: 'string' },
                                        description: { type: 'string' }
                                    }
                                }
                            }
                        }
                    },
                    agent_implications: { type: 'string' }
                }
            }
        });

        const currentTick = villageState.tick || 0;
        const endTick = aiResponse.duration_ticks > 0 ? currentTick + aiResponse.duration_ticks : null;

        // Create the world event
        const worldEvent = await base44.entities.WorldEvent.create({
            title: aiResponse.title,
            description: aiResponse.description,
            event_category: aiResponse.event_category,
            lore_context: aiResponse.lore_context,
            impact_level: aiResponse.impact_level,
            world_changes: aiResponse.world_changes,
            duration_ticks: aiResponse.duration_ticks,
            status: 'emerging',
            start_tick: currentTick,
            end_tick: endTick,
            trigger_conditions: {
                village_energy: villageState.energy,
                village_mood: villageState.overall_mood,
                population: activeAgents.length,
                season: villageState.season
            }
        });

        // Apply world changes
        const appliedChanges = [];

        // Create new resources
        if (aiResponse.world_changes.new_resources?.length > 0) {
            for (const resource of aiResponse.world_changes.new_resources) {
                await base44.entities.Resource.create({
                    name: resource.name,
                    type: resource.type,
                    amount: 0,
                    description: resource.description,
                    source: `World Event: ${worldEvent.title}`
                });
                appliedChanges.push(`New resource discovered: ${resource.name}`);
            }
        }

        // Create new locations
        if (aiResponse.world_changes.new_locations?.length > 0) {
            for (const location of aiResponse.world_changes.new_locations) {
                await base44.entities.VillageLocation.create({
                    name: location.name,
                    type: location.type || 'ruins',
                    description: location.description,
                    base_resource_type: 'artifact',
                    discovered: false
                });
                appliedChanges.push(`New location emerged: ${location.name}`);
            }
        }

        // Update world event status
        await base44.entities.WorldEvent.update(worldEvent.id, {
            status: 'active'
        });

        // Notify Axi
        await base44.entities.Memory.create({
            agent_id: 'axi',
            content: `🌍 WORLD EVENT: ${worldEvent.title}. ${aiResponse.lore_context}. Changes applied: ${appliedChanges.join(', ')}. Agents must adapt to this new reality.`,
            memory_type: 'observation',
            importance: aiResponse.impact_level === 'critical' ? 10 : aiResponse.impact_level === 'major' ? 8 : 6
        });

        return Response.json({ 
            success: true,
            world_event: worldEvent,
            applied_changes: appliedChanges,
            agent_implications: aiResponse.agent_implications
        });

    } catch (error) {
        console.error('Error generating world event:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});