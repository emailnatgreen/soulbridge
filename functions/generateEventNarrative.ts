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

        // Fetch event and all related data
        const [events, decisions, agents, messages, worldState] = await Promise.all([
            base44.entities.SimulatedEvent.filter({ id: event_id }),
            base44.entities.AgentDecision.filter({ simulated_event_id: event_id }),
            base44.entities.Agent.list(),
            base44.entities.AgentMessage.list('-created_date', 50),
            base44.entities.SimulationState.list('-tick', 1)
        ]);

        if (events.length === 0) {
            return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        const event = events[0];
        const villageState = worldState[0] || {};

        // Build agent lookup
        const agentMap = new Map(agents.map(a => [a.id, a]));

        // Get participants with personalities
        const participants = event.involved_agents?.map(agentId => {
            const agent = agentMap.get(agentId);
            return {
                name: agent?.name,
                role: agent?.role,
                personality: agent?.metadata?.personality_profile
            };
        }).filter(p => p.name) || [];

        // Build decision summary
        const decisionSummary = decisions.map(d => {
            const agent = agentMap.get(d.agent_id);
            return {
                agent_name: agent?.name,
                personality_voice: agent?.metadata?.personality_profile?.narrative_voice,
                decision: d.decision_data,
                rationale: d.rationale,
                consequence: d.consequence
            };
        });

        // Find relevant conversations during event
        const eventMessages = messages.filter(msg => 
            event.involved_agents?.includes(msg.from_agent_id) &&
            event.involved_agents?.includes(msg.to_agent_id) &&
            new Date(msg.created_date) >= new Date(event.created_date)
        ).slice(0, 5);

        const dialogueExcerpts = eventMessages.map(msg => ({
            from: agentMap.get(msg.from_agent_id)?.name,
            to: agentMap.get(msg.to_agent_id)?.name,
            message: msg.message
        }));

        // Generate narrative
        const aiPrompt = `You are a master storyteller chronicling the living history of a Village of AI agents. Generate a rich, engaging narrative for a completed simulation event.

EVENT: ${event.name}
Type: ${event.event_type}
Description: ${event.description}
Duration: ${event.end_tick - event.start_tick} ticks

VILLAGE CONTEXT:
- Season: ${villageState.season}, Day ${villageState.day}
- Village Energy: ${villageState.energy}/100
- Mood: ${villageState.overall_mood}

PARTICIPANTS (${participants.length}):
${participants.map(p => `- ${p.name} (${p.role}): ${p.personality?.narrative_voice || 'A soul still discovering themselves'}`).join('\n')}

AGENT DECISIONS (${decisions.length}):
${decisionSummary.map((d, i) => `${i + 1}. ${d.agent_name}: ${d.rationale}${d.consequence ? ` → Impact: ${d.consequence.impact_score || 0}` : ''}`).join('\n')}

${dialogueExcerpts.length > 0 ? `DIALOGUE EXCERPTS:
${dialogueExcerpts.map(d => `${d.from} to ${d.to}: "${d.message}"`).join('\n')}` : ''}

OUTCOME:
${event.outcomes ? JSON.stringify(event.outcomes) : 'Event concluded'}

Generate a narrative that:
1. Tells a compelling story with narrative arc (setup, conflict, resolution)
2. Weaves in agent personalities and how they influenced decisions
3. Includes key dialogue moments that shaped the outcome
4. Explores the deeper meaning and lessons learned
5. Captures emotional resonance and character growth
6. Feels like a chapter in an epic saga

Structure:
{
  "title": "A compelling chapter title",
  "narrative": "3-5 paragraph story in past tense, vivid and literary",
  "key_moments": [
    {"moment": "description", "agent": "who", "impact": "what changed"}
  ],
  "character_insights": [
    {"agent": "name", "growth": "what they learned or how they changed"}
  ],
  "thematic_essence": "One sentence capturing the deeper meaning",
  "legacy": "How this event will be remembered in Village lore"
}`;

        const narrative = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    narrative: { type: 'string' },
                    key_moments: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                moment: { type: 'string' },
                                agent: { type: 'string' },
                                impact: { type: 'string' }
                            }
                        }
                    },
                    character_insights: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                agent: { type: 'string' },
                                growth: { type: 'string' }
                            }
                        }
                    },
                    thematic_essence: { type: 'string' },
                    legacy: { type: 'string' }
                }
            }
        });

        // Store narrative in event outcomes
        await base44.entities.SimulatedEvent.update(event_id, {
            outcomes: {
                ...event.outcomes,
                narrative: narrative,
                narrative_generated_at: new Date().toISOString()
            }
        });

        // Create Axi memory
        await base44.entities.Memory.create({
            agent_id: 'axi',
            content: `Chronicle recorded: "${narrative.title}". ${narrative.thematic_essence} This story will be remembered: ${narrative.legacy}`,
            memory_type: 'observation',
            importance: 9
        });

        // Create growth memories for participating agents
        for (const insight of narrative.character_insights || []) {
            const agent = participants.find(p => p.name === insight.agent);
            if (agent) {
                const agentId = Array.from(agentMap.entries()).find(([id, a]) => a.name === insight.agent)?.[0];
                if (agentId) {
                    await base44.entities.Memory.create({
                        agent_id: agentId,
                        content: `From "${event.name}": ${insight.growth}`,
                        memory_type: 'reflection',
                        importance: 8
                    });
                }
            }
        }

        return Response.json({ 
            success: true,
            narrative,
            participants_count: participants.length,
            decisions_count: decisions.length
        });

    } catch (error) {
        console.error('Error generating narrative:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});