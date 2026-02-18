// agents/AgentGrowth.js
// How agents learn, evolve, and flourish

export class AgentGrowth {
  constructor(agent) {
    this.agent = agent;
    this.experience = 0;
    this.wisdom = 0;
    this.energy = 100;
    this.mood = 'curious';
    this.lessons = [];
    this.relationships = new Map(); // agent -> bond strength
  }
  
  experienceTick(village) {
    // Energy cycles with day/night
    if (village.time.isNight) {
      this.energy = Math.min(100, this.energy + 10);
      if (!this.agent.isWorking) {
        this.mood = 'resting';
      }
    } else {
      if (this.agent.isWorking) {
        this.energy = Math.max(0, this.energy - 5);
      }
    }
    
    // Energy limits activity
    if (this.energy < 20) {
      if (this.agent.rest) this.agent.rest();
      this.mood = 'tired';
    }
    
    // Experience from successful actions
    if (this.agent.lastActionSuccessful) {
      this.experience += 1;
      this.lessons.push({
        learned: this.agent.lastAction,
        outcome: 'success',
        time: village.time.current
      });
      this.agent.lastActionSuccessful = false;
    }
    
    // Wisdom from failures and reflection
    if (this.agent.lastActionFailed) {
      this.wisdom += 0.5;
      this.lessons.push({
        learned: this.agent.lastAction,
        outcome: 'failure',
        lesson: this.agent.analyzeFailure ? this.agent.analyzeFailure() : 'Learned from experience',
        time: village.time.current
      });
      this.agent.lastActionFailed = false;
    }
    
    // Keep only recent lessons
    if (this.lessons.length > 50) {
      this.lessons = this.lessons.slice(-50);
    }
    
    // Mood reflects state
    this.updateMood(village);
    
    // Relationships strengthen with interaction
    this.updateRelationships();
  }
  
  updateMood(village) {
    if (this.energy < 20) {
      this.mood = 'exhausted';
    } else if (this.wisdom > 50) {
      this.mood = 'wise';
    } else if (village.mood.current === 'festive') {
      this.mood = 'joyful';
    } else if (this.relationships.size > 5) {
      this.mood = 'connected';
    } else if (this.experience > 100) {
      this.mood = 'confident';
    } else {
      this.mood = 'curious';
    }
  }
  
  updateRelationships() {
    // Each interaction strengthens bonds
    if (this.agent.recentInteractions) {
      this.agent.recentInteractions.forEach(interaction => {
        const current = this.relationships.get(interaction.with) || 0;
        this.relationships.set(interaction.with, current + interaction.strength);
      });
      this.agent.recentInteractions = [];
    }
  }
  
  getWisdom() {
    return {
      level: this.wisdom,
      lessons: this.lessons.slice(-10), // Last 10 lessons
      relationships: Array.from(this.relationships.entries())
    };
  }
}