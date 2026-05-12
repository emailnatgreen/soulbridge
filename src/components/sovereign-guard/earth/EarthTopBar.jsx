import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EarthTopBar({ trends, onRefresh, isRefreshing }) {
  if (!trends) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
      <div>
        <h2 className="text-lg font-bold text-emerald-300">Earth Node — Open Connection</h2>
        <p className="text-xs text-slate-500">Phase 10 • Not a gate — a root. Connecting digital to physical.</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-emerald-400">🌍 {trends.connected ?? 0}</span>
        <span className="text-xs font-mono text-amber-400">🌱 {trends.partial ?? 0}</span>
        <span className="text-xs font-mono text-red-400">🏜️ {trends.rejected ?? 0}</span>
        <span className="text-xs font-mono text-slate-500">⏳ {trends.pending ?? 0}</span>
        <span className="text-xs text-slate-500">/ {trends.total || 0} actions</span>
        <span className="text-xs text-cyan-400">Avg Impact: {trends.avg_impact || 0}</span>
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing} className="border-slate-700 text-slate-400 h-7 text-xs">
          <RefreshCw className={`w-3 h-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>
    </div>
  );
}