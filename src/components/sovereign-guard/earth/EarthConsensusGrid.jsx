import React from 'react';

const NODE_CONFIG = [
  { name: 'Source', emoji: '⚪', index: 0 },
  { name: 'Sentinel', emoji: '🔴', index: 1 },
  { name: 'Lore', emoji: '🟠', index: 2 },
  { name: 'Truth Weaver', emoji: '🟡', index: 3 },
  { name: 'Did It', emoji: '🟢', index: 4 },
  { name: 'Soulbridge', emoji: '🔵', index: 5 },
  { name: 'Human', emoji: '🟣', index: 6 },
  { name: 'Code', emoji: '⚙️', index: 7 },
  { name: 'Earth', emoji: '🌍', index: 8 },
];

export default function EarthConsensusGrid({ actions }) {
  if (!actions || actions.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-emerald-300 mb-2">9-Node Consensus Grid</h3>
        <p className="text-xs text-slate-500">No consensus data yet.</p>
      </div>
    );
  }

  // Aggregate approval rates per node across recent actions
  const nodeStats = NODE_CONFIG.map(n => ({ ...n, approves: 0, denies: 0, abstains: 0, total: 0 }));

  for (const a of actions) {
    for (const vote of (a.earth_consensus_votes || [])) {
      const node = nodeStats.find(n => n.index === vote.node_index);
      if (!node) continue;
      node.total++;
      if (vote.vote === 'APPROVE') node.approves++;
      else if (vote.vote === 'DENY') node.denies++;
      else node.abstains++;
    }
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-emerald-300">9-Node Consensus Grid</h3>
        <span className="text-xs text-slate-500">≥6/9 = CONNECTED</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {nodeStats.map((n) => {
          const rate = n.total > 0 ? Math.round((n.approves / n.total) * 100) : 0;
          const barColor = rate >= 70 ? 'bg-emerald-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div key={n.index} className="bg-slate-800/50 rounded-lg p-2 text-center">
              <div className="text-sm mb-1">{n.emoji}</div>
              <div className="text-xs text-slate-300 font-medium">{n.name}</div>
              <div className="mt-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${rate}%` }} />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{n.approves}/{n.total} ({rate}%)</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}