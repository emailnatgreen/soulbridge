import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Leaf, Flame, TrendingDown, Wind, Info, Target } from 'lucide-react';
import { subDays, parseISO, format } from 'date-fns';

const CARBON_FACTORS = {
  per_stalled_hour: 0.5,
  per_automation_error: 2.0,
  per_inefficient_chain: 5.0,
  per_critical_alert_24h: 3.0,
  per_idle_resource: 0.1,
  per_stagnant_listing: 0.2,
};

function formatCO2(grams) {
  if (grams >= 1000000) return `${(grams / 1000000).toFixed(2)} t CO2e`;
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg CO2e`;
  return `${grams.toFixed(1)} g CO2e`;
}

function StatPill({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={`rounded-xl p-4 border ${color} flex items-start gap-3`}>
      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-white font-bold text-lg leading-tight">{value}</p>
        <p className="text-sm opacity-80">{label}</p>
        {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function CarbonConversionSection({ currentMetrics }) {
  const [period, setPeriod] = useState(30);
  const [showFactors, setShowFactors] = useState(false);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['waste-snapshots-carbon', period],
    queryFn: async () => {
      const all = await base44.entities.DailyKineticWasteSnapshot.list('-snapshot_date', 90);
      const cutoff = subDays(new Date(), period);
      return all
        .filter(s => s.snapshot_date && parseISO(s.snapshot_date) >= cutoff)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
        .map(s => ({
          ...s,
          day: format(parseISO(s.snapshot_date), 'dd MMM'),
        }));
    },
    refetchInterval: 300000,
  });

  // Live estimate from current metrics (today, not yet snapshotted)
  const liveCarbon = currentMetrics ? (
    (currentMetrics.stalledHoursLocked * CARBON_FACTORS.per_stalled_hour) +
    (currentMetrics.automationErrors * CARBON_FACTORS.per_automation_error) +
    (currentMetrics.inefficientChains * CARBON_FACTORS.per_inefficient_chain) +
    (currentMetrics.critUnack24h * CARBON_FACTORS.per_critical_alert_24h) +
    (currentMetrics.idleResources * CARBON_FACTORS.per_idle_resource) +
    (currentMetrics.stagnantListings * CARBON_FACTORS.per_stagnant_listing)
  ) : 0;

  const totalWasteGrams = snapshots.reduce((s, snap) => s + (snap.carbon_waste_grams || 0), 0);
  const totalSavedGrams = snapshots.reduce((s, snap) => s + (snap.carbon_saved_grams || 0), 0);
  const bestDaySaving = snapshots.reduce((max, snap) => Math.max(max, snap.carbon_saved_grams || 0), 0);
  const avgDailyWaste = snapshots.length > 0 ? totalWasteGrams / snapshots.length : 0;

  const savingsPercent = totalWasteGrams > 0
    ? Math.min(100, Math.round((totalSavedGrams / totalWasteGrams) * 100))
    : 0;

  const latestSnap = snapshots[snapshots.length - 1];
  const sourceBreakdown = useMemo(() => {
    const m = latestSnap || {};
    const items = [
      { label: 'Stalled Task Hours', grams: (m.stalled_hours_locked || 0) * CARBON_FACTORS.per_stalled_hour, count: `${m.stalled_tasks_count || 0} tasks · ${m.stalled_hours_locked || 0}h locked`, color: '#f87171', priority: 'critical' },
      { label: 'Automation Errors', grams: (m.automation_errors_count || 0) * CARBON_FACTORS.per_automation_error, count: `${m.automation_errors_count || 0} errors`, color: '#c084fc', priority: 'high' },
      { label: 'Critical Alerts (unresolved)', grams: (m.critical_alerts_count || 0) * CARBON_FACTORS.per_critical_alert_24h, count: `${m.agents_at_risk || 0} agents at risk`, color: '#fb7185', priority: 'high' },
      { label: 'Inefficient Chains', grams: (m.inefficient_chains_count || 0) * CARBON_FACTORS.per_inefficient_chain, count: `${m.inefficient_chains_count || 0} chains`, color: '#34d399', priority: 'medium' },
      { label: 'Stagnant Listings', grams: (m.stagnant_listings_count || 0) * CARBON_FACTORS.per_stagnant_listing, count: `${m.stagnant_listings_count || 0} listings`, color: '#fbbf24', priority: 'low' },
    ].filter(i => i.grams > 0).sort((a, b) => b.grams - a.grams);
    const total = items.reduce((s, i) => s + i.grams, 0);
    return items.map(i => ({ ...i, pct: total > 0 ? Math.round((i.grams / total) * 100) : 0 }));
  }, [latestSnap]);

  const trendDelta = snapshots.length >= 2
    ? (snapshots[snapshots.length - 1]?.carbon_waste_grams || 0) - (snapshots[snapshots.length - 2]?.carbon_waste_grams || 0)
    : 0;

  return (
    <div className="mt-10">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Carbon Impact Conversion</h2>
          <p className="text-slate-400 text-sm">Translating kinetic waste annihilation into environmental savings</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                period === d ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >{d}d</button>
          ))}
          <button
            onClick={() => setShowFactors(f => !f)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <Info className="w-3.5 h-3.5" />
            Factors
          </button>
        </div>
      </div>

      {/* Carbon Factors Panel */}
      {showFactors && (
        <div className="mb-6 bg-slate-900 border border-emerald-700/40 rounded-xl p-5">
          <p className="text-emerald-300 font-semibold text-sm mb-3">Carbon Equivalent Factors (Configurable)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              { label: '1 hr stalled task', value: `${CARBON_FACTORS.per_stalled_hour}g CO2e` },
              { label: '1 automation error', value: `${CARBON_FACTORS.per_automation_error}g CO2e` },
              { label: '1 inefficient chain/day', value: `${CARBON_FACTORS.per_inefficient_chain}g CO2e` },
              { label: '1 critical alert (24h+)', value: `${CARBON_FACTORS.per_critical_alert_24h}g CO2e` },
              { label: '1 idle resource/day', value: `${CARBON_FACTORS.per_idle_resource}g CO2e` },
              { label: '1 stagnant listing/day', value: `${CARBON_FACTORS.per_stagnant_listing}g CO2e` },
            ].map(f => (
              <div key={f.label} className="bg-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-400">{f.label}</span>
                <span className="text-emerald-300 font-mono font-bold">{f.value}</span>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-3">Based on estimated data center energy consumption proxies. Values represent conceptual CO2 equivalent impact of inefficient digital compute.</p>
        </div>
      )}

      {/* Today's Live Estimate */}
      {currentMetrics && (
        <div className="mb-6 bg-gradient-to-r from-emerald-900/30 to-teal-900/20 border border-emerald-600/40 rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-emerald-300 text-sm font-semibold">Live Today (unsnapshotted)</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-white font-bold">{formatCO2(liveCarbon)}</span>
            <span className="text-slate-400 text-xs">estimated carbon footprint from current waste load</span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatPill
          icon={Flame}
          label={`Total Carbon Waste (${period}d)`}
          value={formatCO2(totalWasteGrams)}
          sub="Accumulated waste footprint"
          color="bg-red-900/30 border-red-700/40 text-red-300"
        />
        <StatPill
          icon={Leaf}
          label={`Carbon Saved / Avoided (${period}d)`}
          value={formatCO2(totalSavedGrams)}
          sub="From waste reduction vs prev day"
          color="bg-emerald-900/30 border-emerald-700/40 text-emerald-300"
        />
        <StatPill
          icon={TrendingDown}
          label="Efficiency Rate"
          value={`${savingsPercent}%`}
          sub="Savings as % of total waste"
          color="bg-teal-900/30 border-teal-700/40 text-teal-300"
        />
        <StatPill
          icon={Wind}
          label="Best Day Saving"
          value={formatCO2(bestDaySaving)}
          sub={`Avg daily waste: ${formatCO2(avgDailyWaste)}`}
          color="bg-cyan-900/30 border-cyan-700/40 text-cyan-300"
        />
      </div>

      {/* Waste Reduction Insights */}
      {sourceBreakdown.length > 0 && (
        <div className="mb-6 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-slate-800">
            <Target className="w-4 h-4 text-orange-400" />
            <h3 className="text-white font-semibold text-sm">Carbon Source Breakdown — Where to Act</h3>
            <span className={`ml-auto flex items-center gap-1 text-xs font-semibold ${
              trendDelta < 0 ? 'text-green-400' : trendDelta > 0 ? 'text-red-400' : 'text-slate-400'
            }`}>
              {trendDelta < 0 ? '▼' : trendDelta > 0 ? '▲' : '—'} {trendDelta === 0 ? 'Flat' : `${trendDelta > 0 ? '+' : ''}${trendDelta.toFixed(1)}g vs prev day`}
            </span>
          </div>
          <div className="p-4 space-y-3">
            {sourceBreakdown.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                  item.priority === 'critical' ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                  item.priority === 'high' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' :
                  item.priority === 'medium' ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' :
                  'bg-slate-700 border-slate-600 text-slate-400'
                }`}>{item.priority.toUpperCase()}</span>
                <span className="text-slate-300 text-xs w-44 flex-shrink-0 truncate">{item.label}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                </div>
                <span className="text-white font-mono text-xs w-10 text-right flex-shrink-0">{item.pct}%</span>
                <span className="text-slate-500 text-[10px] w-16 text-right flex-shrink-0">{item.grams.toFixed(1)}g CO2e</span>
                <span className="text-slate-600 text-[10px] w-36 text-right flex-shrink-0 hidden sm:block">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="px-4 pb-4">
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg px-4 py-3">
              <p className="text-emerald-400 text-xs font-semibold mb-1">🎯 Top Reduction Priority</p>
              {sourceBreakdown[0] && (
                <p className="text-slate-300 text-xs">
                  <strong>{sourceBreakdown[0].label}</strong> is driving <strong>{sourceBreakdown[0].pct}%</strong> of today's carbon footprint ({sourceBreakdown[0].grams.toFixed(1)}g CO2e).{' '}
                  {sourceBreakdown[0].label === 'Stalled Task Hours' && 'Unblock or reassign overdue tasks in the Task Waste section above — each hour cleared saves 0.5g CO2e directly.'}
                  {sourceBreakdown[0].label === 'Automation Errors' && 'Resolve failing automations — each error eliminated saves 2g CO2e.'}
                  {sourceBreakdown[0].label === 'Critical Alerts (unresolved)' && 'Acknowledge and act on critical wellbeing alerts to prevent agent capacity erosion and carbon buildup.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Carbon Chart */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
        <p className="text-white font-semibold mb-4 text-sm">Carbon Waste vs Savings Over Time</p>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Leaf className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">No snapshots yet</p>
            <p className="text-slate-600 text-sm mt-1">Carbon data will populate after the first daily snapshot runs.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={snapshots} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="carbonWaste" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="carbonSaved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="g" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(val, name) => [`${val.toFixed(1)}g CO2e`, name]}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Area type="monotone" dataKey="carbon_waste_grams" name="Carbon Waste" stroke="#f87171" strokeWidth={2} fill="url(#carbonWaste)" />
              <Area type="monotone" dataKey="carbon_saved_grams" name="Carbon Saved" stroke="#34d399" strokeWidth={2} fill="url(#carbonSaved)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <p className="text-slate-600 text-xs mt-3 text-center">
          Conceptual CO2e estimates based on computational energy proxies. Values represent the environmental signal of digital inefficiency, not directly measured emissions.
        </p>
      </div>
    </div>
  );
}