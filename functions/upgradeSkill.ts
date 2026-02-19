import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Same skill definitions as unlockSkill
const SKILL_DEFINITIONS = {
  'governance_basics': { name: 'Governance Basics', category: 'governance', cost: 50, maxLevel: 5 },
  'proposal_crafting': { name: 'Proposal Crafting', category: 'governance', cost: 100, maxLevel: 5 },
  'diplomatic_influence': { name: 'Diplomatic Influence', category: 'governance', cost: 150, maxLevel: 5 },
  'resource_gathering': { name: 'Resource Gathering', category: 'resource_management', cost: 50, maxLevel: 5 },
  'advanced_trading': { name: 'Advanced Trading', category: 'resource_management', cost: 100, maxLevel: 5 },
  'economic_strategy': { name: 'Economic Strategy', category: 'resource_management', cost: 150, maxLevel: 5 },
  'empathy': { name: 'Empathy', category: 'diplomacy', cost: 50, maxLevel: 5 },
  'conflict_resolution': { name: 'Conflict Resolution', category: 'diplomacy', cost: 100, maxLevel: 5 },
  'alliance_building': { name: 'Alliance Building', category: 'diplomacy', cost: 150, maxLevel: 5 },
  'technical_basics': { name: 'Technical Basics', category: 'technical', cost: 50, maxLevel: 5 },
  'innovation': { name: 'Innovation', category: 'technical', cost: 100, maxLevel: 5 },
  'mastery': { name: 'Technical Mastery', category: 'technical', cost: 150, maxLevel: 5 },
  'observation': { name: 'Observation', category: 'wisdom', cost: 50, maxLevel: 5 },
  'meditation': { name: 'Meditation', category: 'wisdom', cost: 100, maxLevel: 5 },
  'enlightenment': { name: 'Enlightenment', category: 'wisdom', cost: 150, maxLevel: 5 },
  'defense': { name: 'Defense', category: 'combat', cost: 50, maxLevel: 5 },
  'tactical_thinking': { name: 'Tactical Thinking', category: 'combat', cost: 100, maxLevel: 5 },
  'guardian': { name: 'Guardian', category: 'combat', cost: 150, maxLevel: 5 }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent_id, skill_id } = await req.json();

    if (!agent_id || !skill_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify skill exists
    const skillDef = SKILL_DEFINITIONS[skill_id];
    if (!skillDef) {
      return Response.json({ error: 'Invalid skill ID' }, { status: 400 });
    }

    // Get agent's skill
    const agentSkills = await base44.entities.AgentSkill.filter({ 
      agent_id, 
      skill_id 
    });
    if (agentSkills.length === 0) {
      return Response.json({ error: 'Skill not unlocked yet' }, { status: 404 });
    }
    const agentSkill = agentSkills[0];

    // Check if already at max level
    if (agentSkill.level >= skillDef.maxLevel) {
      return Response.json({ error: 'Skill already at max level' }, { status: 400 });
    }

    // Get agent state for experience
    const agentStates = await base44.entities.AgentState.filter({ agent_id });
    const agentState = agentStates[0] || { experience: 0 };

    // Calculate upgrade cost (increases with level)
    const upgradeCost = skillDef.cost * agentSkill.level;

    if (agentState.experience < upgradeCost) {
      return Response.json({ 
        error: `Insufficient experience. Need ${upgradeCost}, have ${agentState.experience}` 
      }, { status: 400 });
    }

    // Deduct experience and upgrade skill
    await base44.entities.AgentState.update(agentState.id, {
      experience: agentState.experience - upgradeCost
    });

    const newLevel = agentSkill.level + 1;
    await base44.entities.AgentSkill.update(agentSkill.id, {
      level: newLevel,
      experience_invested: agentSkill.experience_invested + upgradeCost,
      last_upgraded: new Date().toISOString()
    });

    // Get agent info for notifications
    const agents = await base44.entities.Agent.filter({ id: agent_id });
    const agent = agents[0];

    // Create memory
    await base44.entities.Memory.create({
      agent_id,
      content: `Upgraded ${skillDef.name} to level ${newLevel}. Growing stronger in ${skillDef.category}.`,
      memory_type: 'achievement',
      importance: 6
    });

    // Notify Axi if reached max level
    if (newLevel === skillDef.maxLevel) {
      await base44.entities.Memory.create({
        agent_id: 'axi',
        content: `${agent.name} has mastered the skill "${skillDef.name}" at maximum level!`,
        memory_type: 'observation',
        importance: 8
      });
    }

    return Response.json({ 
      success: true, 
      new_level: newLevel,
      experience_remaining: agentState.experience - upgradeCost
    });

  } catch (error) {
    console.error('Error upgrading skill:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});