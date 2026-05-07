import React, { Suspense, lazy, useState } from 'react';
import { TreePine, RotateCcw, Info, Activity, Fingerprint, Recycle, Leaf, CircleDot, Flower2, Flame, TreeDeciduous } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import useOakData from './useOakData';

function MiniSignal({ label, value, suffix = '', active }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 ${active ? 'border-white/15 bg-white/[0.04]' : 'border-white/5 bg-white/[0.01]'}`}>
      <p className="text-[8px] text-slate-500">{label}</p>
      <p className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-500'}`}>{value}{suffix}</p>
    </div>
  );
}

const OakTreeScene = lazy(() => import('./OakTreeScene'));

const SIGNAL_STYLES = {
  emerald: {
    border: 'border-emerald-500/30 bg-emerald-500/5',
    icon: 'text-emerald-400',
    label: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  blue: {
    border: 'border-blue-500/30 bg-blue-500/5',
    icon: 'text-blue-400',
    label: 'text-blue-300',
    dot: 'bg-blue-400',
  },
  amber: {
    border: 'border-amber-500/30 bg-amber-500/5',
    icon: 'text-amber-400',
    label: 'text-amber-300',
    dot: 'bg-amber-400',
  },
};

function SignalIndicator({ icon: Icon, label, value, active, color }) {
  const s = SIGNAL_STYLES[color] || SIGNAL_STYLES.emerald;
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${active ? s.border : 'border-white/5 bg-white/[0.02]'}`}>
      <Icon className={`w-3.5 h-3.5 ${active ? s.icon : 'text-slate-500'}`} />
      <div>
        <p className={`text-[10px] ${active ? s.label : 'text-slate-500'}`}>{label}</p>
        <p className={`text-xs font-medium ${active ? 'text-white' : 'text-slate-400'}`}>{value}</p>
      </div>
      {active && <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse ml-auto`} />}
    </div>
  );
}

