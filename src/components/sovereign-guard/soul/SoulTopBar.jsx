import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VERDICTS = {
  ALLOW:    { emoji: '🌿', label: 'Allow',    color: 'text-emerald-400' },
  MODERATE: { emoji: '🌗', label: 'Moderate', color: 'text-amber-400' },
  WITHHOLD: { emoji: '🚫', label: 'Withhold', color: 'text-red-400' },
  REPAIR:   { emoji: '🔧', label: 'Repair',   color: 'text-orange-400' },
  GRACE:    { emoji: '🕯️', label: 'Grace',    color: 'text-purple-400' },
};

export default function SoulTopBar({ trends, onRefresh, isRefreshing }) {
  if (!trends) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
      <div>
        <h2 className="text-lg font-bold text-indigo-300">Soul Overlayer — Unified Logic</h2>
        <p className="text-xs text-slate-500">Phase 9 • Monkey → Spindle → Empathy → Soul Verdict</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(VERDICTS).map(([key, v]) => (
          <span key={key} className={`text-xs font-mono ${v.color}`}>
            {v.emoji} {trends[key.toLowerCase()] ?? 0}
          </span>
        ))}
        <span className="text-xs text-slate-500">/ {trends.total || 0} total</span>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing} className="border-slate-700 text-slate-400 h-7 text-xs">
          <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
    </div>
  );
}