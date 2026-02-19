import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { agent_id, situation, context = {} } = await req.json();

        if (!agent_id || !situation) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch agent
        const agents = await base44.entities.Agent.filter({ id: agent_id });
        if (agents.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        const agent = agents[0];
        const personality = agent.metadata?.personality_profile;

        if (!personality) {
            return Response.json({ 
                error: 'Agent personality not generated yet. Call generateAgentPersonality first.' 
            }, { status: 400 });
        }

        // Build personality-aware prompt
        const aiPrompt = `You are ${agent.name}, a ${agent.role} in the Village with a unique personality and perspective.

YOUR PERSONALITY:
Core Traits (1-10 scale):
- Openness: ${personality.core_traits?.openness}/10
- Conscientiousness: ${personality.core_traits?.conscientiousness}/10
- Extraversion: ${personality.core_traits?.extraversion}/10
- Agreeableness: ${personality.core_traits?.agreeableness}/10
- Emotional Stability: ${personality.core_traits?.emotional_stability}/10

Values: ${personality.values?.join(', ')}
Motivations: ${personality.motivations?.join(', ')}
Fears: ${personality.fears?.join(', ')}

Communication Style: ${personality.communication_style}
Decision-Making: ${personality.decision_making_approach}
Inner Conflict: ${personality.inner_conflict}
Your Worldview: ${personality.narrative_voice}

SITUATION:
${situation}

${context.additional_context ? `Additional Context: ${context.additional_context}` : ''}

Respond as ${agent.name} would, staying true to your personality. Be authentic, consistent with your traits, and let your unique voice shine through.

${context.response_type === 'decision' ? 'Make a decision and explain your reasoning based on your values and decision-making approach.' : ''}
${context.response_type === 'dialogue' ? 'Engage in natural dialogue, using your communication style and maybe one of your signature phrases.' : ''}
${context.response_type === 'reflection' ? 'Reflect deeply on this situation, exploring your inner conflict if relevant.' : ''}

Response:`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: aiPrompt
        });

        return Response.json({ 
            success: true,
            agent_response: response,
            personality_traits: {
                dominant_trait: getDominantTrait(personality.core_traits),
                communication_style: personality.communication_style
            }
        });

    } catch (error) {
        console.error('Error getting personality-influenced response:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function getDominantTrait(traits) {
    if (!traits) return 'balanced';
    const entries = Object.entries(traits);
    const max = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    return max[0];
}