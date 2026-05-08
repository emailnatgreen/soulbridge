import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

const ACTION_COLORS = {
  flag: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  challenge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  isolate: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const STATUS_COLORS = {
  pending: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  approved: 'bg-green-500/15 text-green-300 border-green-500/30',
  denied: 'bg-red-500/15 text-red-300 border-red-500/30',
  auto_executed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  expired: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function ArchiveInjectorLog() {
  const { data: recs = [], isLoading } = useQuery({
    queryKey: ['archive-injector'],
    queryFn: () => base44.entities.SecurityRecommendation.list('-created_date', 100),
  });

  if (isLoading) {
    return <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-slate-800/40 rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-red-400" />
        <span className="text-white/60 text-xs">Archived Injector Recommendations — {recs.length} records · Graduated autonomy log</span>
      </div>
      <div className="space-y-2">
        {recs.map(rec => (
          <div key={rec.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-white text-sm font-medium truncate">{rec.recommendation_id}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge className={`text-[9px] ${ACTION_COLORS[rec.action_type] || ACTION_COLORS.flag}`}>{rec.action_type}</Badge>
                <Badge className={`text-[9px] ${STATUS_COLORS[rec.status] || STATUS_COLORS.pending}`}>{rec.status}</Badge>
              </div>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">{rec.summary}</p>
            <div className="flex items-center gap-3 text-white/20 text-[10px]">
              <span>Threat: {rec.threat_score || 0}/100</span>
              <span>{rec.severity}</span>
              <span>{moment(rec.created_date).fromNow()}</span>
            </div>
          </div>
        ))}
      </div>
      {recs.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No injector recommendations archived.</p>}
    </div>
  );
}