import React from 'react';
import { Calendar } from 'lucide-react';

const RANGES = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

export default function TimeRangeFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <Calendar className="w-3.5 h-3.5 text-slate-500" />
      <div className="flex gap-1">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => onChange(r.key)}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
              value === r.key
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 hover:border-slate-600'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}