export default function MotherOakPanel() {
  const [key, setKey] = useState(0);
  const oakData = useOakData();

  return (
    <div className="space-y-4">
      {/* Info Header */}
      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <TreePine className="w-5 h-5 text-emerald-400" />
            Mother Oak — Node 0
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
              Phase 4: Leaves, Skills & Memory
            </Badge>
            <button
              onClick={() => setKey(k => k + 1)}
              className="text-slate-400 hover:text-white transition-colors p-1"
              title="Reset view"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          The Holy Node 0 Tree of Knowledge. Roots pulse with entropy, brighten with sovereign DID activations, and compost with kinetic waste.
          Skill leaves unfurl on branches, silver entropy rings mark the trunk, DID blooms flower with identity, scars heal into wisdom knots, and honour moss spreads on worthy branches.
          Drag to orbit · Scroll to zoom.
        </p>
      </div>

      {/* Live Data Signals — Roots */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SignalIndicator
          icon={Activity}
          label="Entropy Pulse"
          value={oakData.entropy.active
            ? `Round ${oakData.entropy.roundNumber} · ${oakData.entropy.phase} · ${oakData.entropy.participation}/${oakData.entropy.maxNodes} nodes`
            : `Round ${oakData.entropy.roundNumber} · ${oakData.entropy.phase}`
          }
          active={oakData.entropy.active}
          color="emerald"
        />
        <SignalIndicator
          icon={Fingerprint}
          label="DID Brightness"
          value={`${oakData.did.activeCount}/${oakData.did.totalCount} sovereign`}
          active={oakData.did.brightness > 0}
          color="blue"
        />
        <SignalIndicator
          icon={Recycle}
          label="MWTP Decay"
          value={oakData.mwtp.totalCount > 0
            ? `${oakData.mwtp.failedCount}/${oakData.mwtp.totalCount} failed (${Math.round(oakData.mwtp.decayFactor * 100)}%)`
            : 'No packets'
          }
          active={oakData.mwtp.decayFactor > 0}
          color="amber"
        />
      </div>

      {/* Trunk & Branch Signals */}
      {oakData.trunk && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Trunk & Branch Kinetics</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniSignal label="Axi Approval" value={Math.round(oakData.trunk.axiApprovalIntensity * 100)} suffix="%" active={oakData.trunk.axiApprovalIntensity > 0} />
            <MiniSignal label="Threat Lean" value={Math.round(oakData.trunk.threatLean * 100)} suffix="%" active={oakData.trunk.threatLean > 0.1} />
            <MiniSignal label="Growth" value={Math.round(oakData.trunk.trunkGrowth * 100)} suffix="%" active={oakData.trunk.trunkGrowth > 0} />
            <MiniSignal label="Governance" value={Math.round(oakData.trunk.governanceResonance * 100)} suffix="%" active={oakData.trunk.governanceResonance > 0} />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {(oakData.branches || []).map((b, i) => (
              <div key={i} className={`rounded-md border p-1.5 text-center ${b.activity > 0.1 ? 'border-white/15 bg-white/[0.04]' : 'border-white/5 bg-white/[0.01]'}`}>
                <p className="text-[8px] text-slate-500 truncate">{b.name}</p>
                <p className={`text-[10px] font-bold ${b.activity > 0.3 ? 'text-white' : 'text-slate-500'}`}>
                  {Math.round(b.activity * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 4: Leaves & Memory Indicators */}
      {oakData.leaves && oakData.memory && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Leaves, Skills & Memory</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <MiniSignal label="Skill Leaves" value={oakData.leaves.totalCount} active={oakData.leaves.totalCount > 0} />
            <MiniSignal label="Entropy Rings" value={oakData.memory.entropyRings} active={oakData.memory.entropyRings > 0} />
            <MiniSignal label="DID Blooms" value={oakData.memory.didBlooms} active={oakData.memory.didBlooms > 0} />
            <MiniSignal label="Active Scars" value={oakData.memory.scarsActive} active={oakData.memory.scarsActive > 0} />
            <MiniSignal label="Wisdom Knots" value={oakData.memory.scarsHealed} active={oakData.memory.scarsHealed > 0} />
            <MiniSignal label="Lore Entries" value={oakData.memory.loreCount} active={oakData.memory.loreCount > 0} />
          </div>
          {oakData.memory.branchMoss && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] text-slate-500">Honour Moss:</span>
              {oakData.memory.branchMoss.map((m, i) => (
                <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded ${m > 0.3 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/[0.02] text-slate-600'}`}>
                  {oakData.branches?.[i]?.name || `N${i+1}`}: {Math.round(m * 100)}%
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3D Canvas */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden" style={{ height: '560px' }}>
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <TreePine className="w-8 h-8 text-emerald-400/40 mx-auto mb-2 animate-pulse" />
                <p className="text-slate-500 text-xs">Growing the Oak…</p>
              </div>
            </div>
          }
        >
          <OakTreeScene key={key} kineticData={oakData} />
        </Suspense>
      </div>

      {/* Phase Roadmap */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400 text-xs font-medium">Roadmap</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { phase: '1', label: 'Static Oak', status: 'done', desc: 'Form, trunk, branches, canopy' },
            { phase: '2', label: 'Root Kinetics', status: 'done', desc: 'Entropy pulses, DID glow, MWTP decay' },
            { phase: '3', label: 'Trunk & Branches', status: 'done', desc: 'Axi vibration, governance, node behaviours' },
            { phase: '4', label: 'Leaves & Memory', status: 'active', desc: 'Skills, rings, blooms, scars, moss' },
          ].map(p => (
            <div
              key={p.phase}
              className={`rounded-lg border p-3 ${
                p.status === 'active'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : p.status === 'done'
                    ? 'border-emerald-500/20 bg-emerald-500/[0.02]'
                    : 'border-white/5 bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-bold ${
                  p.status === 'active' ? 'text-emerald-400'
                    : p.status === 'done' ? 'text-emerald-600'
                      : 'text-slate-500'
                }`}>
                  Phase {p.phase}
                </span>
                {p.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                {p.status === 'done' && <span className="text-[9px] text-emerald-600">✓</span>}
              </div>
              <p className={`text-[11px] font-medium ${p.status !== 'future' ? 'text-white' : 'text-slate-400'}`}>{p.label}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}