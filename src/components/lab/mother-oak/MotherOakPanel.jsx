import React, { Suspense, lazy } from 'react';
import { TreePine, RotateCcw, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const OakTreeScene = lazy(() => import('./OakTreeScene'));

export default function MotherOakPanel() {
  const [key, setKey] = React.useState(0);

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
              Phase 1: Static Oak
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
          The Holy Node 0 Tree of Knowledge. Procedural oak — trunk, branches, roots, and canopy.
          Drag to orbit · Scroll to zoom. Phase 2 will add kinetic data bindings.
        </p>
      </div>

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
          <OakTreeScene key={key} />
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
            { phase: '1', label: 'Static Oak', status: 'active', desc: 'Form, trunk, branches, canopy' },
            { phase: '2', label: 'Kinetics', status: 'next', desc: 'Roots pulse, entropy glow, DID rings' },
            { phase: '3', label: 'Memory', status: 'future', desc: 'Blooms, scars, moss, whispers' },
            { phase: '4', label: 'Public', status: 'future', desc: 'Landing page, extension' },
          ].map(p => (
            <div
              key={p.phase}
              className={`rounded-lg border p-3 ${
                p.status === 'active'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-white/5 bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs font-bold ${p.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  Phase {p.phase}
                </span>
                {p.status === 'active' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <p className={`text-[11px] font-medium ${p.status === 'active' ? 'text-white' : 'text-slate-400'}`}>{p.label}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}