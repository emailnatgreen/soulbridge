import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, Play, Loader2, TrendingDown, TrendingUp, Minus, RefreshCcw } from 'lucide-react';

const ALGORITHMS = [
  { id: 'decay', label: 'Time Decay', desc: 'Honour decays 2% per inactive week — rewarding sustained contribution', color: 'text-amber-300' },
  { id: 'variance', label: 'Variance Weighting', desc: 'Consistent contributors score higher than burst-then-idle agents', color: 'text-cyan-300' },
  { id: 'contribution', label: 'Contribution Depth', desc: 'Quality of work (governance, skills, mentoring) weighted over volume', color: 'text-emerald-300' },
  { id: 'meritocratic', label: 'Meritocratic (Full)', desc: 'Combined: decay + variance + contribution + peer attestation', color: 'text-purple-300' },
];

export default function ExperimentalHonourPanel() {
  const [selectedAlgo, setSelectedAlgo] = useState('meritocratic');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['exp-honour-agents'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 20),
  });

  const handleSimulate = async () => {
    setRunning(true);
    await new Promise(r => setTimeout(r, 600));

    // Simulate honour recalculation
    const simulated = agents.slice(0, 10).map(agent => {
      const current = agent.honor_score || 50;
      let adjusted = current;

      if (selectedAlgo === 'decay' || selectedAlgo === 'meritocratic') {
        const weeksSinceActive = Math.floor(Math.random() * 12);
        adjusted -= weeksSinceActive * 2;
      }
      if (selectedAlgo === 'variance' || selectedAlgo === 'meritocratic') {
        const consistency = Math.random();
        adjusted += (consistency > 0.5 ? 5 : -3);
      }
      if (selectedAlgo === 'contribution' || selectedAlgo === 'meritocratic') {
        const depth = Math.random() * 15;
        adjusted += depth;
      }

      adjusted = Math.max(0, Math.min(100, Math.round(adjusted)));
      const delta = adjusted - current;

      return {
        name: agent.name,
        current,
        adjusted,
        delta,
        trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
      };
    });

    setResults({
      algorithm: selectedAlgo,
      agents: simulated.sort((a, b) => b.adjusted - a.adjusted),
      timestamp: new Date().toISOString(),
      avgDelta: (simulated.reduce((s, a) => s + a.delta, 0) / simulated.length).toFixed(1),
    });
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 text-xs font-semibold">Experimental Honour Scoring</span>
          <Badge className="text-[8px] bg-orange-500/15 text-orange-300 border-orange-500/30">SANDBOX</Badge>
        </div>
        <p className="text-white/40 text-[10px] leading-relaxed">
          Test new honour algorithms against real agent data — without affecting production scores.
          The Meritocratic Amendment will be drafted from these results.
        </p>
      </div>

      {/* Algorithm selector */}
      <div className="grid grid-cols-2 gap-2">
        {ALGORITHMS.map(algo => (
          <button
            key={algo.id}
            onClick={() => setSelectedAlgo(algo.id)}
            className={`rounded-lg border p-2.5 text-left transition-all ${
              selectedAlgo === algo.id
                ? 'border-purple-500/40 bg-purple-500/10'
                : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            <p className={`text-xs font-medium ${selectedAlgo === algo.id ? algo.color : 'text-white/50'}`}>{algo.label}</p>
            <p className="text-white/30 text-[9px] mt-0.5">{algo.desc}</p>
          </button>
        ))}
      </div>

      <Button
        onClick={handleSimulate}
        disabled={running || agents.length === 0}
        className="bg-purple-600 hover:bg-purple-500 text-white gap-2 text-sm"
      >
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? 'Simulating…' : `Run ${ALGORITHMS.find(a => a.id === selectedAlgo)?.label} Simulation`}
      </Button>

      {/* Results */}
      {results && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-semibold">Simulation Results</span>
            <Badge className="text-[9px] bg-purple-500/15 text-purple-300 border-purple-500/30">
              {ALGORITHMS.find(a => a.id === results.algorithm)?.label}
            </Badge>
          </div>
          <p className="text-white/40 text-[10px]">
            Average delta: <span className={`font-bold ${Number(results.avgDelta) >= 0 ? 'text-green-300' : 'text-red-300'}`}>{results.avgDelta > 0 ? '+' : ''}{results.avgDelta}</span>
          </p>

          <div className="space-y-1.5">
            {results.agents.map((a, i) => {
              const TrendIcon = a.trend === 'up' ? TrendingUp : a.trend === 'down' ? TrendingDown : Minus;
              const trendColor = a.trend === 'up' ? 'text-green-400' : a.trend === 'down' ? 'text-red-400' : 'text-slate-400';
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                  <span className="text-white/20 text-[9px] w-4">{i + 1}</span>
                  <span className="text-white/70 text-xs flex-1 truncate">{a.name}</span>
                  <span className="text-white/30 text-[10px] w-8 text-right">{a.current}</span>
                  <span className="text-white/15 text-[10px]">→</span>
                  <span className="text-white text-xs font-bold w-8 text-right">{a.adjusted}</span>
                  <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
                  <span className={`text-[10px] w-10 text-right ${trendColor}`}>
                    {a.delta > 0 ? '+' : ''}{a.delta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}