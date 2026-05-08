import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function CycleAnalysis({ cycles, maxSteps }) {
  if (!cycles || cycles.length === 0) return null;

  const sorted = [...cycles].sort((a, b) => b.length - a.length);
  const longest = sorted[0]?.length || 0;
  const broken = longest > maxSteps;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-[10px] uppercase tracking-wider">Cycle Structure — {cycles.length} cycles</p>
        <Badge className={`text-[9px] ${broken ? 'bg-red-500/15 text-red-300 border-red-500/30' : 'bg-green-500/15 text-green-300 border-green-500/30'}`}>
          Longest: {longest} {broken ? '(BROKEN)' : '(OK)'}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((cycle, i) => {
          const pct = cycle.length / 100;
          const isBad = cycle.length > maxSteps;
          return (
            <div
              key={i}
              className={`rounded-md border px-2 py-1 ${
                isBad ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'
              }`}
              title={`Cycle ${i + 1}: ${cycle.members.slice(0, 10).join(' → ')}${cycle.length > 10 ? '...' : ''}`}
            >
              <span className={`text-[10px] font-mono font-bold ${isBad ? 'text-red-300' : 'text-white/60'}`}>
                {cycle.length}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-white/20 text-[9px]">
        Each number is a cycle length. All must be ≤{maxSteps} for coherence. 
        Hover for cycle members.
      </p>
    </div>
  );
}