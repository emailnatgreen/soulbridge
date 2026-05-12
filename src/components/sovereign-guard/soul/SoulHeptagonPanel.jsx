import React from 'react';

const PILLAR_COLORS = {
  Soul: 'bg-indigo-500', Honour: 'bg-amber-500', Governance: 'bg-blue-500',
  Sincerity: 'bg-emerald-500', Empathy: 'bg-pink-500', Exchange: 'bg-cyan-500', Legacy: 'bg-purple-500',
};

export default function SoulHeptagonPanel({ resonanceHistory }) {
  if (!resonanceHistory || resonanceHistory.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-indigo-300 mb-2">Heptagon Resonance</h3>
        <p className="text-xs text-slate-500">No resonance data yet. Run Soul Cycle evaluations to generate data.</p>
      </div>
    );
  }

  // Show latest resonance breakdown from most recent decision
  const latest = resonanceHistory[0];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-indigo-300">Heptagon Resonance</h3>
        <span className={`text-lg font-bold ${latest.resonance >= 70 ? 'text-emerald-400' : latest.resonance >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
          {latest.resonance}
        </span>
      </div>
      <div className="text-xs text-slate-500 mb-3">
        {latest.resonance >= 70 ? '🌿 Activated — Soul Overlayer resonant' : '⚠️ Below threshold (70) — Soul constraining'}
      </div>
      <div className="space-y-1.5">
        {resonanceHistory.slice(0, 8).map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 w-20 truncate">{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className={`h-full rounded-full ${r.resonance >= 70 ? 'bg-emerald-500' : r.resonance >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.resonance}%` }} />
            </div>
            <span className="text-slate-400 w-8 text-right">{r.resonance}</span>
          </div>
        ))}
      </div>
    </div>
  );
}