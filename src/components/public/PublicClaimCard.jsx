import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function PublicClaimCard({ claim }) {
  const score = claim.veracity;
  const pct = typeof score === 'number' ? Math.round(score * 100) : null;
  const barWidth = pct ?? 0;
  
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400';
  const Icon = pct >= 80 ? CheckCircle : pct >= 60 ? AlertTriangle : XCircle;

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${textColor}`} />
        <p className="text-white/70 text-sm leading-relaxed flex-1">{claim.text}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${barWidth}%` }} />
        </div>
        <span className={`text-xs font-mono font-bold ${textColor}`}>{pct !== null ? `${pct}%` : '—'}</span>
        <span className="text-[9px] text-white/20">{claim.confidence}</span>
      </div>
    </div>
  );
}