import React from 'react';

const SEGMENTS = [
  { key: 'critical', label: 'Critical', color: 'bg-red-500', textColor: 'text-red-400' },
  { key: 'high', label: 'High', color: 'bg-amber-500', textColor: 'text-amber-400' },
  { key: 'medium', label: 'Medium', color: 'bg-blue-500', textColor: 'text-blue-400' },
  { key: 'low', label: 'Low', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
];

export default function WeightDistribution({ distribution, avgWeight }) {
  if (!distribution) return null;
  const total = Object.values(distribution).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-white/30 text-[10px]">Weight Distribution</span>
        {avgWeight > 0 && <span className="text-white/50 text-[10px] font-mono">avg: {avgWeight}</span>}
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
        {SEGMENTS.map(seg => {
          const count = distribution[seg.key] || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return <div key={seg.key} className={`${seg.color} transition-all`} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {SEGMENTS.map(seg => {
          const count = distribution[seg.key] || 0;
          if (count === 0) return null;
          return (
            <span key={seg.key} className={`text-[9px] ${seg.textColor}`}>
              {seg.label}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}