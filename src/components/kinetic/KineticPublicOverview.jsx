import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Zap, TrendingUp, Users, Activity } from 'lucide-react';

const KU_TYPE_COLORS = {
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

export default function KineticPublicOverview() {
  const { data: kus = [] } = useQuery({
    queryKey: ['public-kinetic-kus'],
    queryFn: () => base44.entities.KineticUnit.list('-created_date', 500),
    staleTime: 60000,
    refetchInterval: 60000,
  });

  // Aggregated, anonymised metrics only
  const totalKUs = kus.length;
  const totalWeighted = kus.reduce((s, k) => s + (k.weighted_score || 1), 0);
  const uniqueAgents = new Set(kus.map(k => k.agent_id)).size;

  // Village Energy Index: 0–100 normalised score
  const energyIndex = Math.min(Math.round((totalWeighted / Math.max(totalKUs, 1)) * 20), 100);

  // Flow over last 10 days (aggregated, no agent identity)
  const flowByDay = {};
  kus.forEach(ku => {
    const day = new Date(ku.created_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    flowByDay[day] = (flowByDay[day] || 0) + (ku.weighted_score || 1);
  });
  const flowData = Object.entries(flowByDay).slice(-10).map(([day, score]) => ({ day, score: +score.toFixed(1) }));

  // Activity type breakdown (no agent names)
  const typeBreakdown = Object.entries(
    kus.reduce((acc, ku) => {
      const label = ku.ku_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count, color: KU_TYPE_COLORS[name.toLowerCase().replace(/ /g, '_')] || '#64748b' }))
    .sort((a, b) => b.count - a.count).slice(0, 5);

  if (totalKUs === 0) return null;

  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-5 sm:p-6 space-y-5 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Kinetic Grid · Village Pulse</h3>
            <p className="text-white/40 text-[10px]">Aggregated · Anonymised · Transparent</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-green-300 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
          <div className="flex items-center justify-center mb-1">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-purple-300">{totalKUs.toLocaleString()}</p>
          <p className="text-white/40 text-[10px] mt-0.5">Kinetic Units</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-blue-300">{uniqueAgents}</p>
          <p className="text-white/40 text-[10px] mt-0.5">Active Contributors</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
          <div className="flex items-center justify-center mb-1">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-300">{energyIndex}</p>
          <p className="text-white/40 text-[10px] mt-0.5">Energy Index</p>
        </div>
      </div>

      {/* Village Energy Index bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-white/50 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Village Energy Index</span>
          <span className={`font-bold ${energyIndex >= 70 ? 'text-green-300' : energyIndex >= 40 ? 'text-amber-300' : 'text-red-300'}`}>{energyIndex}/100</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-700"
            style={{ width: `${energyIndex}%` }}
          />
        </div>
        <p className="text-white/30 text-[10px]">
          {energyIndex >= 70 ? 'Village is thriving — high kinetic momentum' : energyIndex >= 40 ? 'Steady motion — growing kinetic flow' : 'Kinetic Grid warming up'}
        </p>
      </div>

      {/* Activity Flow */}
      {flowData.length > 1 && (
        <div>
          <p className="text-white/40 text-xs mb-2">Collective Activity Flow (Last 10 Days)</p>
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={flowData}>
              <defs>
                <linearGradient id="pubGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#ffffff30', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #ffffff15', borderRadius: 6, color: '#fff', fontSize: 11 }}
                formatter={(v) => [v, 'KU Score']}
              />
              <Area type="monotone" dataKey="score" stroke="#a78bfa" fill="url(#pubGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Activity Types */}
      {typeBreakdown.length > 0 && (
        <div>
          <p className="text-white/40 text-xs mb-2">Top Contribution Types</p>
          <div className="space-y-1.5">
            {typeBreakdown.map(t => (
              <div key={t.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <span className="text-white/60 flex-1">{t.name}</span>
                <span className="text-white/80 font-mono">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-white/20 text-[10px] text-center">Individual agent data is fully anonymised. Governed by Law 1: Soul (Privacy) & Law 2: Honour (Transparency)</p>
    </div>
  );
}