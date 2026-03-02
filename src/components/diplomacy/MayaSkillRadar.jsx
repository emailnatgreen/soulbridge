import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';

const DIM_SHORT = {
  'Empathy & Acknowledgement':  'Empathy',
  'Clarity & Professionalism':  'Clarity',
  'Problem-Solving Orientation':'Problem\nSolving',
  'De-escalation Effectiveness':'De-escalation',
  'Brand Voice & Tone':         'Brand Voice',
  'Context Integration':        'Context',
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-purple-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-800">{d.fullName}</p>
      <p className="text-purple-600 font-bold">{d.level}/100</p>
      {d.peak && <p className="text-gray-400">Peak: {d.peak}</p>}
    </div>
  );
};

export default function MayaSkillRadar({ skills }) {
  if (!skills?.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No skill data yet — complete a drill to begin tracking.
      </div>
    );
  }

  const data = skills.map(s => ({
    name: DIM_SHORT[s.name] || s.name,
    fullName: s.name,
    level: s.level || 0,
    peak: s.metadata?.peak_score || s.level || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#6b7280' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 9, fill: '#9ca3af' }}
          tickCount={5}
        />
        <Radar
          name="Peak"
          dataKey="peak"
          stroke="#c4b5fd"
          fill="#c4b5fd"
          fillOpacity={0.15}
        />
        <Radar
          name="Current"
          dataKey="level"
          stroke="#7c3aed"
          fill="#7c3aed"
          fillOpacity={0.35}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}