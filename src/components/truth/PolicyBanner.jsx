import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldOff } from 'lucide-react';

const CONFIG = {
  allow: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'VERIFIED' },
  flag: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'FLAGGED' },
  block: { icon: ShieldOff, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: 'BLOCKED' },
};

export default function PolicyBanner({ policy }) {
  if (!policy) return null;
  const c = CONFIG[policy.decision] || CONFIG.flag;
  const Icon = c.icon;
  const pct = typeof policy.overall_veracity === 'number' ? Math.round(policy.overall_veracity * 100) : '?';

  return (
    <div className={`rounded-lg border ${c.bg} p-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${c.color}`} />
        <div>
          <p className={`text-xs font-bold ${c.color}`}>{c.label}</p>
          <p className="text-white/40 text-[10px]">{policy.reason}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold font-mono ${c.color}`}>{pct}%</p>
        <p className="text-white/30 text-[9px]">Overall Veracity</p>
      </div>
    </div>
  );
}