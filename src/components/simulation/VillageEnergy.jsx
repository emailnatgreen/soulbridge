// Village collective energy

export class VillageEnergy {
  constructor() {
    this.current = 100;
  }
  
  update(time, agents) {
    // Base energy from time of day
    const baseEnergy = time.isNight ? 60 : 100;
    
    // Agent contribution
    const agentEnergy = agents.reduce((sum, agent) => {
      const agentContribution = agent.growth?.energy || 50;
      return sum + agentContribution;
    }, 0);
    
    const avgAgentEnergy = agents.length > 0 ? agentEnergy / agents.length : 50;
    
    // Blend factors
    this.current = Math.floor((baseEnergy * 0.3) + (avgAgentEnergy * 0.7));
    this.current = Math.max(0, Math.min(100, this.current));
  }
}