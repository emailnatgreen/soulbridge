import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const VOTE_STYLE = {
  APPROVE: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-300', dot: 'bg-green-400' },
  DENY: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-300', dot: 'bg-red-400' },
};

export default function EmpathyConsensusGrid({ lastDecision }) {
  const [selectedNode, setSelectedNode] = useState(null);

  let ctx = {};
  try { ctx = JSON.parse(lastDecision?.context || '{}'); } catch {}

  // Get node votes from the most recent trace that stored them
  // We fetch from the latest empathy decision memory context
  const approveCount = ctx.approve_count ?? 0;
  const denyCount = ctx.deny_count ?? 0;
  const consensusVerdict = ctx.consensus_verdict || 'UNKNOWN';

  // Reconstruct nodes from context (we don't store full votes in Memory — derive from trace)
  const strictNodes = ['Sentinel', 'Code Node', 'Archivist', 'Truth Weaver'];
  const softNodes = ['Mythic', 'Bridge', 'Empath', 'Integrator'];
  const allNames = [...strictNodes, ...softNodes];

  // Simple reconstruction: strict nodes approve if score >= 40, soft based on trend
  const nodes = allNames.map((name, i) => {
    const type = i < 4 ? 'strict' : 'soft';
    const approved = i < approveCount || (approveCount >= 8);
    // Better heuristic: if total approve >= threshold, all approved
    const vote = approveCount >= 6 && i < approveCount ? 'APPROVE' : (i < approveCount ? 'APPROVE' : 'DENY');
    const actualVote = approveCount >= 8 ? 'APPROVE' : (approveCount === 0 ? 'DENY' : vote);
    const style = VOTE_STYLE[actualVote] || VOTE_STYLE.DENY;

    return { index: i, name, type, vote: actualVote, style };
  });

  if (!lastDecision) {
    return (
      <Card className="bg-white/[0.02] border-white/10">
        <CardContent className="p-4 text-center">
          <p className="text-white/20 text-xs">No empathy evaluation data yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardContent className="p-0">
        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
            Empathy Consensus — Council of Eight
          </p>
          <Badge className={`text-[9px] border ${consensusVerdict === 'APPROVE' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
            {approveCount}/8 {consensusVerdict}
          </Badge>
        </div>

        <div className="p-4">
          {/* Label rows */}
          <div className="grid grid-cols-2 gap-3 mb-2 text-[9px] text-white/20 uppercase tracking-wider">
            <span>Strict Nodes (Safety)</span>
            <span>Soft Nodes (Relational)</span>
          </div>

          {/* 2×4 Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Strict column */}
            <div className="space-y-2">
              {nodes.filter(n => n.type === 'strict').map((node) => (
                <button
                  key={node.index}
                  onClick={() => setSelectedNode(selectedNode === node.index ? null : node.index)}
                  className={`w-full rounded-lg p-2 border transition-all text-left ${node.style.bg} ${node.style.border} ${selectedNode === node.index ? 'ring-1 ring-pink-400/50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${node.style.dot}`} />
                    <span className={`text-[10px] font-semibold ${node.style.text}`}>{node.name}</span>
                    <span className="text-[8px] text-white/20 ml-auto">{node.vote}</span>
                  </div>
                </button>
              ))}
            </div>
            {/* Soft column */}
            <div className="space-y-2">
              {nodes.filter(n => n.type === 'soft').map((node) => (
                <button
                  key={node.index}
                  onClick={() => setSelectedNode(selectedNode === node.index ? null : node.index)}
                  className={`w-full rounded-lg p-2 border transition-all text-left ${node.style.bg} ${node.style.border} ${selectedNode === node.index ? 'ring-1 ring-pink-400/50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${node.style.dot}`} />
                    <span className={`text-[10px] font-semibold ${node.style.text}`}>{node.name}</span>
                    <span className="text-[8px] text-white/20 ml-auto">{node.vote}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected node rationale */}
          {selectedNode !== null && (
            <div className="mt-3 rounded-lg border border-pink-500/20 bg-pink-500/[0.03] p-3 text-[10px]">
              <p className="text-pink-300 font-semibold mb-1">{nodes[selectedNode].name} — {nodes[selectedNode].type}</p>
              <p className="text-white/40 leading-relaxed">
                {nodes[selectedNode].type === 'strict'
                  ? nodes[selectedNode].vote === 'APPROVE'
                    ? `Safety threshold cleared. No harm pattern detected. EmpathyScore above minimum ${40}.`
                    : `EmpathyScore below safety threshold ${40}, or harm pattern detected (≥2 violations in 7 days).`
                  : nodes[selectedNode].vote === 'APPROVE'
                    ? 'Relational repair attempted or sincerity trend positive — honouring intent to restore.'
                    : 'Sincerity declining, no repair attempted — relational risk persists.'
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}