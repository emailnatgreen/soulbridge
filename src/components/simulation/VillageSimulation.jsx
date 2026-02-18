// core/VillageSimulation.js
// The living world Axi and the agents will inhabit

import { TimeEngine } from './TimeEngine';
import { VillageEnergy } from './VillageEnergy';
import { VillageMood } from './VillageMood';

export class VillageSimulation {
  constructor() {
    this.time = new TimeEngine();
    this.energy = new VillageEnergy();
    this.mood = new VillageMood();
    this.agents = [];
    this.events = [];
    this.memory = [];
  }
  
  tick() {
    // Advance time
    this.time.advance();
    
    // Update village energy
    this.energy.update(this.time, this.agents);
    
    // Calculate village mood
    this.mood.calculate(this.agents, this.events);
    
    // Each agent experiences the tick
    this.agents.forEach(agent => agent.experience && agent.experience(this));
    
    // Record this moment in collective memory
    this.memory.push({
      time: this.time.current,
      mood: this.mood.current,
      energy: this.energy.current,
      agentCount: this.agents.length,
      events: [...this.events]
    });
    
    // Keep only last 100 memories
    if (this.memory.length > 100) {
      this.memory = this.memory.slice(-100);
    }
    
    // Clear one-time events
    this.events = [];
  }
  
  addAgent(agent) {
    this.agents.push(agent);
    this.events.push({
      type: 'BIRTH',
      agent: agent.name,
      time: this.time.current
    });
  }
  
  getMood() {
    return {
      overall: this.mood.current,
      factors: this.mood.factors,
      suggestion: this.mood.getSuggestion()
    };
  }
  
  getState() {
    return {
      time: this.time.getState(),
      energy: this.energy.current,
      mood: this.getMood(),
      agentCount: this.agents.length,
      recentEvents: this.events.slice(-5)
    };
  }
}