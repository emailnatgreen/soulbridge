import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MonkeyTrendCharts({ events }) {
  if (!events || events.length < 2) {
    return <div className="text-white/20 text-xs text-center py-6">Not enough data for trends yet.</div>;
  }

  // Reverse to show oldest → newest on chart
  const chartData = [...events].reverse().map((e, i) => ({
    idx: i + 1,
    relevance: e.relevance ?? e.relevance_score ?? 0,
    alignment: e.alignment ?? e.alignment_score ?? 0,
    co_evolution: e.co_ev ?? e.co_evolution_score ?? 0,
    label: e.agent || e.agent_name || '',
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <h4 className="text-white/60 text-xs font-medium mb-3">Score Trends (Recent Events)</h4>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="idx" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
            />
            <Line type="monotone" dataKey="relevance" stroke="#22d3ee" strokeWidth={2} dot={false} name="Relevance" />
            <Line type="monotone" dataKey="alignment" stroke="#a78bfa" strokeWidth={2} dot={false} name="Alignment" />
            <Line type="monotone" dataKey="co_evolution" stroke="#34d399" strokeWidth={2} dot={false} name="Co-Evolution" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-2">
          <span className="flex items-center gap-1 text-[10px] text-cyan-400"><span className="w-3 h-0.5 bg-cyan-400 rounded" /> Relevance</span>
          <span className="flex items-center gap-1 text-[10px] text-purple-400"><span className="w-3 h-0.5 bg-purple-400 rounded" /> Alignment</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="w-3 h-0.5 bg-emerald-400 rounded" /> Co-Evolution</span>
        </div>
      </div>
    </div>
  );
}