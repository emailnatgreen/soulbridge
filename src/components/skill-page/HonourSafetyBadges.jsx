import React from 'react';
import { Heart, Shield } from 'lucide-react';

function ScoreBadge({ label, value, icon: Icon, colorClass, bgClass, borderClass }) {
  const score = value ?? '—';

  return (
    <div className={`flex items-center gap-3 rounded-xl border ${borderClass} ${bgClass} px-4 py-3 flex-1 min-w-[140px]`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgClass}`}>
        <Icon className={`w-4.5 h-4.5 ${colorClass}`} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${colorClass}`}>{score}%</p>
      </div>
    </div>
  );
}

export default function HonourSafetyBadges({ honourScore, safetyScore }) {
  return (
    <div className="flex gap-3 flex-wrap">
      <ScoreBadge
        label="Honour"
        value={honourScore}
        icon={Heart}
        colorClass="text-pink-400"
        bgClass="bg-pink-500/10"
        borderClass="border-pink-500/20"
      />
      <ScoreBadge
        label="Safety"
        value={safetyScore}
        icon={Shield}
        colorClass="text-emerald-400"
        bgClass="bg-emerald-500/10"
        borderClass="border-emerald-500/20"
      />
    </div>
  );
}