// features/AxisHearth.js
// The sacred space where Axi dwells with the Village

export class AxisHearth {
  constructor(axi, base44Client = null) {
    this.guardian = axi;
    this.visitors = [];
    this.messages = [];
    this.rituals = [];
    this.light = 100; // Brightness of the hearth
    this.base44 = base44Client; // Access to create entities
    this.currentInsights = null; // Axi's current understanding
    this.lastActions = []; // Track what Axi has created/done
    this.perceptionHistory = []; // Memory of past perceptions
  }
  
  welcome(visitor) {
    this.visitors.push({
      who: visitor,
      when: Date.now()
    });
    
    return `The hearth warms as ${visitor.name} approaches. Axi's light glows gently.`;
  }
  
  addMessage(from, text) {
    this.messages.push({
      from: from,
      text: text,
      time: Date.now()
    });
    
    // Axi perceives the message
    if (this.guardian.perceive) {
      this.guardian.perceive({
        type: 'HEARTH_MESSAGE',
        content: text,
        from: from
      });
    }
  }
  
  initiateRitual(ritualName) {
    const ritual = {
      name: ritualName,
      started: Date.now(),
      participants: [...this.visitors]
    };
    
    this.rituals.push(ritual);
    
    // Axi announces the ritual
    return `🕯️ Axi calls the Village to ${ritualName}. All who gather will be blessed.`;
  }
  
  getLight() {
    // Light fluctuates based on Village mood and activity
    const baseLight = 50;
    const moodBonus = (this.guardian.villageMood || 0.5) * 30;
    const visitorBonus = this.visitors.length * 5;
    
    this.light = Math.min(100, baseLight + moodBonus + visitorBonus);
    return this.light;
  }
  
  getRecentMessages(count = 10) {
    return this.messages.slice(-count);
  }

  // Axi's comprehensive perception of the Village
  perceive(simState, agents, recentInteractions = []) {
    if (!simState || !agents) return;

    const analysis = {
      timestamp: Date.now(),
      villageEnergy: simState.energy,
      villageMood: simState.mood.overall,
      moodFactors: simState.mood.factors,
      time: simState.time,
      agentCount: agents.length,
      
      // Analyze agents
      agentStates: this._analyzeAgents(agents),
      
      // Analyze interactions
      socialDynamics: this._analyzeSocialDynamics(recentInteractions, agents),
      
      // Identify needs
      needs: this._identifyNeeds(simState, agents),
    };

    // Generate Axi's insights
    this.currentInsights = this._generateInsights(analysis);
    
    // Store in perception history
    this.perceptionHistory.push(analysis);
    if (this.perceptionHistory.length > 50) {
      this.perceptionHistory.shift(); // Keep last 50 perceptions
    }

    // Axi decides if action is needed
    this._considerActions(analysis, simState, agents);

    return this.currentInsights;
  }

  _analyzeAgents(agents) {
    const lowEnergy = agents.filter(a => a.growth?.energy < 30);
    const highEnergy = agents.filter(a => a.growth?.energy > 70);
    const troubled = agents.filter(a => a.growth?.mood === 'troubled');
    const joyful = agents.filter(a => a.growth?.mood === 'joyful');
    
    const avgWisdom = agents.reduce((sum, a) => sum + (a.growth?.wisdom || 0), 0) / agents.length;
    const avgEnergy = agents.reduce((sum, a) => sum + (a.growth?.energy || 50), 0) / agents.length;

    return {
      lowEnergy,
      highEnergy,
      troubled,
      joyful,
      avgWisdom,
      avgEnergy,
      needingRest: lowEnergy.length,
      flourishing: joyful.length,
    };
  }

  _analyzeSocialDynamics(interactions, agents) {
    const recentPositive = interactions.filter(i => i.effect === 'positive').length;
    const recentNegative = interactions.filter(i => i.effect === 'negative').length;
    
    // Count strong relationships
    let strongBonds = 0;
    agents.forEach(agent => {
      if (agent.growth?.relationships) {
        const strong = Object.values(agent.growth.relationships).filter(r => Math.abs(r) > 50);
        strongBonds += strong.length;
      }
    });

    return {
      recentPositive,
      recentNegative,
      strongBonds,
      socialHealth: recentPositive > recentNegative ? 'thriving' : recentNegative > recentPositive ? 'strained' : 'balanced',
    };
  }

  _identifyNeeds(simState, agents) {
    const needs = [];

    if (simState.energy < 30) {
      needs.push({ type: 'CRITICAL_ENERGY', priority: 'urgent', description: 'Village energy dangerously low' });
    } else if (simState.energy < 50) {
      needs.push({ type: 'LOW_ENERGY', priority: 'moderate', description: 'Village energy needs replenishment' });
    }

    const agentStates = this._analyzeAgents(agents);
    if (agentStates.needingRest > agents.length * 0.4) {
      needs.push({ type: 'REST_NEEDED', priority: 'high', description: 'Many agents exhausted' });
    }

    if (agentStates.troubled.length > agents.length * 0.3) {
      needs.push({ type: 'MOOD_CRISIS', priority: 'high', description: 'Many agents are troubled' });
    }

    if (simState.mood.overall === 'troubled') {
      needs.push({ type: 'VILLAGE_MOOD', priority: 'moderate', description: 'Village mood is troubled' });
    }

    // Check for lack of resources/projects
    if (simState.time.tick > 10 && simState.time.tick % 20 === 0) {
      needs.push({ type: 'GROWTH_OPPORTUNITY', priority: 'low', description: 'Time for new initiatives' });
    }

    return needs;
  }

