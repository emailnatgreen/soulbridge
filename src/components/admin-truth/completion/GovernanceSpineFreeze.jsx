import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Lock, Fingerprint, Microscope, Layers, Shield, Scale, Eye, Database, CheckCircle2
} from 'lucide-react';

const SPINE_MODULES = [
  { layer: 0, name: 'Sovereign Identity', version: 'v1.0.0', icon: Fingerprint, color: 'text-violet-300', status: 'PASS' },
  { layer: 1, name: 'Truth Engine', version: 'v2.6.0', icon: Microscope, color: 'text-cyan-300', status: 'PASS' },
  { layer: 2, name: 'Build Order Engine', version: 'v1.0.0', icon: Layers, color: 'text-amber-300', status: 'PASS' },
  { layer: 3, name: 'Phase-1 Gate', version: 'v1.0.0', icon: Shield, color: 'text-red-300', status: 'PASS' },
  { layer: 4, name: 'Exposure Readiness Engine', version: 'v1.0.0', icon: Scale, color: 'text-emerald-300', status: 'PASS' },
  { layer: 5, name: 'Visibility Governance', version: 'v1.0.0', icon: Eye, color: 'text-cyan-300', status: 'PASS' },
  { layer: 6, name: 'Memory Intelligence', version: 'v1.0.0', icon: Database, color: 'text-pink-300', status: 'PASS' },
];

export default function GovernanceSpineFreeze() {
  const allLocked = SPINE_MODULES.every(m => m.status === 'PASS');

  return (
    <Card className="bg-slate-900/80 border-slate-700/60">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-300" />
          <span className="text-amber-300">Phase 4 — Governance Spine Freeze</span>
          <Badge className={`text-[8px] ml-auto ${allLocked ? 'bg-amber-600/25 text-amber-200 border-amber-500/40' : 'bg-red-600/25 text-red-200 border-red-500/40'}`}>
            {allLocked ? 'FROZEN' : 'UNLOCKED'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        <p className="text-slate-400 text-[10px]">
          All seven governance layers version-locked for deterministic reproducibility. No modifications without governance proposal.
        </p>

        <div className="rounded-lg border border-slate-700/50 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-slate-800/60 text-[9px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-700/50">
            <span className="col-span-1">Layer</span>
            <span className="col-span-5">Module</span>
            <span className="col-span-3">Version</span>
            <span className="col-span-3 text-right">Status</span>
          </div>
          {/* Table rows */}
          {SPINE_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div key={mod.layer} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-700/30 last:border-0 items-center text-[10px]">
                <span className="col-span-1 text-slate-500 font-mono">{mod.layer}</span>
                <span className="col-span-5 flex items-center gap-1.5">
                  <Icon className={`w-3 h-3 ${mod.color}`} />
                  <span className={mod.color}>{mod.name}</span>
                </span>
                <span className="col-span-3">
                  <Badge className="text-[8px] bg-slate-800 text-slate-300 border-slate-600">{mod.version}</Badge>
                </span>
                <span className="col-span-3 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">{mod.status}</span>
                  <Lock className="w-2.5 h-2.5 text-amber-400 ml-1" />
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-1 text-[9px]">
          <Lock className="w-3 h-3 text-amber-400" />
          <span className="text-amber-300 font-medium">7/7 layers version-locked — spine frozen for reproducibility</span>
        </div>
      </CardContent>
    </Card>
  );
}