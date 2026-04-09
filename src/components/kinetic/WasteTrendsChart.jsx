import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp, BarChart2, Calendar } from 'lucide-react';
import { subDays, parseISO, format } from 'date-fns';

const PERIOD_OPTIONS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const CHART_CONFIGS = [
  {
    key: 'tasks',
    label: 'Stalled Tasks',
    color: '#f87171',
    lines: [
      { key: 'stalled_tasks_count', label: 'Stalled Tasks', color: '#f87171' },
      { key: 'stalled_hours_locked', label: 'Hours Locked', color: '#fb923c' },
    ],
  },
  {
    key: 'automation',
    label: 'Automation Errors',
    color: '#c084fc',
    lines: [
      { key: 'automation_errors_count', label: 'Error Count', color: '#c084fc' },
      { key: 'estimated_downtime_hours', label: 'Downtime Hours', color: '#a78bfa' },
    ],
  },
  {
    key: 'production',
    label: 'Production Waste',
    color: '#34d399',
    lines: [
      { key: 'inefficient_chains_count', label: 'Inefficient Chains', color: '#34d399' },
      { key: 'unprofitable_chains_count', label: 'Unprofitable Chains', color: '#6ee7b7' },
    ],
  },
  {
    key: 'wellbeing',
    label: 'Wellbeing Alerts',
    color: '#fb7185',
    lines: [
      { key: 'critical_alerts_count', label: 'Critical Alerts', color: '#fb7185' },
      { key: 'agents_at_risk', label: 'Agents at Risk', color: '#f9a8d4' },
    ],
  },
  {
    key: 'resources',
    label: 'Resource Waste',
    color: '#fbbf24',
    lines: [
      { key: 'stagnant_listings_count', label: 'Stagnant Listings', color: '#fbbf24' },
      { key: 'idle_resource_value_xrp', label: 'Idle Value (XRP)', color: '#f59e0b' },
    ],
  },
];

function MiniTrendIndicator({ snapshots, metricKey }) {
  if (snapshots.length < 2) return null;
  const last = snapshots[snapshots.length - 1]?.[metricKey] ?? 0;
  const prev = snapshots[snapshots.length - 2]?.[metricKey] ?? 0;
  const delta = last - prev;
  if (delta === 0) return <span className="text-slate-500 text-xs">no change</span>;
  const isGood = delta < 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs ${isGood ? 'text-green-400' : 'text-red-400'}`}>
      {isGood ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
      {Math.abs(delta).toFixed(1)} {isGood ? '↓' : '↑'}
    </span>
  );
}

export default function WasteTrendsChart() {
  const [period, setPeriod] = useState(30);
  const [activeChart, setActiveChart] = useState('tasks');

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['waste-snapshots', period],
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

  const config = CHART_CONFIGS.find(c => c.key === activeChart);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-slate-700 flex-wrap">
        <BarChart2 className="w-5 h-5 text-indigo-400" />
        <h2 className="text-white font-semibold">Historical Waste Trends</h2>
        <div className="ml-auto flex items-center gap-2">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setPeriod(opt.days)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                period === opt.days ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-3 border-b border-slate-800 flex-wrap">
        {CHART_CONFIGS.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveChart(c.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeChart === c.key
                ? 'bg-slate-700 text-white border border-slate-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
            {c.label}
            {snapshots.length >= 2 && (
              <MiniTrendIndicator snapshots={snapshots} metricKey={c.lines[0].key} />
            )}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="p-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-56">
            <div className="w-6 h-6 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <Calendar className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">No snapshots yet</p>
            <p className="text-slate-600 text-sm mt-1">Daily snapshots will appear here once the automation runs.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={snapshots} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              {config.lines.map(line => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: line.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Summary row */}
        {snapshots.length >= 2 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {config.lines.map(line => {
              const first = snapshots[0]?.[line.key] ?? 0;
              const last = snapshots[snapshots.length - 1]?.[line.key] ?? 0;
              const delta = last - first;
              const isGood = delta <= 0;
              return (
                <div key={line.key} className="bg-slate-800 rounded-lg px-3 py-2">
                  <p className="text-slate-400 text-xs truncate">{line.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-white font-bold text-sm">{typeof last === 'number' ? last.toFixed(last % 1 ? 1 : 0) : last}</span>
                    {delta !== 0 && (
                      <span className={`text-xs ${isGood ? 'text-green-400' : 'text-red-400'}`}>
                        {isGood ? '↓' : '↑'}{Math.abs(delta).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[10px]">vs {period}d ago: {typeof first === 'number' ? first.toFixed(first % 1 ? 1 : 0) : first}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}