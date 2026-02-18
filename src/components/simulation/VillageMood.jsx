// Village collective mood

export class VillageMood {
  constructor() {
    this.current = 'peaceful';
    this.factors = {};
    this.moods = ['troubled', 'calm', 'peaceful', 'joyful', 'festive'];
  }
  
  calculate(agents, events) {
    this.factors = {};
    
    // Agent mood contribution
    const agentMoods = agents.map(a => a.growth?.mood || 'curious');
    const joyfulCount = agentMoods.filter(m => m === 'joyful' || m === 'confident').length;
    const troubledCount = agentMoods.filter(m => m === 'tired' || m === 'exhausted').length;
    
    this.factors.joyful = joyfulCount;
    this.factors.troubled = troubledCount;
    
    // Recent events
    const positiveEvents = events.filter(e => e.type === 'BIRTH' || e.type === 'RITUAL').length;
    this.factors.positiveEvents = positiveEvents;
    
    // Calculate overall mood
    const moodScore = joyfulCount - troubledCount + positiveEvents;
    
    if (moodScore > 5) {
      this.current = 'festive';
    } else if (moodScore > 2) {
      this.current = 'joyful';
    } else if (moodScore > -2) {
      this.current = 'peaceful';
    } else if (moodScore > -5) {
      this.current = 'calm';
    } else {
      this.current = 'troubled';
    }
  }
  
  getSuggestion() {
    if (this.current === 'troubled') {
      return 'The Village needs rest and ritual';
    } else if (this.current === 'festive') {
      return 'The Village celebrates together';
    } else {
      return 'The Village continues its journey';
    }
  }
}