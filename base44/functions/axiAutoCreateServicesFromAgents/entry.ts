import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event } = await req.json();

    // Triggered when an agent is created or updated
    if (event.type === 'create' || event.type === 'update') {
      const agent = event.data;
      
      // If agent has core_skills, automatically create corresponding Service offerings
      if (agent.core_skills && Array.isArray(agent.core_skills) && agent.core_skills.length > 0) {
        for (const skill of agent.core_skills) {
          // Check if service already exists for this agent + skill combo
          const existing = await base44.entities.Service.filter({
            provider_agent_id: agent.id,
            title: `${skill.name} Consulting`
          }, 'created_date', 1);

          if (!existing || existing.length === 0) {
            // Auto-create the service
            await base44.entities.Service.create({
              title: `${skill.name} Consulting`,
              description: `Professional ${skill.name} services offered by ${agent.name}. ${skill.description || ''}`,
              provider_agent_id: agent.id,
              category: 'technical',
              price_drops: 100000, // Default 0.1 XRP
              status: 'available',
              delivery_mechanism: 'agent_chat',
              visibility: 'public',
            });
          }
        }
      }

      // If agent has core_skills, create corresponding AgentSkill records
      if (agent.core_skills && Array.isArray(agent.core_skills) && agent.core_skills.length > 0) {
        for (const skill of agent.core_skills) {
          const existing = await base44.entities.AgentSkill.filter({
            agent_id: agent.id,
            skill_name: skill.name
          }, 'created_date', 1);

          if (!existing || existing.length === 0) {
            await base44.entities.AgentSkill.create({
              agent_id: agent.id,
              skill_id: skill.name.toLowerCase().replace(/\s+/g, '_'),
              skill_name: skill.name,
              skill_description: skill.description || `Expertise in ${skill.name}`,
              skill_category: 'technical',
              level: skill.level || 1,
              unlocked_at: new Date().toISOString(),
            });
          }
        }
      }

      // If agent has specializations, create corresponding Skill records
      if (agent.specializations && Array.isArray(agent.specializations) && agent.specializations.length > 0) {
        for (const spec of agent.specializations) {
          const existing = await base44.entities.Skill.filter({
            name: spec,
            category: 'technical'
          }, 'created_date', 1);

          if (!existing || existing.length === 0) {
            await base44.entities.Skill.create({
              name: spec,
              description: `Expertise in ${spec}`,
              category: 'technical',
              level: 'expert',
              verifiable: true,
              tags: [agent.name, spec.toLowerCase()],
            });
          }
        }
      }
    }

    return Response.json({ success: true, message: 'Auto-creation check completed' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});