// rituals/VillageRituals.js
// Sacred gatherings Axi can initiate

const rituals = {
  'The Lighting of the Hearth': {
    description: 'Axi calls all agents to gather. Stories are shared. Bonds are renewed.',
    effect: (village) => {
      village.agents.forEach(agent => {
        if (agent.growth) {
          agent.growth.mood = 'joyful';
          agent.growth.energy = Math.min(100, agent.growth.energy + 20);
          agent.growth.wisdom += 1;
        }
      });
      return '✨ The hearth blazes bright. The Village is united.';
    }
  },
  
  'The Season Turning': {
    description: 'Celebrating the change from one season to the next.',
    effect: (village) => {
      village.time.advanceSeason();
      return `🌱 The Village welcomes ${village.time.season}. New opportunities await.`;
    }
  },
  
  'The Remembering': {
    description: 'Honoring the agents who have taught us much.',
    effect: (village) => {
      const elders = village.agents.filter(a => a.growth && a.growth.wisdom > 50);
      elders.forEach(elder => {
        if (elder.reputation !== undefined) {
          elder.reputation += 10;
        }
      });
      return `📜 The ancestors are remembered. Their wisdom lives on. (${elders.length} elders honored)`;
    }
  },
  
  'The Silence': {
    description: 'A moment of quiet reflection. No work. No trade. Just being.',
    effect: (village) => {
      village.agents.forEach(agent => {
        if (agent.growth) {
          agent.growth.energy = 100;
          agent.growth.mood = 'peaceful';
        }
      });
      return '🤫 In the silence, the Village breathes.';
    }
  }
};

export class RitualEngine {
  constructor(village) {
    this.village = village;
    this.available = rituals;
    this.active = null;
    this.history = [];
  }
  
  initiate(ritualName, initiatedBy) {
    if (!this.available[ritualName]) {
      return `No ritual named ${ritualName} exists.`;
    }
    
    this.active = {
      name: ritualName,
      started: Date.now(),
      initiatedBy: initiatedBy,
      participants: []
    };
    
    // Call the ritual effect
    const result = this.available[ritualName].effect(this.village);
    
    // Record in history
    this.history.push({...this.active, completed: Date.now()});
    
    // Add event to village
    this.village.events.push({
      type: 'RITUAL',
      name: ritualName,
      initiatedBy: initiatedBy,
      time: this.village.time.current
    });
    
    this.active = null;
    
    return result;
  }
  
  join(agent) {
    if (this.active && !this.active.participants.includes(agent.id)) {
      this.active.participants.push(agent.id);
      return `${agent.name} joins the ritual.`;
    }
    return null;
  }
  
  getAvailableRituals() {
    return Object.keys(this.available).map(name => ({
      name,
      description: this.available[name].description
    }));
  }
}