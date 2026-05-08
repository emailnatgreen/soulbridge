import React, { useState } from 'react';
import { useIdentity } from '@/hooks/useIdentity';
import { Link } from 'react-router-dom';
import {
  Lock, ArrowLeft, Hexagon, Leaf, Eye, Users, Scale, ArrowRightLeft,
  Link2, Globe, Archive, Shuffle, Gauge, Zap, RotateCcw, FlaskConical
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import ExperimentalLeafCard from '@/components/experimental/ExperimentalLeafCard';
import ExperimentSnapshotButton from '@/components/experimental/ExperimentSnapshotButton';
import PrototypeArchives from '@/components/experimental/PrototypeArchives';

// Cloned leaves from production
import BiasDetectionPanel from '@/components/heptagon/BiasDetectionPanel';
import PrisonerSimulator from '@/components/heptagon/PrisonerSimulator';

// Experimental modules
import ExperimentalHonourPanel from '@/components/experimental/ExperimentalHonourPanel';
import ExperimentalPaymentsPanel from '@/components/experimental/ExperimentalPaymentsPanel';
import ExperimentalTrustlinePanel from '@/components/experimental/ExperimentalTrustlinePanel';
import ExperimentalChromeSkillsPanel from '@/components/experimental/ExperimentalChromeSkillsPanel';

const CLONED_LEAVES = [
  { id: 1, name: 'Bias Detection', icon: Eye, color: 'red', status: 'cloned', desc: 'Cloned from production. Bias detection engine tuned with experimental data.', source: 'Security logs, Tripwire events, CA output', output: 'Bias reports, correction vectors' },
  { id: 6, name: '100 Prisoner Integration', icon: Users, color: 'blue', status: 'cloned', desc: 'Cloned from production. Baseline coherence testing for the experimental lab.', source: 'Distributed agent simulations', output: 'Collaborative learning, emergence' },
];

const EXPERIMENTAL_MODULES = [
  { id: 'honour', name: 'Honour Scoring', label: 'Honour Scoring Sandbox', icon: Scale, color: 'purple', status: 'experimental', desc: 'Experimental honour algorithms — decay, variance, contribution weighting, meritocratic combination. Does not affect production scores.' },
  { id: 'payments', name: 'RLUSD Payments', label: 'Agent-to-Agent Payments', icon: ArrowRightLeft, color: 'orange', status: 'experimental', desc: 'Simulate RLUSD agent-to-agent transfers with honour-based fee modulation. Testnet sandbox — no real transfers.' },
  { id: 'trustlines', name: 'Trustlines', label: 'Honour-Based Trustlines', icon: Link2, color: 'cyan', status: 'experimental', desc: 'Dynamic trustline limits and fees based on agent honour tiers. The economic backbone of the Nobody Economy.' },
  { id: 'chrome', name: 'Chrome Skills', label: 'Chrome Skills Economics', icon: Globe, color: 'blue', status: 'experimental', desc: 'Browser-based micro-transactions for WebMCP Chrome Skills. Simulate streaming payments to widget creators.' },
];

const SKELETON_LEAVES = [
  { id: 2, name: 'Pattern Recognition', icon: Hexagon, color: 'purple', status: 'skeleton', desc: 'Identifies emergent patterns across experimental data.', source: 'Experimental data', output: 'Patterns' },
  { id: 3, name: 'Counterfactual Generation', icon: Shuffle, color: 'amber', status: 'skeleton', desc: 'What-if scenarios for experimental honour and payment models.', source: 'Experiment results', output: 'Alternative scenarios' },
  { id: 4, name: 'Phase Calibration', icon: Gauge, color: 'cyan', status: 'skeleton', desc: 'Adaptive tuning of experimental parameters.', source: 'System metrics', output: 'Parameter adjustments' },
  { id: 5, name: 'Non-Reflection', icon: Zap, color: 'emerald', status: 'skeleton', desc: 'Entropy injection to prevent experimental echo chambers.', source: 'External entropy', output: 'Novelty injection' },
  { id: 7, name: 'Loop Computing', icon: RotateCcw, color: 'slate', status: 'skeleton', desc: 'Batched experiment execution with checkpointing.', source: 'All outputs', output: 'Resilient processing' },
];

export default function ExperimentalLab() {
  const { isAdmin, isLoading } = useIdentity();
  const [expandedLeaf, setExpandedLeaf] = useState(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Lock className="w-12 h-12 text-orange-500/50 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Experimental Lab — Restricted</h1>
          <p className="text-slate-400 text-sm">Council and Governor access only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/20 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/heptagon" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                Experimental Lab
                <Hexagon className="w-5 h-5 text-orange-400" />
              </h1>
              <p className="text-slate-400 text-xs">Cloned Heptagon · Isolated · Nobody Economy Sandbox</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExperimentSnapshotButton />
            <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/30 text-[10px]">
              <FlaskConical className="w-3 h-3 mr-1" /> EXPERIMENTAL
            </Badge>
          </div>
        </div>

        {/* Doctrine */}
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
          <p className="text-white text-sm font-medium mb-1">Experimental Lab Doctrine</p>
          <p className="text-white/50 text-xs leading-relaxed">
            This is a <strong className="text-orange-300">controlled parallel</strong> of the production Heptagon — not a fork.
            Leaf 1 (Bias) and Leaf 6 (Prisoners) are cloned. Four experimental modules test the Nobody Economy:
            honour recalibration, agent-to-agent RLUSD payments, honour-based trustlines, and Chrome Skills micro-transactions.
            All experiments are archived immutably. Successful changes are promoted to production via governance.
          </p>
        </div>

        {/* Architecture */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3">Experimental Architecture</p>
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center">
            <div className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <p className="text-emerald-300 text-xs font-medium">Production Heptagon</p>
              <p className="text-white/25 text-[9px]">Cloned source</p>
            </div>
            <span className="text-white/20 text-lg">→</span>
            <div className="px-3 py-2 rounded-lg border border-orange-500/30 bg-orange-500/5">
              <p className="text-orange-300 text-xs font-medium">Experimental Lab</p>
              <p className="text-white/25 text-[9px]">Isolated sandbox</p>
            </div>
            <span className="text-white/20 text-lg">→</span>
            <div className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <p className="text-amber-300 text-xs font-medium">Prototype Archives</p>
              <p className="text-white/25 text-[9px]">Immutable record</p>
            </div>
            <span className="text-white/20 text-lg">→</span>
            <div className="px-3 py-2 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <p className="text-purple-300 text-xs font-medium">Governance Promotion</p>
              <p className="text-white/25 text-[9px]">Constitutional approval</p>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="cloned">
          <TabsList className="bg-slate-800/60 border border-white/10 flex-wrap">
            <TabsTrigger value="cloned" className="data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-300 text-slate-400 text-xs">
              <Leaf className="w-3.5 h-3.5 mr-1.5" /> Cloned Leaves
            </TabsTrigger>
            <TabsTrigger value="experimental" className="data-[state=active]:bg-orange-600/20 data-[state=active]:text-orange-300 text-slate-400 text-xs">
              <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Experimental
            </TabsTrigger>
            <TabsTrigger value="archives" className="data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-300 text-slate-400 text-xs">
              <Archive className="w-3.5 h-3.5 mr-1.5" /> Archives
            </TabsTrigger>
          </TabsList>

          {/* Cloned Leaves */}
          <TabsContent value="cloned" className="mt-4 space-y-4">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Cloned from Production</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CLONED_LEAVES.map(leaf => (
                <ExperimentalLeafCard
                  key={leaf.id}
                  leaf={leaf}
                  expanded={expandedLeaf === `cloned-${leaf.id}`}
                  onToggle={() => setExpandedLeaf(expandedLeaf === `cloned-${leaf.id}` ? null : `cloned-${leaf.id}`)}
                >
                  {leaf.id === 1 ? <BiasDetectionPanel /> : <PrisonerSimulator />}
                </ExperimentalLeafCard>
              ))}
            </div>

            <p className="text-white/30 text-[10px] uppercase tracking-wider mt-6">Skeleton Leaves (Future)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SKELETON_LEAVES.map(leaf => (
                <ExperimentalLeafCard
                  key={leaf.id}
                  leaf={leaf}
                  expanded={expandedLeaf === `skel-${leaf.id}`}
                  onToggle={() => setExpandedLeaf(expandedLeaf === `skel-${leaf.id}` ? null : `skel-${leaf.id}`)}
                />
              ))}
            </div>
          </TabsContent>

          {/* Experimental Modules */}
          <TabsContent value="experimental" className="mt-4 space-y-4">
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Nobody Economy Experiments</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXPERIMENTAL_MODULES.map(mod => (
                <ExperimentalLeafCard
                  key={mod.id}
                  leaf={mod}
                  expanded={expandedLeaf === `exp-${mod.id}`}
                  onToggle={() => setExpandedLeaf(expandedLeaf === `exp-${mod.id}` ? null : `exp-${mod.id}`)}
                >
                  {mod.id === 'honour' && <ExperimentalHonourPanel />}
                  {mod.id === 'payments' && <ExperimentalPaymentsPanel />}
                  {mod.id === 'trustlines' && <ExperimentalTrustlinePanel />}
                  {mod.id === 'chrome' && <ExperimentalChromeSkillsPanel />}
                </ExperimentalLeafCard>
              ))}
            </div>
          </TabsContent>

          {/* Prototype Archives */}
          <TabsContent value="archives" className="mt-4">
            <PrototypeArchives />
          </TabsContent>
        </Tabs>

        {/* Build Roadmap */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3">Experimental Roadmap</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { phase: '1', label: 'Clone Heptagon', status: 'done', desc: 'Leaf 1 + Leaf 6 cloned' },
              { phase: '2', label: 'Archive Snapshot', status: 'done', desc: 'Prototype Archives live' },
              { phase: '3', label: 'Isolate Lab', status: 'done', desc: 'Admin/Council only' },
              { phase: '4', label: 'Honour Scoring', status: 'active', desc: 'Experimental algorithms' },
              { phase: '5', label: 'RLUSD + Trustlines', status: 'active', desc: 'Testnet payments' },
              { phase: '6', label: 'Run Experiments', status: 'next', desc: 'Document, iterate' },
              { phase: '7', label: 'Promote to Prod', status: 'future', desc: 'Via governance' },
            ].map(p => (
              <div key={p.phase} className={`rounded-lg border p-3 ${
                p.status === 'active' ? 'border-orange-500/30 bg-orange-500/5'
                  : p.status === 'done' ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                    : p.status === 'next' ? 'border-amber-500/20 bg-amber-500/[0.03]'
                      : 'border-white/5 bg-white/[0.01]'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs font-bold ${
                    p.status === 'active' ? 'text-orange-400'
                      : p.status === 'done' ? 'text-emerald-400'
                        : p.status === 'next' ? 'text-amber-400'
                          : 'text-slate-500'
                  }`}>Phase {p.phase}</span>
                  {p.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />}
                  {p.status === 'done' && <span className="text-[9px] text-emerald-600">✓</span>}
                </div>
                <p className={`text-[11px] font-medium ${p.status !== 'future' ? 'text-white' : 'text-slate-400'}`}>{p.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-white/10 text-[10px]">Experimental Lab · Cloned Heptagon · Constitutional Sandbox · Nobody Economy</p>
          <div className="flex items-center justify-center gap-3 mt-1">
            <Link to="/heptagon" className="text-orange-400/40 hover:text-orange-300 text-[10px] transition">Production Heptagon</Link>
            <span className="text-white/10">·</span>
            <Link to="/sovereign-archive" className="text-orange-400/40 hover:text-orange-300 text-[10px] transition">Sovereign Archive</Link>
            <span className="text-white/10">·</span>
            <Link to="/lab" className="text-orange-400/40 hover:text-orange-300 text-[10px] transition">Lab</Link>
          </div>
        </div>
      </div>
    </div>
  );
}