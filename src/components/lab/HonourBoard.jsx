import React from 'react';
import { Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function HonourRow({ agent, rank }) {
  const score = agent.honor_score ?? 100;
  // Without historical data, only flag meaningful deviations from default (100)
  const trend = score > 110 ? 'up' : score < 85 ? 'down' : 'stable';

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] text-slate-500 w-5 text-center">{rank}</span>
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-[10px] font-bold">{(agent.name || '?')[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{agent.name}</p>
        <p className="text-slate-500 text-[10px] truncate">{agent.role || 'citizen'}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
        {trend === 'stable' && <Minus className="w-3 h-3 text-slate-500" />}
        <Badge className={`text-[10px] font-mono ${
          score >= 110 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
          : score >= 100 ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
          : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
        }`}>
          {score}
        </Badge>
      </div>
    </div>
  );
}

export default function HonourBoard({ agents, loading }) {
  const sorted = [...agents]
    .filter(a => a.honor_score != null)
    .sort((a, b) => (b.honor_score ?? 0) - (a.honor_score ?? 0))
    .slice(0, 12);

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-slate-900/60 p-5">
      <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Award className="w-5 h-5 text-purple-400" /> Honour Board
      </h2>
      {loading ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-slate-500 text-sm">No agents with honour scores found.</p>
      ) : (
        <div>
          {sorted.map((agent, i) => (
            <HonourRow key={agent.id} agent={agent} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}