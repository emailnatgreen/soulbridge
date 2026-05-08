import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import moment from 'moment';

export default function ArchiveAttentionLog() {
  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['archive-attention'],
    queryFn: () => base44.entities.Memory.filter(
      { type: 'observation', keywords: 'compressed_attention' },
      '-created_date', 50
    ).catch(() =>
      base44.entities.Memory.filter({ type: 'observation' }, '-created_date', 50)
    ),
  });

  // Filter for compressed attention related entries
  const attentionEntries = memories.filter(m =>
    (m.keywords || []).some(k => k.includes('attention') || k.includes('threat') || k.includes('node8')) ||
    (m.content || '').toLowerCase().includes('compressed attention') ||
    (m.content || '').toLowerCase().includes('threat vector')
  );

  if (isLoading) {
    return <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-slate-800/40 rounded-lg animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-red-400" />
        <span className="text-white/60 text-xs">Archived Compressed Attention — {attentionEntries.length} records · Semantic audit trail</span>
      </div>
      <div className="space-y-2">
        {attentionEntries.map(mem => (
          <div key={mem.id} className="rounded-lg border border-white/10 bg-slate-900/60 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-white/70 text-xs font-medium truncate">{mem.context || 'Attention analysis'}</span>
              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[9px] ml-auto">importance: {mem.importance || 5}</Badge>
            </div>
            <p className="text-white/40 text-xs leading-relaxed line-clamp-3">{mem.content}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {(mem.keywords || []).slice(0, 5).map(k => (
                <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{k}</span>
              ))}
              <span className="text-white/20 text-[10px] ml-auto">{moment(mem.created_date).fromNow()}</span>
            </div>
          </div>
        ))}
      </div>
      {attentionEntries.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No compressed attention records found.</p>}
    </div>
  );
}