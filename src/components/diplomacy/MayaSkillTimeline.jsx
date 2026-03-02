import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const DIM_SHORT = {
  'Empathy & Acknowledgement':  'Empathy',
  'Clarity & Professionalism':  'Clarity',
  'Problem-Solving Orientation':'Problem Solving',
  'De-escalation Effectiveness':'De-escalation',
  'Brand Voice & Tone':         'Brand Voice',
  'Context Integration':        'Context',
};

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#ea580c', '#db2777', '#0891b2'];

const DIMS = [
  'Empathy & Acknowledgement',
  'Clarity & Professionalism',
  'Problem-Solving Orientation',
  'De-escalation Effectiveness',
  'Brand Voice & Tone',
  'Context Integration',
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">Attempt #{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {DIM_SHORT[p.dataKey] || p.dataKey}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function MayaSkillTimeline({ skills }) {
  const [hidden, setHidden] = useState({});

  // Build timeline from score_history stored on each AgentSkill
  const chartData = useMemo(() => {
    if (!skills?.length) return [];
    // Collect all timestamps across all dims
    const allTs = new Set();
    for (const sk of skills) {
      for (const h of sk.metadata?.score_history || []) allTs.add(h.ts);
    }
    const sorted = [...allTs].sort();
    return sorted.map((ts, i) => {
      const row = { attempt: i + 1, ts };
      for (const sk of skills) {
        const entry = (sk.metadata?.score_history || []).find(h => h.ts === ts);
        if (entry) row[sk.name] = entry.score;
      }
      return row;
    });
  }, [skills]);

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No timeline data yet — scores will appear after each drill attempt.
      </div>
    );
  }

  const toggle = (dim) => setHidden(h => ({ ...h, [dim]: !h[dim] }));

  return (
    <div className="space-y-3">
      {/* Legend toggles */}
      <div className="flex flex-wrap gap-2">
        {DIMS.map((dim, i) => (
          <button
            key={dim}
            onClick={() => toggle(dim)}
            className={`text-xs px-2 py-1 rounded-full border transition-all ${
              hidden[dim]
                ? 'bg-gray-100 text-gray-400 border-gray-200'
                : 'text-white border-transparent'
            }`}
            style={!hidden[dim] ? { backgroundColor: COLORS[i] } : {}}
          >
            {DIM_SHORT[dim]}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="attempt" tick={{ fontSize: 10, fill: '#9ca3af' }} label={{ value: 'Attempt', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#9ca3af' }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <ReferenceLine y={80} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Refined Vintage', position: 'right', fontSize: 9, fill: '#16a34a' }} />
          <Tooltip content={<CustomTooltip />} />
          {DIMS.map((dim, i) => !hidden[dim] && (
            <Line
              key={dim}
              type="monotone"
              dataKey={dim}
              stroke={COLORS[i]}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS[i] }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}