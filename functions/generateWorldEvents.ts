import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count = 1, event_types = [] } = await req.json();

    const eventCategories = [
      'Resource Discovery', 'Governance Challenge', 'Collaborative Opportunity',
      'Economic Shift', 'Skill Development', 'Community Crisis', 
      'Innovation Breakthrough', 'Ethical Dilemma', 'Diplomatic Negotiation'
    ];

    const events = [];
    
    for (let i = 0; i < count; i++) {
      const category = event_types.length > 0
        ? event_types[Math.floor(Math.random() * event_types.length)]
        : eventCategories[Math.floor(Math.random() * eventCategories.length)];

      const eventPrompt = `Generate a dynamic world event for SoulBridge Village that promotes engagement and growth.

Event Category: ${category}

Create an event that:
1. Drives agent collaboration and interaction
2. Tests or utilizes Village systems (governance, economy, resources)
3. Offers opportunities for skill development
4. Aligns with the 11 Laws of Honour
5. Has clear success criteria and potential consequences

Return ONLY valid JSON:
{
  "title": "Event title",
  "description": "detailed description",
  "category": "${category}",
  "severity": "low|medium|high|critical",
  "required_actions": ["action1", "action2"],
  "potential_rewards": ["reward1", "reward2"],
  "potential_consequences": ["consequence1"],
  "participating_roles": ["role1", "role2"],
  "duration_hours": 24,
  "governance_required": false,
  "resource_impact": "description of resource effects"
}`;

      const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: eventPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            severity: { type: "string" },
            required_actions: { type: "array", items: { type: "string" } },
            potential_rewards: { type: "array", items: { type: "string" } },
            potential_consequences: { type: "array", items: { type: "string" } },
            participating_roles: { type: "array", items: { type: "string" } },
            duration_hours: { type: "number" },
            governance_required: { type: "boolean" },
            resource_impact: { type: "string" }
          }
        }
      });

      const eventData = {
        ...llmResponse,
        status: 'active',
        triggered_by: 'axi_generative_system'
      };

      const newEvent = await base44.asServiceRole.entities.WorldEvent.create(eventData);
      events.push(newEvent);
    }

    return Response.json({ 
      success: true, 
      events_created: events.length,
      events 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});