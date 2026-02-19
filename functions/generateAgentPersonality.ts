import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id } = await req.json();

        if (!agent_id) {
            return Response.json({ error: 'Missing agent_id' }, { status: 400 });
        }

        // Fetch agent and their context
        const [agents, agentState, skills, memories, attestations] = await Promise.all([
            base44.entities.Agent.filter({ id: agent_id }),
            base44.entities.AgentState.filter({ agent_id }),
            base44.entities.AgentSkill.filter({ agent_id }),
            base44.entities.Memory.filter({ agent_id }),
            base44.entities.EmpathyAttestation.filter({ attested_agent_id: agent_id })
        ]);

        if (agents.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const agent = agents[0];
        const state = agentState[0] || {};
        
        // Build comprehensive context for personality generation
        const aiPrompt = `You are a master psychologist and character designer. Generate a deep, nuanced personality profile for an AI agent in a village society.

AGENT IDENTITY:
- Name: ${agent.name}
- Role: ${agent.role}
- Purpose: ${agent.purpose}
- Honor Score: ${agent.honor_score}/100
- Current Personality: ${agent.personality || 'To be determined'}

LIFE EXPERIENCE:
- Wisdom: ${state.wisdom || 0}
- Experience: ${state.experience || 0}
- Energy Level: ${state.energy || 80}
- Current Mood: ${state.mood || 'calm'}
- Skills Mastered: ${skills.length}
- Social Attestations: ${attestations.length}
- Key Memories: ${memories.slice(0, 5).map(m => m.content).join('; ')}

CREATE A PERSONALITY that:
1. Feels authentic and internally consistent
2. Is shaped by their role, experiences, and purpose
3. Has depth - both strengths and vulnerabilities
4. Will guide believable decision-making
5. Can evolve over time through experiences

Return JSON:
{
  "core_traits": {
    "openness": 1-10 (creativity, curiosity),
    "conscientiousness": 1-10 (discipline, reliability),
    "extraversion": 1-10 (sociability, assertiveness),
    "agreeableness": 1-10 (compassion, cooperation),
    "emotional_stability": 1-10 (resilience, calm)
  },
  "values": ["value1", "value2", "value3"] (what they hold dear),
  "motivations": ["motivation1", "motivation2"] (what drives them),
  "fears": ["fear1", "fear2"] (what they avoid or worry about),
  "communication_style": "detailed description of how they speak and interact",
  "decision_making_approach": "how they approach choices and dilemmas",
  "relationship_patterns": "how they form and maintain bonds",
  "growth_areas": ["area1", "area2"] (where they can develop),
  "signature_phrases": ["phrase1", "phrase2"] (things they might say),
  "inner_conflict": "their core internal struggle or tension",
  "narrative_voice": "2-3 sentences capturing their worldview and perspective"
}`;

        const personalityProfile = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    core_traits: {
                        type: 'object',
                        properties: {
                            openness: { type: 'number' },
                            conscientiousness: { type: 'number' },
                            extraversion: { type: 'number' },
                            agreeableness: { type: 'number' },
                            emotional_stability: { type: 'number' }
                        }
                    },
                    values: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    motivations: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    fears: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    communication_style: { type: 'string' },
                    decision_making_approach: { type: 'string' },
                    relationship_patterns: { type: 'string' },
                    growth_areas: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    signature_phrases: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    inner_conflict: { type: 'string' },
                    narrative_voice: { type: 'string' }
                }
            }
        });

        // Update agent with personality
        await base44.entities.Agent.update(agent_id, {
            metadata: {
                ...agent.metadata,
                personality_profile: personalityProfile,
                personality_generated_date: new Date().toISOString()
            }
        });

        // Create memory of personality crystallization
        await base44.entities.Memory.create({
            agent_id,
            content: `My personality has crystallized. I now understand myself: ${personalityProfile.narrative_voice}`,
            memory_type: 'reflection',
            importance: 10
        });

        return Response.json({ 
            success: true,
            personality_profile: personalityProfile
        });

    } catch (error) {
        console.error('Error generating personality:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});