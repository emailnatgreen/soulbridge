/**
 * 100 Prisoner Problem — Pointer-Following Strategy
 * 
 * 100 prisoners, 100 drawers. Each drawer contains a slip with a number 0-99.
 * Each prisoner starts at their own number and follows the chain (open the drawer
 * matching the slip found) for up to 50 steps.
 * 
 * With random arrangement: ~30% success (all prisoners find their number).
 * With pointer-following strategy: ~31% success — but this is the OPTIMAL strategy.
 * Success means NO cycle in the permutation is longer than 50.
 * 
 * This is the litmus test for emergent, leaderless collaboration.
 */

// Generate a random permutation of [0..n-1]
function shufflePermutation(n, entropy) {
  const arr = Array.from({ length: n }, (_, i) => i);
  // Fisher-Yates with optional entropy seed
  let seed = entropy || Date.now();
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (seed >>> 0) / 0xFFFFFFFF;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Analyze the cycle structure of a permutation
function analyzeCycles(drawers) {
  const n = drawers.length;
  const visited = new Array(n).fill(false);
  const cycles = [];
  
  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    const cycle = [];
    let current = i;
    while (!visited[current]) {
      visited[current] = true;
      cycle.push(current);
      current = drawers[current];
    }
    cycles.push(cycle);
  }
  return cycles;
}

// Run a single prisoner's search
function runPrisoner(prisonerNumber, drawers, maxSteps) {
  const steps = [];
  let current = prisonerNumber;
  let found = false;
  
  for (let step = 0; step < maxSteps; step++) {
    const slip = drawers[current];
    steps.push({ drawer: current, slip, step });
    if (slip === prisonerNumber) {
      found = true;
      break;
    }
    current = slip;
  }
  
  return { prisonerNumber, found, steps, stepsUsed: steps.length };
}

// Run the full simulation
export function runSimulation(config = {}) {
  const {
    prisonerCount = 100,
    maxSteps = 50,
    entropy = null,
  } = config;

  const startTime = performance.now();
  
  // Setup phase — create drawers
  const drawers = shufflePermutation(prisonerCount, entropy);
  const setupTime = performance.now();
  
  // Analyze cycle structure (this determines success before running)
  const cycles = analyzeCycles(drawers);
  const longestCycle = Math.max(...cycles.map(c => c.length));
  const willSucceed = longestCycle <= maxSteps;
  
  // Cycle phase — each prisoner follows their chain
  const results = [];
  for (let i = 0; i < prisonerCount; i++) {
    results.push(runPrisoner(i, drawers, maxSteps));
  }
  
  const cycleTime = performance.now();
  
  const successCount = results.filter(r => r.found).length;
  const totalSteps = results.reduce((s, r) => s + r.stepsUsed, 0);
  const avgSteps = totalSteps / prisonerCount;
  const maxStepsUsed = Math.max(...results.map(r => r.stepsUsed));
  
  const endTime = performance.now();

  return {
    // Core result
    success: successCount === prisonerCount,
    successCount,
    prisonerCount,
    
    // Cycle analysis
    cycles: cycles.map(c => ({ length: c.length, members: c })),
    cycleCount: cycles.length,
    longestCycle,
    
    // Performance
    setupTimeMs: setupTime - startTime,
    cycleTimeMs: cycleTime - setupTime,
    totalTimeMs: endTime - startTime,
    
    // Stats
    avgSteps: Math.round(avgSteps * 100) / 100,
    maxStepsUsed,
    totalSteps,
    
    // Raw data
    drawers,
    prisonerResults: results,
    
    // Metadata
    maxAllowedSteps: maxSteps,
    entropy: entropy || 'system',
    timestamp: new Date().toISOString(),
  };
}

// Run a batch of simulations for statistical analysis
export function runBatch(batchSize = 16, config = {}) {
  const batchStart = performance.now();
  const results = [];
  
  for (let i = 0; i < batchSize; i++) {
    const result = runSimulation({
      ...config,
      entropy: (config.entropy || Date.now()) + i * 7919, // prime offset per run
    });
    results.push(result);
  }
  
  const batchEnd = performance.now();
  const successes = results.filter(r => r.success).length;
  
  return {
    batchSize,
    successes,
    failures: batchSize - successes,
    successRate: Math.round((successes / batchSize) * 10000) / 100,
    avgTimeMs: Math.round((batchEnd - batchStart) / batchSize * 100) / 100,
    totalTimeMs: Math.round((batchEnd - batchStart) * 100) / 100,
    avgLongestCycle: Math.round(results.reduce((s, r) => s + r.longestCycle, 0) / batchSize * 10) / 10,
    avgCycleCount: Math.round(results.reduce((s, r) => s + r.cycleCount, 0) / batchSize * 10) / 10,
    runs: results,
    timestamp: new Date().toISOString(),
  };
}