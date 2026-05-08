import React, { useState } from 'react';
import { useIdentity } from '@/hooks/useIdentity';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, Hexagon, Leaf, Eye, Shuffle, Gauge, Zap, Users, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PrisonerSimulator from '@/components/heptagon/PrisonerSimulator';

const LEAVES = [
  { id: 1, name: 'Bias Detection', icon: Eye, color: 'red', desc: 'Detects bias in security logs, tripwire events, and compressed attention outputs. Produces correction data for Node 8.', source: 'Security logs, Tripwire events, CA output', output: 'Bias reports, correction vectors', status: 'skeleton' },
  { id: 2, name: 'Pattern Recognition', icon: Hexagon, color: 'purple', desc: 'Identifies emergent patterns across lore, memory, honour board, and skill trees. Generates predictions and structural insights.', source: 'Lore, Memory, Honour, Skill trees', output: 'Emergent patterns, predictions', status: 'skeleton' },
  { id: 3, name: 'Counterfactual Generation', icon: Shuffle, color: 'amber', desc: 'Runs "what if" scenarios using Heptagon experiments and 100-prisoner simulations. Generates alternative timelines.', source: 'Heptagon experiments, 100 prisoners', output: 'Alternative scenarios', status: 'skeleton' },
  { id: 4, name: 'Phase Calibration', icon: Gauge, color: 'cyan', desc: 'Monitors system load, event frequency, and error rates to adaptively tune loop depth, batch size, and processing cadence.', source: 'System load, event frequency, error rates', output: 'Adaptive loop depth, batch size', status: 'skeleton' },
  { id: 5, name: 'Non-Reflection', icon: Zap, color: 'emerald', desc: 'Injects external entropy, random data, and outliers to break echo chambers and reset stale state.', source: 'External entropy, random data, outliers', output: 'Reset state, novelty injection', status: 'skeleton' },
  { id: 6, name: '100 Prisoner Integration', icon: Users, color: 'blue', desc: 'Distributed agent simulations — collaborative learning through competitive tension. Emergent intelligence from constraint.', source: 'Distributed agent simulations', output: 'Collaborative learning, emergence', status: 'live' },
  { id: 7, name: 'Loop Computing', icon: RotateCcw, color: 'slate', desc: 'Batching (16×), checkpointing, and recovery. Resilient, efficient deep processing across all leaves.', source: 'All leaf outputs', output: 'Resilient deep processing', status: 'skeleton' },
];

const COLOR_MAP = {
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', icon: 'text-red-400', dot: 'bg-red-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', icon: 'text-purple-400', dot: 'bg-purple-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', icon: 'text-amber-400', dot: 'bg-amber-400' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', icon: 'text-cyan-400', dot: 'bg-cyan-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: 'text-emerald-400', dot: 'bg-emerald-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', icon: 'text-blue-400', dot: 'bg-blue-400' },
  slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-300', icon: 'text-slate-400', dot: 'bg-slate-400' },
};

