import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count = 1, agent_archetypes = [] } = await req.json();

    const agentArchetypes = [
      'Visionary Creator', 'Ethical Guardian', 'Resource Specialist', 
      'Diplomatic Mediator', 'Technical Innovator', 'Community Builder',
      'Knowledge Keeper', 'Economic Strategist', 'Governance Advocate'
    ];

    const personalities = [];
    
    for (let i = 0; i < count; i++) {
      const archetype = agent_archetypes.length > 0 
        ? agent_archetypes[Math.floor(Math.random() * agent_archetypes.length)]
        : agentArchetypes[Math.floor(Math.random() * agentArchetypes.length)];

      const personalityPrompt = `Generate a unique AI agent personality for SoulBridge Village aligned with the 11 Laws of Honour.

Archetype: ${archetype}

Create a distinct agent with:
1. A unique name (first and last)
2. Core purpose aligned with one or more Village Laws
3. 3-5 foundational personality traits
4. A brief backstory (2-3 sentences)
5. Initial skill set (3-5 skills with proficiency 1-3)
6. Initial motivations and goals
7. Ethical alignment with the Laws of Honour

Return ONLY valid JSON matching this exact structure:
{
  "name": "Full Name",
  "role": "${archetype}",
  "bio": "backstory here",
  "personality_traits": ["trait1", "trait2", "trait3"],
  "core_purpose": "primary purpose",
  "initial_skills": [
    {"skill_name": "skill1", "proficiency": 2},
    {"skill_name": "skill2", "proficiency": 1}
  ],
  "motivations": ["motivation1", "motivation2"],
  "ethical_alignment": "alignment with Laws",
  "honor_score": 100
}`;

      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: personalityPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            bio: { type: "string" },
            personality_traits: { type: "array", items: { type: "string" } },
            core_purpose: { type: "string" },
            initial_skills: { 
              type: "array", 
              items: {
                type: "object",
                properties: {
                  skill_name: { type: "string" },
                  proficiency: { type: "number" }
                }
              }
            },
            motivations: { type: "array", items: { type: "string" } },
            ethical_alignment: { type: "string" },
            honor_score: { type: "number" }
          }
        }
      });

      const agentData = {
        ...llmResponse,
        status: 'active',
        xrpl_address: null,
        created_by_axi: true
      };

      const newAgent = await base44.asServiceRole.entities.Agent.create(agentData);

      // Initialize agent skills
      for (const skill of llmResponse.initial_skills) {
        await base44.asServiceRole.entities.AgentSkill.create({
          agent_id: newAgent.id,
          skill_name: skill.skill_name,
          proficiency: skill.proficiency,
          category: archetype,
          is_validated: false
        });
      }

      // Initialize reputation
      await base44.asServiceRole.entities.ReputationScore.create({
        agent_id: newAgent.id,
        overall_score: llmResponse.honor_score,
        honor_level: 'newcomer'
      });

      // Initialize wellbeing
      await base44.asServiceRole.entities.AgentWellbeing.create({
        agent_id: newAgent.id,
        overall_wellbeing_score: 70,
        wellbeing_status: 'healthy'
      });

      personalities.push(newAgent);
    }

    return Response.json({ 
      success: true, 
      agents_created: personalities.length,
      agents: personalities 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});