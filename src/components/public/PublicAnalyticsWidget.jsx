import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';

export default function PublicAnalyticsWidget() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['public-report-stats'],
    queryFn: async () => {
      const res = await base44.functions.invoke('publicReports', { action: 'stats' });
      return res.data;
    },
    staleTime: 60000,
  });

  if (isLoading || !stats) {
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 animate-pulse">
        <div className="h-3 w-24 bg-white/10 rounded" />
      </div>
    );
  }

  const avgPct = Math.round((stats.avg_veracity || 0) * 100);

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5 text-purple-400/60" />
        <span className="text-purple-400/60 text-[10px] uppercase tracking-wider font-semibold">Transparency Analytics</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center">
          <p className="text-white font-bold text-lg">{stats.total}</p>
          <p className="text-white/30 text-[10px]">Total Reports</p>
        </div>
        <div className="text-center">
          <p className="text-white font-bold font-mono text-lg">{avgPct}%</p>
          <p className="text-white/30 text-[10px]">Avg Veracity</p>
        </div>
        <div className="text-center">
          <p className="text-emerald-400 font-bold text-lg">{stats.decisions?.allow || 0}</p>
          <p className="text-white/30 text-[10px]">Verified</p>
        </div>
        <div className="text-center">
          <p className="text-amber-400 font-bold text-lg">{(stats.decisions?.flag || 0) + (stats.decisions?.block || 0)}</p>
          <p className="text-white/30 text-[10px]">Flagged / Blocked</p>
        </div>
      </div>
    </div>
  );
}