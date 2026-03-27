import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, TrendingUp, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const KU_COLORS = {
  did_publication: '#a78bfa',
  governance_vote: '#60a5fa',
  task_completion: '#34d399',
  mentorship_session: '#f59e0b',
  knowledge_contribution: '#fb923c',
  skill_development: '#e879f9',
  economic_exchange: '#2dd4bf',
  collaborative_action: '#f87171',
  agent_message: '#94a3b8',
  resource_trade: '#86efac',
};

/**
 * AgentKUProfile — shows an agent's personal Kinetic Unit score and contribution breakdown.
 * Designed to be embedded in AgentProfile, AgentCard, or any agent-facing view.
 * Props: agentId (string)
 */
export default function AgentKUProfile({ agentId }) {
  const { data: kus = [], isLoading } = useQuery({
    queryKey: ['agent-kus', agentId],
    queryFn: () => base44.entities.KineticUnit.filter({ agent_id: agentId }, '-created_date', 200),
    enabled: !!agentId,
    staleTime: 30000,
  });

  const { data: perfList = [] } = useQuery({
    queryKey: ['agent-perf', agentId],
    queryFn: () => base44.entities.AgentPerformanceMetrics.filter({ agent_id: agentId }, '-created_date', 1),
    enabled: !!agentId,
    staleTime: 30000,
  });

  const perf = perfList[0] || null;
  const totalWeighted = kus.reduce((s, k) => s + (k.weighted_score || 1), 0);

  const typeBreakdown = Object.entries(
    kus.reduce((acc, ku) => {
      acc[ku.ku_type] = (acc[ku.ku_type] || 0) + (ku.weighted_score || 1);
      return acc;
    }, {})
  ).map(([type, value]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: +value.toFixed(2),
    color: KU_COLORS[type] || '#64748b',
  })).sort((a, b) => b.value - a.value);

  const trendColor = perf?.performance_trend === 'rising' ? 'text-green-400'
    : perf?.performance_trend === 'falling' ? 'text-red-400' : 'text-amber-400';

  if (isLoading) {
    return <div className="h-20 bg-white/5 rounded-xl animate-pulse" />;
  }

  if (kus.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
        <Zap className="w-5 h-5 text-white/20 mx-auto mb-1" />
        <p className="text-white/30 text-xs">No Kinetic Units yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-white text-xs font-semibold">Kinetic Journey</span>
        </div>
        {perf && (
          <span className={`text-xs font-medium ${trendColor} flex items-center gap-1`}>
            <TrendingUp className="w-3 h-3" />{perf.performance_trend || 'stable'}
          </span>
        )}
      </div>

      {/* Score Row */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-300">{totalWeighted.toFixed(1)}</p>
          <p className="text-white/40 text-[10px]">Total KU Score</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-blue-300">{kus.length}</p>
          <p className="text-white/40 text-[10px]">Units Generated</p>
        </div>
        {perf && (
          <div className="text-center ml-auto">
            <p className="text-lg font-bold text-amber-300">{perf.overall_score}</p>
            <p className="text-white/40 text-[10px]">Perf Score</p>
          </div>
        )}
      </div>

      {/* Pie + Type List */}
      {typeBreakdown.length > 0 && (
        <div className="flex gap-3 items-center">
          <ResponsiveContainer width={70} height={70}>
            <PieChart>
              <Pie data={typeBreakdown} cx="50%" cy="50%" innerRadius={18} outerRadius={32} dataKey="value" strokeWidth={0}>
                {typeBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #ffffff15', borderRadius: 6, color: '#fff', fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1 max-h-24 overflow-y-auto">
            {typeBreakdown.slice(0, 5).map(t => (
              <div key={t.name} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <span className="text-white/60 flex-1 truncate">{t.name}</span>
                <span className="text-white/80 font-mono">{t.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}