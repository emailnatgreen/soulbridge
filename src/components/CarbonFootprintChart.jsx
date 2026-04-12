import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Leaf, TrendingDown, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs space-y-1.5 shadow-2xl">
      <p className="text-white/60 font-mono">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>{p.value?.toFixed(1)}g CO₂e</span>
        </div>
      ))}
    </div>
  );
};

export default function CarbonFootprintChart({ snapshots = [], loading = false }) {
  const navigate = useNavigate();

  const chartData = [...snapshots]
    .sort((a, b) => (a.snapshot_date || '').localeCompare(b.snapshot_date || ''))
    .slice(-14)
    .map(s => ({
      date: s.snapshot_date ? s.snapshot_date.slice(5) : '—', // MM-DD
      'CO₂ Waste': Number(s.carbon_waste_grams || 0),
      'CO₂ Saved': Number(s.carbon_saved_grams || 0),
    }));

  const totalWaste = snapshots.reduce((s, r) => s + (r.carbon_waste_grams || 0), 0);
  const totalSaved = snapshots.reduce((s, r) => s + (r.carbon_saved_grams || 0), 0);
  const netBalance = totalSaved - totalWaste;

  return (
    <div className="bg-gradient-to-br from-emerald-950/60 via-green-950/40 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Carbon Footprint — Kinetic Waste</h3>
            <p className="text-emerald-300/50 text-[10px]">CO₂e generated vs saved · Last 14 daily snapshots</p>
          </div>
        </div>

      </div>

      {/* KPI Pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <p className="text-red-300 font-bold text-lg">{(totalWaste / 1000).toFixed(2)}kg</p>
          <p className="text-white/40 text-[10px] mt-0.5">Total CO₂ Waste</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
          <p className="text-emerald-300 font-bold text-lg">{(totalSaved / 1000).toFixed(2)}kg</p>
          <p className="text-white/40 text-[10px] mt-0.5">Total CO₂ Saved</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${netBalance >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <p className={`font-bold text-lg ${netBalance >= 0 ? 'text-emerald-300' : 'text-orange-300'}`}>
            {netBalance >= 0 ? '+' : ''}{(netBalance / 1000).toFixed(2)}kg
          </p>
          <p className="text-white/40 text-[10px] mt-0.5">Net Balance</p>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
          <Wind className="w-8 h-8 text-emerald-400/30" />
          <p className="text-white/30 text-xs">No carbon snapshots yet — run the Kinetic Waste Dashboard to generate data.</p>
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="wasteGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="savedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', paddingTop: '4px' }} />
              <Area type="monotone" dataKey="CO₂ Waste" stroke="#ef4444" fill="url(#wasteGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="CO₂ Saved" stroke="#10b981" fill="url(#savedGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}