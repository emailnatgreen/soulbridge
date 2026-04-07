import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

import EconomicKPIs from '@/components/economic/EconomicKPIs';
import EarnersTab from '@/components/economic/EarnersTab';
import ActivityTab from '@/components/economic/ActivityTab';
import AuditTab from '@/components/economic/AuditTab';

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4', '#f97316'];

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

  // Separate real on-chain transactions from internal/simulated ones
  // Real XRPL hashes are 64-char hex strings; internal ones start with TASK_ or contain non-hex
  const isRealTx = (t) => {
    if (!t.hash) return false;
    return /^[A-Fa-f0-9]{64}$/.test(t.hash);
  };
  const realTxns = completedTxns.filter(isRealTx);
  const internalTxns = completedTxns.filter(t => !isRealTx(t));
  const realVolume = realTxns.reduce((s, t) => s + (t.amount ?? 0), 0);
  const internalVolume = internalTxns.reduce((s, t) => s + (t.amount ?? 0), 0);
  const activeTreasuries = treasuries.filter(t => !t.purpose?.includes('DEPRECATED') && !t.purpose?.includes('Historical'));
  const totalTreasuryBalance = activeTreasuries.reduce((s, t) => s + (t.total_balance ?? 0), 0);
  const activeAgentCount = agents.filter(a => a.status !== 'suspended' && a.status !== 'dormant').length;

  // Monthly volume trend from REAL on-chain transactions only
  const monthlyVolume = realTxns.reduce((acc, t) => {
    try {
      const month = format(parseISO(t.created_date), 'MMM yy');
      acc[month] = (acc[month] || 0) + (t.amount ?? 0);
    } catch { /* skip */ }
    return acc;
  }, {});
  const volumeData = Object.entries(monthlyVolume).map(([month, volume]) => ({ month, volume: parseFloat(volume.toFixed(2)) })).slice(-8);

  // Activity type breakdown from EconomicActivity
  const actTypeData = Object.entries(
    activities.reduce((acc, a) => {
      const label = (a.activity_type || 'unknown').replace(/_/g, ' ');
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'earners', label: 'Earners & Flows' },
    { key: 'activity', label: 'Activity Feed' },
    { key: 'audit', label: 'Audit Trail' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />Economic Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {realTxns.length} on-chain transactions · {activities.length} economic activities · {activeTreasuries.length} active treasuries
          </p>
        </div>

        {/* KPIs */}
        <EconomicKPIs
          volume={realVolume}
          treasury={totalTreasuryBalance}
          transactions={realTxns.length}
          agents={activeAgentCount}
        />
        {internalTxns.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 text-xs text-amber-300">
            {internalTxns.length} internal/simulated transactions ({internalVolume.toLocaleString()} XRP) excluded from volume — only verified on-chain XRPL transactions are counted.
          </div>
        )}

        {/* Tab Nav */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                tab === t.key ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Volume Chart */}
            <Card className="bg-slate-900/60 border-slate-700/40 md:col-span-2">
              <CardHeader><CardTitle className="text-white text-sm">Monthly Transaction Volume (XRP)</CardTitle></CardHeader>
              <CardContent>
                {volumeData.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-10">No completed transactions to chart yet.</p>
                ) : (
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
                )}
              </CardContent>
            </Card>

            {/* Activity Type Distribution */}
            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Activity Type Distribution</CardTitle></CardHeader>
              <CardContent>
                {actTypeData.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-10">No activity data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={actTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''} labelLine={false}>
                        {actTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                      <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Treasury Pools */}
            <Card className="bg-slate-900/60 border-slate-700/40">
              <CardHeader><CardTitle className="text-white text-sm">Active Treasury Pools</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {activeTreasuries.length === 0 ? (
                  <p className="text-slate-500 text-sm">No active treasuries found.</p>
                ) : activeTreasuries.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-slate-800/40 rounded-lg">
                    <div className="min-w-0">
                      <span className="text-slate-300 text-sm block truncate">{t.name}</span>
                      {t.classic_address && t.classic_address !== 'N/A - Legacy Record' && (
                        <span className="text-[10px] text-slate-600 font-mono">{t.classic_address.slice(0, 8)}…{t.classic_address.slice(-6)}</span>
                      )}
                    </div>
                    <span className="text-emerald-400 font-semibold shrink-0">{(t.total_balance ?? 0).toFixed(2)} XRP</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Earners Tab */}
        {tab === 'earners' && <EarnersTab activities={activities} agents={agents} />}

        {/* Activity Tab */}
        {tab === 'activity' && <ActivityTab activities={activities} agents={agents} />}

        {/* Audit Tab */}
        {tab === 'audit' && <AuditTab activities={activities} agents={agents} />}
      </div>
    </div>
  );
}