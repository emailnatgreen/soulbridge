import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, Users, Star, Zap } from 'lucide-react';
import FilterBar from '@/components/filters/FilterBar';

const PERF_FILTERS = [
  { key: 'role', label: 'Role', type: 'select', options: ['guardian','creator','trader','teacher','healer','scout','elder','master'] },
  { key: 'honorRange', label: 'Honor Score', type: 'range', min: 0, max: 100 },
];

export default function AgentPerformanceAnalytics() {
  const [tab, setTab] = useState('overview');
  const [filterValues, setFilterValues] = useState({ search: '', role: 'all', honorRange: { min: 0, max: 100 } });
  const [selectedAgent, setSelectedAgent] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-perf'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 100),
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['perf-metrics'],
    queryFn: () => base44.entities.AgentPerformanceMetrics.list('-created_date', 100),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-perf'],
    queryFn: () => base44.entities.ProjectTask.list('-created_date', 200),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities-perf'],
    queryFn: () => base44.entities.EconomicActivity.list('-created_date', 200),
  });

  const filteredAgents = agents.filter(a => {
    const q = filterValues.search?.toLowerCase();
    if (q && !a.name?.toLowerCase().includes(q)) return false;
    if (filterValues.role !== 'all' && a.role !== filterValues.role) return false;
    if (filterValues.honorRange?.min > 0 && (a.honor_score ?? 100) < filterValues.honorRange.min) return false;
    if (filterValues.honorRange?.max < 100 && (a.honor_score ?? 100) > filterValues.honorRange.max) return false;
    return true;
  });

  // Honor score distribution
  const honorDist = [
    { range: '0–20', count: agents.filter(a => (a.honor_score ?? 100) <= 20).length },
    { range: '21–40', count: agents.filter(a => (a.honor_score ?? 100) > 20 && (a.honor_score ?? 100) <= 40).length },
    { range: '41–60', count: agents.filter(a => (a.honor_score ?? 100) > 40 && (a.honor_score ?? 100) <= 60).length },
    { range: '61–80', count: agents.filter(a => (a.honor_score ?? 100) > 60 && (a.honor_score ?? 100) <= 80).length },
    { range: '81–100', count: agents.filter(a => (a.honor_score ?? 100) > 80).length },
  ];

  // Task completion by agent (top 10)
  const taskMap = tasks.reduce((acc, t) => {
    if (!t.assigned_agent_id) return acc;
    if (!acc[t.assigned_agent_id]) acc[t.assigned_agent_id] = { total: 0, done: 0 };
    acc[t.assigned_agent_id].total++;
    if (t.status === 'completed') acc[t.assigned_agent_id].done++;
    return acc;
  }, {});

  const taskData = Object.entries(taskMap)
    .map(([id, d]) => ({
      name: agents.find(a => a.id === id)?.name?.slice(0, 10) || id.slice(0, 8),
      completion: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0,
      total: d.total,
    }))
    .sort((a, b) => b.total - a.total).slice(0, 10);

  // Role breakdown
  const roleData = Object.entries(
    agents.reduce((acc, a) => { acc[a.role || 'citizen'] = (acc[a.role || 'citizen'] || 0) + 1; return acc; }, {})
  ).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count);

  // Selected agent radar
  const selAgent = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;
  const selMetrics = selAgent ? metrics.find(m => m.agent_id === selAgent.id) : null;
  const radarData = selMetrics ? [
    { subject: 'Honor', val: selAgent?.honor_score ?? 100 },
    { subject: 'Task Rate', val: selMetrics.task_completion_rate ?? 70 },
    { subject: 'Transactions', val: Math.min(100, (selAgent?.total_transactions ?? 0) / 10) },
    { subject: 'Skill Score', val: selMetrics.avg_skill_score ?? 70 },
    { subject: 'Activity', val: selMetrics.activity_score ?? 70 },
  ] : [];

  const avgHonor = agents.length > 0 ? Math.round(agents.reduce((s, a) => s + (a.honor_score ?? 100), 0) / agents.length) : 0;
  const topPerformers = agents.filter(a => (a.honor_score ?? 100) >= 90).length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-400" />Agent Performance Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">{agents.length} agents · {tasks.length} tasks tracked</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Honor Score', val: avgHonor, color: 'text-amber-400' },
            { label: 'Top Performers', val: topPerformers, color: 'text-green-400' },
            { label: 'Task Completion', val: `${completionRate}%`, color: 'text-blue-400' },
            { label: 'Total Tasks', val: tasks.length, color: 'text-white' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {['overview', 'task rates', 'agent list', 'deep dive'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Honor Score Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={honorDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                    <Bar dataKey="count" name="Agents" radius={[4, 4, 0, 0]}>
                      {honorDist.map((_, i) => <Cell key={i} fill={i <= 1 ? '#ef4444' : i === 2 ? '#f59e0b' : '#22c55e'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Agents by Role</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={roleData} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis type="category" dataKey="role" tick={{ fill: '#94a3b8', fontSize: 10 }} width={70} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'task rates' && (
          <Card className="bg-slate-900/60 border-slate-700/40">
            <CardHeader><CardTitle className="text-white text-sm">Task Completion Rate by Agent</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} formatter={(v) => [`${v}%`]} />
                  <Bar dataKey="completion" name="Completion %" radius={[4, 4, 0, 0]}>
                    {taskData.map((entry, i) => <Cell key={i} fill={entry.completion >= 70 ? '#22c55e' : entry.completion >= 40 ? '#f59e0b' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {tab === 'agent list' && (
          <>
            <FilterBar filters={PERF_FILTERS} values={filterValues} onChange={setFilterValues}
              searchKey="search" searchPlaceholder="Search agents…" resultCount={filteredAgents.length} />
            <div className="space-y-2">
              {filteredAgents.map(a => (
                <div key={a.id} onClick={() => { setSelectedAgent(a.id); setTab('deep dive'); }}
                  className="flex items-center gap-4 p-4 bg-slate-900/60 border border-slate-700/40 rounded-xl hover:border-blue-500/30 cursor-pointer transition-all">
                  <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm font-medium">{a.name}</span>
                    <div className="flex gap-2 mt-1">
                      <Badge className="text-xs bg-slate-800 border-slate-700 text-slate-400 capitalize">{a.role}</Badge>
                      <Badge className={`text-xs border ${a.status === 'active' ? 'bg-green-900/40 text-green-300 border-green-700/40' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{a.status}</Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-amber-300 font-semibold">{a.honor_score ?? 100}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{a.total_transactions ?? 0} txns</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'deep dive' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {agents.slice(0, 12).map(a => (
                <button key={a.id} onClick={() => setSelectedAgent(a.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${selectedAgent === a.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {a.name}
                </button>
              ))}
            </div>
            {selAgent ? (
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-slate-900/60 border-slate-700/40">
                  <CardHeader><CardTitle className="text-white text-sm">{selAgent.name} — Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Honor Score</span><span className="text-amber-400 font-semibold">{selAgent.honor_score ?? 100}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Role</span><span className="text-slate-300 capitalize">{selAgent.role}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Status</span><span className="text-slate-300 capitalize">{selAgent.status}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Transactions</span><span className="text-slate-300">{selAgent.total_transactions ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Tasks Assigned</span><span className="text-slate-300">{tasks.filter(t => t.assigned_agent_id === selAgent.id).length}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400 text-sm">Tasks Completed</span><span className="text-green-400">{tasks.filter(t => t.assigned_agent_id === selAgent.id && t.status === 'completed').length}</span></div>
                  </CardContent>
                </Card>
                {radarData.length > 0 && (
                  <Card className="bg-slate-900/60 border-slate-700/40">
                    <CardHeader><CardTitle className="text-white text-sm">Performance Radar</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={220}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <Radar name="Score" dataKey="val" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">Select an agent above to see their deep-dive analytics.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}