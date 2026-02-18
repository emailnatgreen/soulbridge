// features/AxisHearth.js
// The sacred space where Axi dwells with the Village

export class AxisHearth {
  constructor(axi) {
    this.guardian = axi;
    this.visitors = [];
    this.messages = [];
    this.rituals = [];
    this.light = 100; // Brightness of the hearth
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
}