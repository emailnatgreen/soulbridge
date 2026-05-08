import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, FileCheck, ScrollText } from 'lucide-react';
import moment from 'moment';

export default function ArchiveAuditTrail() {
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['archive-audit-trail'],
    queryFn: () => base44.entities.Memory.filter({ type: 'observation' }, '-created_date', 100),
  });

  if (isLoading) {
    return <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-14 bg-slate-800/40 rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-red-400" />
        <span className="text-white/60 text-xs">Full Audit Trail — {memories.length} immutable Memory records</span>
      </div>
      <div className="space-y-1.5">
        {memories.map(mem => (
          <div key={mem.id} className="rounded-lg border border-white/5 bg-slate-900/40 p-2.5 flex items-start gap-2">
            <ScrollText className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-white/50 text-xs leading-relaxed line-clamp-2">{mem.content}</p>
              <div className="flex items-center gap-2 mt-1">
                {(mem.keywords || []).slice(0, 3).map(k => (
                  <span key={k} className="text-[8px] px-1 py-0.5 rounded bg-white/5 text-white/25">{k}</span>
                ))}
                <span className="text-white/15 text-[9px] ml-auto">{moment(mem.created_date).format('DD MMM YYYY HH:mm')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {memories.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No audit records found.</p>}
    </div>
  );
}