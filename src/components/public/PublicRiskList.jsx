import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function PublicRiskList({ risks }) {
  if (!risks || risks.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <p className="text-emerald-300/70 text-xs">No risks identified in this report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {risks.map((risk, i) => (
        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-white/50 text-xs leading-relaxed">{risk}</p>
        </div>
      ))}
    </div>
  );
}