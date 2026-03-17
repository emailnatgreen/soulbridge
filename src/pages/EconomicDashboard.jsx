import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import ActivityTimeline from '@/components/audit/ActivityTimeline';

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6366f1', '#ec4899'];

export default function EconomicDashboard() {
  const [tab, setTab] = useState('overview');

  const { data: transactions = [] } = useQuery({
    queryKey: ['txns-economy'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 500),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['economic-activities'],
    queryFn: () => base44.entities.EconomicActivity.list('-created_date', 200),
  });

  const { data: treasuries = [] } = useQuery({
    queryKey: ['treasuries-economy'],
    queryFn: () => base44.entities.Treasury.list(),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-economy'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const completedTxns = transactions.filter(t => t.status === 'completed');
  const totalVolume = completedTxns.reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalTreasuryBalance = treasuries.reduce((s, t) => s + (t.total_balance ?? 0), 0);

  // Monthly volume trend
  const monthlyVolume = completedTxns.reduce((acc, t) => {
    try {
      const month = format(parseISO(t.created_date), 'MMM yy');
      acc[month] = (acc[month] || 0) + (t.amount ?? 0);
    } catch { /* skip */ }
    return acc;
  }, {});
  const volumeData = Object.entries(monthlyVolume).map(([month, volume]) => ({ month, volume: parseFloat(volume.toFixed(2)) })).slice(-8);

  // Activity type breakdown
  const actTypeData = Object.entries(
    activities.reduce((acc, a) => { acc[a.activity_type] = (acc[a.activity_type] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  // Top earners
  const earnerMap = activities.filter(a => a.activity_type === 'earned').reduce((acc, a) => {
    acc[a.agent_id] = (acc[a.agent_id] || 0) + (a.amount ?? 0);
    return acc;
  }, {});
  const topEarners = Object.entries(earnerMap)
    .sort(([, a], [, b]) => b - a).slice(0, 8)
    .map(([id, amount]) => ({
      name: agents.find(a => a.id === id)?.name || id.slice(0, 8),
      amount: parseFloat(amount.toFixed(2)),
    }));

  // Timeline events
  const timelineEvents = activities.slice(0, 50).map(a => ({
    id: a.id, type: 'transaction',
    title: `${a.activity_type.replace(/_/g, ' ').toUpperCase()}: ${a.amount} XRP`,
    description: a.description,
    actor: agents.find(ag => ag.id === a.agent_id)?.name || 'Unknown',
    timestamp: a.created_date,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />Economic Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">{transactions.length} transactions · {activities.length} economic activities</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Volume', val: `${totalVolume.toFixed(0)} XRP`, color: 'text-emerald-400' },
            { label: 'Treasury Balance', val: `${totalTreasuryBalance.toFixed(0)} XRP`, color: 'text-blue-400' },
            { label: 'Transactions', val: completedTxns.length, color: 'text-white' },
            { label: 'Active Agents', val: agents.filter(a => a.status === 'active').length, color: 'text-amber-400' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
              <div className={`text-2xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Nav */}
        <div className="flex gap-2">
          {['overview', 'earners', 'activity', 'audit'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${tab === t ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/40 md:col-span-2">
              <CardHeader><CardTitle className="text-white text-sm">Monthly Transaction Volume (XRP)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                    <Area type="monotone" dataKey="volume" stroke="#22c55e" fill="url(#volGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Activity Type Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={actTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''} labelLine={false}>
                      {actTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Treasury Pools</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {treasuries.length === 0 ? (
                  <p className="text-slate-500 text-sm">No treasuries found.</p>
                ) : treasuries.map(t => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">{t.name}</span>
                    <span className="text-emerald-400 font-semibold">{(t.total_balance ?? 0).toFixed(2)} XRP</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {tab === 'earners' && (
          <Card className="bg-slate-900/60 border-slate-700/40">
            <CardHeader><CardTitle className="text-white text-sm">Top Earners</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topEarners}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} formatter={(v) => [`${v} XRP`]} />
                  <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} name="Earned (XRP)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {tab === 'activity' && (
          <div className="space-y-2">
            {activities.slice(0, 50).map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-700/40 rounded-xl">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.activity_type === 'earned' ? 'bg-green-500/10 border border-green-500/30' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                  {a.activity_type === 'earned' ? <ArrowUpRight className="w-4 h-4 text-green-400" /> : <ArrowDownRight className="w-4 h-4 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-slate-300 text-sm">{a.description}</span>
                  <div className="text-xs text-slate-500">{agents.find(ag => ag.id === a.agent_id)?.name}</div>
                </div>
                <span className={`font-semibold shrink-0 ${a.activity_type === 'earned' ? 'text-green-400' : 'text-blue-400'}`}>{a.amount} XRP</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'audit' && (
          <ActivityTimeline events={timelineEvents} title="Economic Activity Audit Trail" maxHeight="600px" />
        )}
      </div>
    </div>
  );
}