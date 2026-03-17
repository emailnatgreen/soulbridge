import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import ActivityTimeline from '@/components/audit/ActivityTimeline';
import FilterBar from '@/components/filters/FilterBar';

const STATUS_COLORS = { healthy: 'bg-green-900/40 text-green-300 border-green-700/40', stressed: 'bg-amber-900/40 text-amber-300 border-amber-700/40', critical: 'bg-red-900/40 text-red-300 border-red-700/40', recovering: 'bg-blue-900/40 text-blue-300 border-blue-700/40' };
const BAR_COLORS = { healthy: '#22c55e', stressed: '#f59e0b', critical: '#ef4444', recovering: '#3b82f6' };

const WB_FILTERS = [
  { key: 'status', label: 'Status', type: 'select', options: ['healthy','stressed','critical','recovering'] },
  { key: 'minScore', label: 'Min Wellbeing', type: 'range', min: 0, max: 100 },
];

export default function WellbeingMonitor() {
  const [tab, setTab] = useState('overview');
  const [filterValues, setFilterValues] = useState({ search: '', status: 'all', minScore: { min: 0, max: 100 } });

  const { data: wellbeings = [], isLoading } = useQuery({
    queryKey: ['wellbeings-monitor'],
    queryFn: () => base44.entities.AgentWellbeing.list('-overall_wellbeing_score', 100),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-wb'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['wellbeing-alerts'],
    queryFn: () => base44.entities.WellbeingAlert.list('-created_date', 50),
  });

  const filtered = wellbeings.filter(w => {
    const agent = agents.find(a => a.id === w.agent_id);
    const q = filterValues.search?.toLowerCase();
    if (q && !agent?.name?.toLowerCase().includes(q)) return false;
    if (filterValues.status !== 'all' && w.wellbeing_status !== filterValues.status) return false;
    if (filterValues.minScore?.min > 0 && (w.overall_wellbeing_score ?? 70) < filterValues.minScore.min) return false;
    return true;
  });

  const avgScore = wellbeings.length > 0 ? Math.round(wellbeings.reduce((s, w) => s + (w.overall_wellbeing_score ?? 70), 0) / wellbeings.length) : 0;
  const critical = wellbeings.filter(w => w.wellbeing_status === 'critical').length;
  const stressed = wellbeings.filter(w => w.wellbeing_status === 'stressed').length;
  const healthy = wellbeings.filter(w => w.wellbeing_status === 'healthy').length;

  // Score distribution
  const distData = [
    { range: '0-20', count: wellbeings.filter(w => (w.overall_wellbeing_score ?? 70) <= 20).length },
    { range: '21-40', count: wellbeings.filter(w => (w.overall_wellbeing_score ?? 70) > 20 && (w.overall_wellbeing_score ?? 70) <= 40).length },
    { range: '41-60', count: wellbeings.filter(w => (w.overall_wellbeing_score ?? 70) > 40 && (w.overall_wellbeing_score ?? 70) <= 60).length },
    { range: '61-80', count: wellbeings.filter(w => (w.overall_wellbeing_score ?? 70) > 60 && (w.overall_wellbeing_score ?? 70) <= 80).length },
    { range: '81-100', count: wellbeings.filter(w => (w.overall_wellbeing_score ?? 70) > 80).length },
  ];

  // Avg radar (using first agent's dimensions as sample)
  const sample = wellbeings[0];
  const radarData = sample ? [
    { subject: 'Energy', val: sample.energy_level ?? 70 },
    { subject: 'Mood', val: sample.mood_score ?? 70 },
    { subject: 'Stress', val: 100 - (sample.stress_level ?? 30) },
    { subject: 'Productivity', val: sample.productivity_score ?? 70 },
    { subject: 'Social', val: sample.social_score ?? 70 },
  ] : [];

  const timelineEvents = alerts.map(a => ({
    id: a.id,
    type: a.severity === 'critical' ? 'error' : 'info',
    title: a.alert_type?.replace(/_/g, ' ') || 'Wellbeing Alert',
    description: a.message || a.description || '',
    actor: agents.find(ag => ag.id === a.agent_id)?.name || 'Unknown',
    timestamp: a.created_date,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-950/20 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-400" />Wellbeing Monitor
          </h1>
          <p className="text-slate-400 text-sm mt-1">{wellbeings.length} agents tracked · {alerts.length} alerts</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Score', val: avgScore, color: avgScore >= 70 ? 'text-green-400' : 'text-amber-400' },
            { label: 'Healthy', val: healthy, color: 'text-green-400' },
            { label: 'Stressed', val: stressed, color: 'text-amber-400' },
            { label: 'Critical', val: critical, color: 'text-red-400' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${k.color}`}>{k.val}{k.label === 'Avg Score' ? '%' : ''}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['overview', 'agents', 'alerts'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${tab === t ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Score Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={distData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                    <Bar dataKey="count" name="Agents" radius={[4, 4, 0, 0]}>
                      {distData.map((entry, i) => {
                        const col = i <= 1 ? '#ef4444' : i === 2 ? '#f59e0b' : '#22c55e';
                        return <Cell key={i} fill={col} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {radarData.length > 0 && (
              <Card className="bg-slate-900/60 border-slate-700/40">
                <CardHeader><CardTitle className="text-white text-sm">Wellness Dimensions (Sample)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Radar name="Score" dataKey="val" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {tab === 'agents' && (
          <>
            <FilterBar filters={WB_FILTERS} values={filterValues} onChange={setFilterValues}
              searchKey="search" searchPlaceholder="Search agents…" resultCount={filtered.length} />
            <div className="space-y-2">
              {filtered.map(wb => {
                const agent = agents.find(a => a.id === wb.agent_id);
                const statusCls = STATUS_COLORS[wb.wellbeing_status] || STATUS_COLORS.recovering;
                return (
                  <div key={wb.id} className="flex items-center gap-4 p-4 bg-slate-900/60 border border-slate-700/40 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-pink-600/20 border border-pink-500/30 flex items-center justify-center shrink-0">
                      <Heart className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">{agent?.name || 'Unknown'}</span>
                        <Badge className={`text-xs border ${statusCls} capitalize`}>{wb.wellbeing_status}</Badge>
                      </div>
                      {wb.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{wb.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xl font-bold ${(wb.overall_wellbeing_score ?? 70) >= 70 ? 'text-green-400' : (wb.overall_wellbeing_score ?? 70) >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {wb.overall_wellbeing_score ?? 70}
                      </div>
                      <div className="text-xs text-slate-500">score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'alerts' && (
          <ActivityTimeline events={timelineEvents} title="Wellbeing Alerts" maxHeight="600px" />
        )}
      </div>
    </div>
  );
}