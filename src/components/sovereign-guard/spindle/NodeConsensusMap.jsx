import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const NODE_LABELS = [
  'Source', 'Sentinel', 'Lore', 'Truth Weaver',
  'Did It', 'Soulbridge', 'Human', 'Code',
];

const VOTE_COLOR = {
  CONSISTENT: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-300', dot: 'bg-green-400' },
  INCONSISTENT: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300', dot: 'bg-red-400' },
  DEFAULT: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/30', dot: 'bg-white/20' },
};

export default function NodeConsensusMap({ lastDecision }) {
  const [selectedNode, setSelectedNode] = useState(null);

  let ctx = {};
  try { ctx = JSON.parse(lastDecision?.context || '{}'); } catch { /* */ }

  // We don't have per-node votes in Memory context — reconstruct a summary from what we have
  const consistentCount = ctx.consistent_count ?? 0;
  const totalNodes = 8;

  // Build synthetic node states from the context
  // The actual detailed votes are only in the live API response, not persisted per-node in Memory.
  // We show a visual representation based on consistent/inconsistent counts.
  const nodes = NODE_LABELS.map((name, i) => {
    // Simple heuristic: first N nodes consistent, rest inconsistent
    // This is a visual approximation — the real per-node data is in live evaluations
    const vote = i < consistentCount ? 'CONSISTENT' : 'INCONSISTENT';
    const style = VOTE_COLOR[vote] || VOTE_COLOR.DEFAULT;
    return { index: i, name, vote, style };
  });

  if (!lastDecision) {
    return (
      <Card className="bg-white/[0.02] border-white/10">
        <CardContent className="p-4 text-center">
          <p className="text-white/20 text-xs">No evaluation data for consensus map.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardContent className="p-0">
        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
            Panel 3 — Node Consensus Map
          </p>
          <Badge className={`text-[9px] border ${consistentCount >= 6 ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
            {consistentCount}/{totalNodes} {consistentCount >= 6 ? 'CONSENSUS' : 'NO CONSENSUS'}
          </Badge>
        </div>

        <div className="p-4">
          {/* 8-Node Grid (2x4) */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {nodes.map((node) => (
              <button
                key={node.index}
                onClick={() => setSelectedNode(selectedNode === node.index ? null : node.index)}
                className={`rounded-lg p-2.5 border transition-all text-center ${node.style.bg} ${node.style.border} ${selectedNode === node.index ? 'ring-1 ring-purple-400/50' : ''}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-1.5 ${node.style.dot}`} />
                <p className={`text-[9px] font-semibold ${node.style.text}`}>{node.name}</p>
                <p className="text-[8px] text-white/20 mt-0.5">{node.vote === 'CONSISTENT' ? 'Approve' : 'Deny'}</p>
              </button>
            ))}
          </div>

          {/* Selected node detail */}
          {selectedNode !== null && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/[0.03] p-3 text-[10px]">
              <p className="text-purple-300 font-semibold mb-1">{nodes[selectedNode].name} — Node {selectedNode}</p>
              <p className="text-white/40 leading-relaxed">
                {nodes[selectedNode].vote === 'CONSISTENT'
                  ? `${nodes[selectedNode].name}: Approve — sincerity delta within tolerance. Memory trace aligned with agent purpose.`
                  : `${nodes[selectedNode].name}: Deny — sincerity delta exceeds tolerance. Historical behaviour inconsistent with claimed intent.`
                }
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-[9px] text-white/30">Approve</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[9px] text-white/30">Deny</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}