import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

const SEV_COLORS = {
  low: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function ArchiveTripwireLog() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['archive-tripwire'],
    queryFn: () => base44.entities.TripwireEvent.list('-created_date', 100),
  });

  if (isLoading) {
    return <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-slate-800/40 rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-red-400" />
        <span className="text-white/60 text-xs">Archived Tripwire Events — {events.length} records · Immutable log</span>
      </div>
      <div className="space-y-2">
        {events.map(evt => (
          <div key={evt.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-white text-sm font-medium">{evt.event_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[9px] ${SEV_COLORS[evt.severity] || SEV_COLORS.medium}`}>{evt.severity}</Badge>
                <Badge className={`text-[9px] ${evt.status === 'resolved' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>{evt.status}</Badge>
              </div>
            </div>
            <p className="text-white/40 text-xs leading-relaxed">{evt.description}</p>
            <div className="flex items-center gap-3 text-white/20 text-[10px]">
              {evt.source_node && <span>Node: {evt.source_node}</span>}
              <span>{moment(evt.created_date).fromNow()}</span>
            </div>
          </div>
        ))}
      </div>
      {events.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No tripwire events archived.</p>}
    </div>
  );
}