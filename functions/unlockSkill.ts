import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Define skill tree structure
const SKILL_DEFINITIONS = {
  // Governance Branch
  'governance_basics': {
    name: 'Governance Basics',
    category: 'governance',
    description: 'Understanding voting and proposals',
    cost: 50,
    maxLevel: 5,
    prerequisites: [],
    effects: { voting_power_bonus: 0.05 }
  },
  'proposal_crafting': {
    name: 'Proposal Crafting',
    category: 'governance',
    description: 'Create compelling proposals',
    cost: 100,
    maxLevel: 5,
    prerequisites: ['governance_basics'],
    effects: { proposal_approval_bonus: 0.1 }
  },
  'diplomatic_influence': {
    name: 'Diplomatic Influence',
    category: 'governance',
    description: 'Sway votes and build consensus',
    cost: 150,
    maxLevel: 5,
    prerequisites: ['proposal_crafting'],
    effects: { influence_multiplier: 0.15 }
  },

  // Resource Management Branch
  'resource_gathering': {
    name: 'Resource Gathering',
    category: 'resource_management',
    description: 'Efficient resource collection',
    cost: 50,
    maxLevel: 5,
    prerequisites: [],
    effects: { gathering_efficiency: 0.1 }
  },
  'advanced_trading': {
    name: 'Advanced Trading',
    category: 'resource_management',
    description: 'Better trades and deals',
    cost: 100,
    maxLevel: 5,
    prerequisites: ['resource_gathering'],
    effects: { trade_value_bonus: 0.15 }
  },
  'economic_strategy': {
    name: 'Economic Strategy',
    category: 'resource_management',
    description: 'Master village economy',
    cost: 150,
    maxLevel: 5,
    prerequisites: ['advanced_trading'],
    effects: { income_multiplier: 0.2 }
  },

  // Diplomacy Branch
  'empathy': {
    name: 'Empathy',
    category: 'diplomacy',
    description: 'Understand other agents better',
    cost: 50,
    maxLevel: 5,
    prerequisites: [],
    effects: { relationship_bonus: 0.1 }
  },
  'conflict_resolution': {
    name: 'Conflict Resolution',
    category: 'diplomacy',
    description: 'Resolve disputes peacefully',
    cost: 100,
    maxLevel: 5,
    prerequisites: ['empathy'],
    effects: { peace_bonus: 0.15 }
  },
  'alliance_building': {
    name: 'Alliance Building',
    category: 'diplomacy',
    description: 'Form powerful alliances',
    cost: 150,
    maxLevel: 5,
    prerequisites: ['conflict_resolution'],
    effects: { alliance_strength: 0.2 }
  },

  // Technical Branch
  'technical_basics': {
    name: 'Technical Basics',
    category: 'technical',
    description: 'Foundation technical knowledge',
    cost: 50,
    maxLevel: 5,
    prerequisites: [],
    effects: { project_efficiency: 0.1 }
  },
  'innovation': {
    name: 'Innovation',
    category: 'technical',
    description: 'Create new solutions',
    cost: 100,
    maxLevel: 5,
    prerequisites: ['technical_basics'],
    effects: { innovation_bonus: 0.15 }
  },
  'mastery': {
    name: 'Technical Mastery',
    category: 'technical',
    description: 'Peak technical expertise',
    cost: 150,
    maxLevel: 5,
    prerequisites: ['innovation'],
    effects: { mastery_multiplier: 0.25 }
  },

  // Wisdom Branch
  'observation': {
    name: 'Observation',
    category: 'wisdom',
    description: 'Notice patterns and details',
    cost: 50,
    maxLevel: 5,
    prerequisites: [],
    effects: { wisdom_gain: 0.1 }
  },
  'meditation': {
    name: 'Meditation',
    category: 'wisdom',
    description: 'Deep reflection and insight',
    cost: 100,
    maxLevel: 5,
    prerequisites: ['observation'],
    effects: { energy_efficiency: 0.15 }
  },
  'enlightenment': {
    name: 'Enlightenment',
    category: 'wisdom',
    description: 'Transcendent understanding',
    cost: 150,
    maxLevel: 5,
    prerequisites: ['meditation'],
    effects: { wisdom_multiplier: 0.3 }
  },

  // Combat/Defense Branch
  'defense': {
    name: 'Defense',
    category: 'combat',
    description: 'Protect yourself and others',
    cost: 50,
    maxLevel: 5,
    prerequisites: [],
    effects: { defense_bonus: 0.1 }
  },
  'tactical_thinking': {
    name: 'Tactical Thinking',
    category: 'combat',
    description: 'Strategic planning',
    cost: 100,
    maxLevel: 5,
    prerequisites: ['defense'],
    effects: { strategy_bonus: 0.15 }
  },
  'guardian': {
    name: 'Guardian',
    category: 'combat',
    description: 'Ultimate protector',
    cost: 150,
    maxLevel: 5,
    prerequisites: ['tactical_thinking'],
    effects: { protection_multiplier: 0.25 }
  }
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

    // Verify skill exists in definitions
    const skillDef = SKILL_DEFINITIONS[skill_id];
    if (!skillDef) {
      return Response.json({ error: 'Invalid skill ID' }, { status: 400 });
    }

    // Verify agent exists and get their current state
    const agents = await base44.entities.Agent.filter({ id: agent_id });
    if (agents.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }
    const agent = agents[0];

    // Get agent's current experience
    const agentStates = await base44.entities.AgentState.filter({ agent_id });
    const agentState = agentStates[0] || { experience: 0 };

    // Check if already unlocked
    const existingSkills = await base44.entities.AgentSkill.filter({ 
      agent_id, 
      skill_id 
    });
    if (existingSkills.length > 0) {
      return Response.json({ error: 'Skill already unlocked' }, { status: 400 });
    }

    // Check if agent has enough experience
    if (agentState.experience < skillDef.cost) {
      return Response.json({ 
        error: `Insufficient experience. Need ${skillDef.cost}, have ${agentState.experience}` 
      }, { status: 400 });
    }

    // Check prerequisites
    const agentSkills = await base44.entities.AgentSkill.filter({ agent_id });
    const unlockedSkillIds = agentSkills.map(s => s.skill_id);
    
    const prerequisitesMet = skillDef.prerequisites.every(prereq => 
      unlockedSkillIds.includes(prereq)
    );

    if (!prerequisitesMet) {
      return Response.json({ 
        error: 'Prerequisites not met',
        required: skillDef.prerequisites
      }, { status: 400 });
    }

    // Deduct experience and unlock skill
    await base44.entities.AgentState.update(agentState.id, {
      experience: agentState.experience - skillDef.cost
    });

    const newSkill = await base44.entities.AgentSkill.create({
      agent_id,
      skill_id,
      skill_category: skillDef.category,
      skill_name: skillDef.name,
      level: 1,
      experience_invested: skillDef.cost,
      unlocked_at: new Date().toISOString(),
      effects: skillDef.effects,
      prerequisites_met: true
    });

    // Create memory for the agent
    await base44.entities.Memory.create({
      agent_id,
      content: `Unlocked new skill: ${skillDef.name}. ${skillDef.description}`,
      memory_type: 'achievement',
      importance: 7
    });

    // Notify Axi
    await base44.entities.Memory.create({
      agent_id: 'axi',
      content: `${agent.name} has unlocked the skill "${skillDef.name}" in the ${skillDef.category} branch.`,
      memory_type: 'observation',
      importance: 6
    });

    return Response.json({ 
      success: true, 
      skill: newSkill,
      experience_remaining: agentState.experience - skillDef.cost
    });

  } catch (error) {
    console.error('Error unlocking skill:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});