import React from 'react';
import { Check, X, AlertTriangle, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, iconColor, bgColor }) {
  return (
    <div className={`rounded-lg border border-white/10 ${bgColor || 'bg-white/[0.02]'} p-3`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-white/40 text-[10px]">{label}</span>
      </div>
      <p className="text-white text-lg font-bold mt-1">{value}</p>
      {sub && <p className="text-white/30 text-[9px] mt-0.5">{sub}</p>}
    </div>
  );
}

const TREND_ICONS = {
  rising: TrendingUp,
  falling: TrendingDown,
  stable: Minus,
};

export default function MonkeyStatsGrid({ trends }) {
  if (!trends) return null;

  const RelTrendIcon = TREND_ICONS[trends.relevance_trend || 'stable'];
  const AlTrendIcon = TREND_ICONS[trends.alignment_trend || 'stable'];
  const CoTrendIcon = TREND_ICONS[trends.co_evolution_trend || 'stable'];

  const vb = trends.verdict_breakdown || {};

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <StatCard icon={Activity} label="Total Events" value={trends.total_events || 0} iconColor="text-cyan-400" />
      <StatCard icon={Check} label="Passed" value={vb.pass || 0} iconColor="text-emerald-400" bgColor="bg-emerald-500/5" />
      <StatCard icon={X} label="Blocked" value={vb.block || 0} iconColor="text-red-400" bgColor="bg-red-500/5" />
      <StatCard icon={AlertTriangle} label="Quarantined" value={vb.quarantine || 0} iconColor="text-amber-400" bgColor="bg-amber-500/5" />
      <StatCard
        icon={RelTrendIcon}
        label="Avg Relevance"
        value={trends.global_rolling_relevance ?? 0}
        sub={`Trend: ${trends.relevance_trend || 'stable'}`}
        iconColor="text-cyan-400"
      />
      <StatCard
        icon={AlTrendIcon}
        label="Avg Alignment"
        value={trends.global_rolling_alignment ?? 0}
        sub={`Trend: ${trends.alignment_trend || 'stable'}`}
        iconColor="text-purple-400"
      />
      <StatCard
        icon={CoTrendIcon}
        label="Avg Co-Evolution"
        value={trends.global_rolling_co_evolution ?? 0}
        sub={`Trend: ${trends.co_evolution_trend || 'stable'}`}
        iconColor="text-emerald-400"
      />
      <StatCard
        icon={Activity}
        label="Pending"
        value={vb.pending || 0}
        iconColor="text-slate-400"
      />
    </div>
  );
}