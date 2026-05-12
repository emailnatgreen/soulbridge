import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const CONFIG = {
  allow: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'VERIFIED' },
  flag: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'FLAGGED' },
  block: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'BLOCKED' },
};

export default function PublicPolicyBanner({ policy, veracitySummary }) {
  if (!policy) return null;
  const c = CONFIG[policy.decision] || CONFIG.flag;
  const Icon = c.icon;
  const avg = veracitySummary?.avg_score;
  const pct = typeof avg === 'number' ? Math.round(avg * 100) : '?';

  return (
    <div className={`rounded-lg border ${c.bg} p-3 flex items-center justify-between`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${c.color}`} />
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${c.color}`}>{c.label}</span>
            {policy.ruleset && <span className="text-[8px] text-white/20 font-mono">{policy.ruleset}</span>}
          </div>
          {policy.reason && <p className="text-white/30 text-[10px] mt-0.5">{policy.reason}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold font-mono ${c.color}`}>{pct}%</p>
        <p className="text-white/20 text-[9px]">Veracity</p>
      </div>
    </div>
  );
}