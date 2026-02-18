// Time management for the village

export class TimeEngine {
  constructor() {
    this.current = 0;
    this.season = 'Spring';
    this.seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    this.dayNightCycle = 0; // 0-24
  }
  
  advance() {
    this.current++;
    this.dayNightCycle = (this.dayNightCycle + 1) % 24;
    
    // Change season every 100 ticks
    if (this.current % 100 === 0) {
      this.advanceSeason();
    }
  }
  
  advanceSeason() {
    const currentIndex = this.seasons.indexOf(this.season);
    this.season = this.seasons[(currentIndex + 1) % this.seasons.length];
  }
  
  get isNight() {
    return this.dayNightCycle >= 18 || this.dayNightCycle < 6;
  }
  
  get isDay() {
    return !this.isNight;
  }
  
  getState() {
    return {
      tick: this.current,
      season: this.season,
      hour: this.dayNightCycle,
      isNight: this.isNight,
      phase: this.isNight ? '🌙 Night' : '☀️ Day'
    };
  }
}