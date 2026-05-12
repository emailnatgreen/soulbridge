import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert } from 'lucide-react';

export default function MonkeyQuarantineList({ events }) {
  const quarantined = (events || []).filter(e => e.verdict === 'QUARANTINE');

  if (quarantined.length === 0) {
    return (
      <div className="text-center py-8">
        <ShieldAlert className="w-6 h-6 text-white/10 mx-auto mb-2" />
        <p className="text-white/20 text-xs">No quarantined behaviours. The Village is aligned.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {quarantined.map((e) => (
          <div key={e.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium">{e.agent_name || e.agent}</span>
                  <Badge className="text-[9px] bg-amber-500/20 text-amber-300">{e.trigger_type || e.trigger || 'none'}</Badge>
                </div>
                <p className="text-white/50 text-[10px] mt-1">{e.behavior_description || e.behavior}</p>
                {e.verdict_reason && (
                  <p className="text-amber-300/60 text-[9px] mt-1.5 font-medium">{e.verdict_reason}</p>
                )}
                <div className="flex gap-3 mt-1.5 text-[9px] text-white/30">
                  <span>R:{e.relevance_score ?? e.relevance ?? 0}</span>
                  <span>A:{e.alignment_score ?? e.alignment ?? 0}</span>
                  <span>CE:{e.co_evolution_score ?? e.co_ev ?? 0}</span>
                  <span className="text-red-400">Anti-CoEv: Yes</span>
                </div>
                <p className="text-white/20 text-[9px] mt-1">
                  {e.created_date ? new Date(e.created_date).toLocaleString() : ''}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}