import React from 'react';

export default function SoulIntegrityPanel({ decisions }) {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-cyan-300 mb-2">Integrity & Balance</h3>
        <p className="text-xs text-slate-500">No data yet.</p>
      </div>
    );
  }

  // Extract integrity/golden ratio stats from recent decisions
  let totalIntegrityPass = 0, totalBalanced = 0, contradictionCounts = {};
  for (const d of decisions) {
    let ctx = {};
    try { ctx = JSON.parse(d.context || '{}'); } catch {}
    if (ctx.recursive_integrity) totalIntegrityPass++;
    if (ctx.golden_ratio_delta !== undefined && ctx.golden_ratio_delta <= 20) totalBalanced++;
    for (const c of (ctx.contradictions || [])) {
      contradictionCounts[c] = (contradictionCounts[c] || 0) + 1;
    }
  }

  const total = decisions.length;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-cyan-300 mb-3">Recursive Integrity & Golden Ratio</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
          <div className={`text-lg font-bold ${totalIntegrityPass / total >= 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {Math.round((totalIntegrityPass / total) * 100)}%
          </div>
          <div className="text-xs text-slate-500">Integrity Pass Rate</div>
        </div>
        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
          <div className={`text-lg font-bold ${totalBalanced / total >= 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {Math.round((totalBalanced / total) * 100)}%
          </div>
          <div className="text-xs text-slate-500">L/R Balanced (Δ≤20)</div>
        </div>
      </div>
      {Object.keys(contradictionCounts).length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-1">Contradictions detected:</div>
          {Object.entries(contradictionCounts).sort((a, b) => b[1] - a[1]).map(([c, count]) => (
            <div key={c} className="text-xs text-red-400/80 flex justify-between">
              <span>{c}</span>
              <span className="text-red-500">{count}×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}