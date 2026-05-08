import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

const PHASE_COLORS = {
  committing: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  revealing: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  finalised: 'bg-green-500/15 text-green-300 border-green-500/30',
  failed: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export default function ArchiveEntropyLog() {
  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ['archive-entropy'],
    queryFn: () => base44.entities.EntropyRound.list('-created_date', 50),
  });

  if (isLoading) {
    return <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-slate-800/40 rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-red-400" />
        <span className="text-white/60 text-xs">Archived Entropy Rounds — {rounds.length} records · Immutable log</span>
      </div>
      <div className="space-y-2">
        {rounds.map(round => (
          <div key={round.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <span className="text-white text-sm font-medium">Round {round.round_number}</span>
                <p className="text-white/30 text-[10px]">{round.participating_nodes || 0}/{round.required_nodes || 8} nodes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`text-[9px] ${PHASE_COLORS[round.phase] || PHASE_COLORS.committing}`}>{round.phase}</Badge>
              <span className="text-white/20 text-[10px]">{moment(round.created_date).fromNow()}</span>
            </div>
          </div>
        ))}
      </div>
      {rounds.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No entropy rounds archived.</p>}
    </div>
  );
}