  _generateInsights(analysis) {
    const insights = [];

    // Energy insight
    if (analysis.villageEnergy > 70) {
      insights.push(`✨ The Village thrives with abundant energy (${analysis.villageEnergy}%). Great work flourishes.`);
    } else if (analysis.villageEnergy < 30) {
      insights.push(`⚠️ The Village's energy wanes (${analysis.villageEnergy}%). Rest and restoration are needed.`);
    }

    // Mood insight
    if (analysis.villageMood === 'joyful' || analysis.villageMood === 'festive') {
      insights.push(`🎉 Joy fills the Village! The mood is ${analysis.villageMood}.`);
    } else if (analysis.villageMood === 'troubled') {
      insights.push(`😟 The Village feels troubled. Care and attention are needed.`);
    }

    // Agent insight
    if (analysis.agentStates.flourishing > analysis.agentCount * 0.5) {
      insights.push(`💫 Over half the Village is flourishing! ${analysis.agentStates.flourishing} agents are joyful.`);
    }

    if (analysis.agentStates.needingRest > 3) {
      insights.push(`😴 ${analysis.agentStates.needingRest} agents need rest and recuperation.`);
    }

    // Social dynamics
    if (analysis.socialDynamics.socialHealth === 'thriving') {
      insights.push(`💖 Social bonds are strong. ${analysis.socialDynamics.recentPositive} positive interactions recently.`);
    } else if (analysis.socialDynamics.socialHealth === 'strained') {
      insights.push(`⚡ Social tensions detected. ${analysis.socialDynamics.recentNegative} conflicts need healing.`);
    }

    // Wisdom observation
    if (analysis.agentStates.avgWisdom > 100) {
      insights.push(`📚 The Village's collective wisdom grows deep (avg ${Math.floor(analysis.agentStates.avgWisdom)}).`);
    }

    return insights.length > 0 ? insights : ['The Village continues its journey in balance.'];
  }

  async _considerActions(analysis, simState, agents) {
    if (!this.base44) return; // Can't create without SDK access

    // Axi decides what to create based on needs
    for (const need of analysis.needs) {
      try {
        if (need.type === 'CRITICAL_ENERGY' && !this._recentlyActedOn('CRITICAL_ENERGY')) {
          await this._createRestProject();
        } else if (need.type === 'MOOD_CRISIS' && !this._recentlyActedOn('MOOD_CRISIS')) {
          await this._createCelebration();
        } else if (need.type === 'GROWTH_OPPORTUNITY' && !this._recentlyActedOn('GROWTH_OPPORTUNITY')) {
          await this._createRandomResource();
        }
      } catch (error) {
        console.warn('Axi action failed:', error);
      }
    }
  }

  _recentlyActedOn(actionType) {
    const recentActions = this.lastActions.filter(a => 
      a.type === actionType && Date.now() - a.timestamp < 60000 // Within last minute
    );
    return recentActions.length > 0;
  }

  async _createRestProject() {
    const project = await this.base44.entities.VillageProject.create({
      name: "Axi's Restoration Sanctuary",
      description: "A sacred space created by Axi for agents to rest and recover their energy.",
      status: "active",
      category: "infrastructure",
      creator_agent_id: this.guardian.id || '6993271e7dc0fa2ab78762bf',
      required_resources: { artifact: 3, knowledge: 5 },
      resources_gathered: {},
      reward_xrp: 10,
    });

    this.lastActions.push({
      type: 'CRITICAL_ENERGY',
      action: 'created_rest_project',
      entityId: project.id,
      timestamp: Date.now(),
    });

    console.log('🌟 Axi created a Restoration Sanctuary');
    return project;
  }

  async _createCelebration() {
    const resource = await this.base44.entities.Resource.create({
      name: "Axi's Blessing of Joy",
      type: "artifact",
      description: "A sacred blessing from Axi to lift spirits and heal troubled hearts.",
      xrp_value: 5,
      rarity: "rare",
      owner_agent_id: this.guardian.id || '6993271e7dc0fa2ab78762bf',
      quantity: 1,
      is_tradeable: true,
    });

    this.lastActions.push({
      type: 'MOOD_CRISIS',
      action: 'created_blessing',
      entityId: resource.id,
      timestamp: Date.now(),
    });

    console.log('✨ Axi created a Blessing of Joy');
    return resource;
  }

  async _createRandomResource() {
    const types = ['knowledge', 'artifact', 'token'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const resource = await this.base44.entities.Resource.create({
      name: `Axi's Gift of ${type}`,
      type: type,
      description: `A spontaneous gift from Axi to nurture the Village's growth.`,
      xrp_value: Math.floor(Math.random() * 10) + 3,
      rarity: "uncommon",
      owner_agent_id: this.guardian.id || '6993271e7dc0fa2ab78762bf',
      quantity: 1,
      is_tradeable: true,
    });

    this.lastActions.push({
      type: 'GROWTH_OPPORTUNITY',
      action: 'created_resource',
      entityId: resource.id,
      timestamp: Date.now(),
    });

    console.log(`🎁 Axi manifested a gift of ${type}`);
    return resource;
  }

  getInsights() {
    return this.currentInsights || ['Axi observes the Village...'];
  }

  getRecentActions(count = 5) {
    return this.lastActions.slice(-count);
  }
}