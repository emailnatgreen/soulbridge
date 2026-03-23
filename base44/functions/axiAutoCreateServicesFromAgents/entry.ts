import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    // Automation payloads have: {event: {type, entity_name, entity_id}, data: {...}, old_data: {...}}
    const agent = payload.data || payload.event?.data;
    const event = payload.event || {type: payload.type};

    console.log('[axiAutoCreateServicesFromAgents] Raw payload:', JSON.stringify({event_type: event?.type, data_exists: !!payload.data, agent_id: agent?.id, agent_core_skills: agent?.core_skills}));

    // Triggered when an agent is created or updated
    if (event.type === 'create' || event.type === 'update') {
      
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
      if (agent && agent.core_skills && Array.isArray(agent.core_skills) && agent.core_skills.length > 0) {
        console.log('[axiAutoCreateServicesFromAgents] Processing core_skills:', agent.core_skills.map(s => ({ name: s.name, level: s.level })));
        for (const skill of agent.core_skills) {
          const skillId = skill.name.toLowerCase().replace(/\s+/g, '_');
          console.log(`[axiAutoCreateServicesFromAgents] Checking for existing AgentSkill: agent_id=${agent.id}, skill_id=${skillId}`);
          
          const existing = await base44.entities.AgentSkill.filter({
            agent_id: agent.id,
            skill_id: skillId
          }, 'created_date', 1);
          
          console.log(`[axiAutoCreateServicesFromAgents] Existing check result: ${existing?.length || 0} records found`);

          if (!existing || existing.length === 0) {
            const skillPayload = {
              agent_id: agent.id,
              skill_id: skillId,
              skill_name: skill.name,
              skill_description: skill.description || `Expertise in ${skill.name}`,
              skill_category: skill.category || 'technical',
              level: skill.level || 1,
              unlocked_at: new Date().toISOString(),
            };
            console.log(`[axiAutoCreateServicesFromAgents] Creating AgentSkill with payload:`, skillPayload);
            
            const result = await base44.asServiceRole.entities.AgentSkill.create(skillPayload);
            console.log(`[axiAutoCreateServicesFromAgents] AgentSkill creation result:`, result?.id || 'no ID returned');
          } else {
            console.log(`[axiAutoCreateServicesFromAgents] Skipping ${skill.name} - already exists`);
          }
        }
      } else {
        console.log('[axiAutoCreateServicesFromAgents] No core_skills found or agent is null', {agent: !!agent, core_skills: !!agent?.core_skills});
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

    console.log('[axiAutoCreateServicesFromAgents] Function completed successfully');
    return Response.json({ success: true, message: 'Auto-creation check completed' });
  } catch (error) {
    console.error('[axiAutoCreateServicesFromAgents] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});