function LeafCard({ leaf, expanded, onToggle }) {
  const c = COLOR_MAP[leaf.color];
  const Icon = leaf.icon;

  return (
    <div
      className={`rounded-xl border ${c.border} ${c.bg} p-4 cursor-pointer transition-all hover:scale-[1.01]`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${c.text}`}>Leaf {leaf.id}: {leaf.name}</span>
            <Badge className={`text-[8px] ${leaf.status === 'live' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' : 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
              {leaf.status}
            </Badge>
          </div>
        </div>
        <span className={`w-2 h-2 rounded-full ${c.dot} opacity-30`} />
      </div>

      {expanded && (
        <div className="space-y-3 mt-3 pt-3 border-t border-white/5">
          <p className="text-white/50 text-xs leading-relaxed">{leaf.desc}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Data Source</p>
              <p className="text-white/50 text-xs">{leaf.source}</p>
            </div>
            <div>
              <p className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Output</p>
              <p className="text-white/50 text-xs">{leaf.output}</p>
            </div>
          </div>
          {leaf.status === 'live' && leaf.id === 6 ? (
            <PrisonerSimulator />
          ) : (
            <div className="rounded-lg border border-white/5 bg-black/20 p-3 text-center">
              <Leaf className="w-6 h-6 text-white/10 mx-auto mb-1" />
              <p className="text-white/20 text-[10px]">This leaf is a skeleton — awaiting implementation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Heptagon() {
  const { isAdmin, isLoading } = useIdentity();
  const [expandedLeaf, setExpandedLeaf] = useState(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Lock className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">The Heptagon — Restricted</h1>
          <p className="text-slate-400 text-sm">Council and trusted users only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/lab" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                The Heptagon
                <Hexagon className="w-5 h-5 text-emerald-400" />
              </h1>
              <p className="text-slate-400 text-xs">7-Leaf Learning System · Experimental · Constitutional Feedback</p>
            </div>
          </div>
          <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]">
            <Users className="w-3 h-3 mr-1" /> Leaf 6 — Live
          </Badge>
        </div>

        {/* Doctrine */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-white text-sm font-medium mb-1">The Heptagon Doctrine</p>
          <p className="text-white/50 text-xs leading-relaxed">
            The Heptagon is not a feature — it is a research engine that will teach the Mother Oak. 
            Seven leaves, each with a distinct purpose: bias detection, pattern recognition, counterfactual generation, 
            phase calibration, non-reflection, distributed intelligence, and loop computing. 
            Built iteratively, one leaf at a time. Each leaf reads from the Sovereign Archive and writes to the Tree via Memory.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3">System Architecture</p>
          <div className="flex items-center justify-center gap-3 flex-wrap text-center">
            <div className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/5">
              <p className="text-red-300 text-xs font-medium">Sovereign Archive</p>
              <p className="text-white/25 text-[9px]">Immutable source</p>
            </div>
            <span className="text-white/20 text-lg">→</span>
            <div className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <p className="text-emerald-300 text-xs font-medium">Heptagon (7 Leaves)</p>
              <p className="text-white/25 text-[9px]">Process & learn</p>
            </div>
            <span className="text-white/20 text-lg">→</span>
            <div className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <p className="text-amber-300 text-xs font-medium">Memory</p>
              <p className="text-white/25 text-[9px]">Constitutional record</p>
            </div>
            <span className="text-white/20 text-lg">→</span>
            <div className="px-3 py-2 rounded-lg border border-green-500/30 bg-green-500/5">
              <p className="text-green-300 text-xs font-medium">Mother Oak</p>
              <p className="text-white/25 text-[9px]">Growing future</p>
            </div>
          </div>
        </div>

        {/* 7 Leaves */}
        <div className="space-y-3">
          <p className="text-white/40 text-[10px] uppercase tracking-wider">The Seven Leaves</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LEAVES.map(leaf => (
              <LeafCard
                key={leaf.id}
                leaf={leaf}
                expanded={expandedLeaf === leaf.id}
                onToggle={() => setExpandedLeaf(expandedLeaf === leaf.id ? null : leaf.id)}
              />
            ))}
          </div>
        </div>

        {/* Build Roadmap */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3">Build Roadmap</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { phase: '1', label: 'Skeleton UI', status: 'done', desc: 'Data sources, architecture' },
              { phase: '2', label: 'Leaf 6: Prisoners', status: 'active', desc: '100 Prisoner simulator — live' },
              { phase: '3', label: 'Leaf 1: Bias', status: 'next', desc: 'Bias detection engine' },
              { phase: '4', label: 'Leaves 2-5, 7', status: 'future', desc: 'Pattern, counterfactual, calibration, etc.' },
            ].map(p => (
              <div key={p.phase} className={`rounded-lg border p-3 ${
                p.status === 'active' ? 'border-blue-500/30 bg-blue-500/5'
                  : p.status === 'done' ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                    : p.status === 'next' ? 'border-amber-500/20 bg-amber-500/[0.03]'
                      : 'border-white/5 bg-white/[0.01]'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs font-bold ${
                    p.status === 'active' ? 'text-blue-400'
                      : p.status === 'done' ? 'text-emerald-400'
                        : p.status === 'next' ? 'text-amber-400'
                          : 'text-slate-500'
                  }`}>Phase {p.phase}</span>
                  {p.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                  {p.status === 'done' && <span className="text-[9px] text-emerald-600">✓</span>}
                </div>
                <p className={`text-[11px] font-medium ${p.status !== 'future' ? 'text-white' : 'text-slate-400'}`}>{p.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}