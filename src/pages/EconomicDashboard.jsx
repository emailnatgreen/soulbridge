import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { isRealHash, FLOW_CONFIG, filterByTimeRange, xrpToRlusd } from '@/lib/economicUtils';

import { XrpPriceProvider, useXrpPriceContext } from '@/components/economic/XrpPriceContext';
import EconomicKPIs from '@/components/economic/EconomicKPIs';
import EarnersTab from '@/components/economic/EarnersTab';
import ActivityTab from '@/components/economic/ActivityTab';
import AuditTab from '@/components/economic/AuditTab';
import TimeRangeFilter from '@/components/economic/TimeRangeFilter';
import DataScopeNotice from '@/components/economic/DataScopeNotice';
import TreasuryXRPscanLink from '@/components/economic/TreasuryXRPscanLink';

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6366f1', '#ec4899', '#06b6d4', '#f97316'];

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'earners',  label: 'Earners & Flows' },
  { key: 'activity', label: 'Activity Feed' },
  { key: 'audit',    label: 'Audit Trail' },
];

export default function EconomicDashboard() {
  return (
    <XrpPriceProvider>
      <EconomicDashboardInner />
    </XrpPriceProvider>
  );
}

function EconomicDashboardInner() {
  const [tab, setTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('all');

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['txns-economy'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 500),
  });
  const { data: activities = [], isLoading: actLoading } = useQuery({
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

  const isLoading = txLoading || actLoading;

  // Apply time-range filter
  const filteredTxns = filterByTimeRange(transactions, timeRange);
  const filteredActivities = filterByTimeRange(activities, timeRange);

  // Separate real on-chain vs internal/simulated transactions
  const completedTxns = filteredTxns.filter(t => t.status === 'completed');
  const realTxns = completedTxns.filter(t => isRealHash(t.hash));
  const internalTxns = completedTxns.filter(t => !isRealHash(t.hash));
  const realVolume = realTxns.reduce((s, t) => s + (t.amount ?? 0), 0);
  const internalVolume = internalTxns.reduce((s, t) => s + (t.amount ?? 0), 0);

  // Active treasuries (exclude deprecated/historical)
  const activeTreasuries = treasuries.filter(t =>
    !t.purpose?.includes('DEPRECATED') && !t.purpose?.includes('Historical')
  );
  const totalTreasuryBalance = activeTreasuries.reduce((s, t) => s + (t.total_balance ?? 0), 0);
  const activeAgentCount = agents.filter(a => a.status !== 'suspended' && a.status !== 'dormant').length;

  const { price, source: priceSource } = useXrpPriceContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Economic Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {realTxns.length} on-chain transactions · {filteredActivities.length} economic activities · {activeTreasuries.length} active treasuries
            {timeRange !== 'all' && <span className="text-emerald-400 ml-1">({timeRange} window)</span>}
          </p>
        </div>

        {/* Time Range Filter */}
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

        {/* KPIs */}
        <EconomicKPIs
          volume={realVolume}
          treasury={totalTreasuryBalance}
          transactions={realTxns.length}
          agents={activeAgentCount}
          internalVolume={internalVolume}
          internalCount={internalTxns.length}
          activityCount={filteredActivities.length}
        />

        {/* Data Scope Explainer */}
        <DataScopeNotice
          onChainCount={realTxns.length}
          onChainVolume={realVolume}
          internalCount={internalTxns.length}
          internalVolume={internalVolume}
          activityCount={filteredActivities.length}
        />

        {/* Tab Navigation */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="ml-2 text-slate-400 text-sm">Loading economic data…</span>
          </div>
        )}

        {/* Tab Content */}
        {!isLoading && tab === 'overview' && (
          <OverviewTab
            realTxns={realTxns}
            activities={filteredActivities}
            activeTreasuries={activeTreasuries}
          />
        )}
        {!isLoading && tab === 'earners' && <EarnersTab activities={filteredActivities} agents={agents} />}
        {!isLoading && tab === 'activity' && <ActivityTab activities={filteredActivities} agents={agents} />}
        {!isLoading && tab === 'audit' && <AuditTab activities={filteredActivities} agents={agents} transactions={filteredTxns} />}
      </div>
    </div>
  );
}

// ── Overview Tab (inline, only used here) ───────────────────────────────────
function OverviewTab({ realTxns, activities, activeTreasuries }) {
  const { price } = useXrpPriceContext();
  // Monthly volume from real on-chain transactions
  const monthlyVolume = realTxns.reduce((acc, t) => {
    try {
      const month = format(parseISO(t.created_date), 'MMM yy');
      acc[month] = (acc[month] || 0) + (t.amount ?? 0);
    } catch { /* skip bad dates */ }
    return acc;
  }, {});
  const volumeData = Object.entries(monthlyVolume)
    .map(([month, volume]) => ({ month, volume: parseFloat(volume.toFixed(2)) }))
    .slice(-8);

  // Activity type distribution
  const actTypeData = Object.entries(
    activities.reduce((acc, a) => {
      const label = (a.activity_type || 'unknown').replace(/_/g, ' ');
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Volume Chart */}
      <Card className="bg-slate-900/60 border-slate-700/40 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-white text-sm">Monthly On-Chain Volume (Verified XRPL Transactions)</CardTitle>
        </CardHeader>
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

      {/* Activity Type Pie */}
      <Card className="bg-slate-900/60 border-slate-700/40">
        <CardHeader>
          <CardTitle className="text-white text-sm">Activity Type Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {actTypeData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No activity data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={actTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                  label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {actTypeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
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
        <CardHeader>
          <CardTitle className="text-white text-sm">Active Treasury Pools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTreasuries.length === 0 ? (
            <p className="text-slate-500 text-sm">No active treasuries found.</p>
          ) : (
            activeTreasuries.map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 bg-slate-800/40 rounded-lg">
                <div className="min-w-0">
                  <span className="text-slate-300 text-sm block truncate">{t.name}</span>
                  <TreasuryXRPscanLink address={t.classic_address} />
                </div>
                <div className="text-right shrink-0">
                  <span className="text-emerald-400 font-semibold">
                    {(t.total_balance ?? 0).toFixed(2)} XRP
                  </span>
                  <span className="text-slate-500 text-[10px] block">≈${xrpToRlusd(t.total_balance ?? 0, price)} RLUSD</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}