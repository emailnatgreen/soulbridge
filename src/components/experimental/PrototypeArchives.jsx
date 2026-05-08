import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Archive, Clock, FileCheck, Hexagon, Database } from 'lucide-react';

export default function PrototypeArchives() {
  const { data: archives = [], isLoading } = useQuery({
    queryKey: ['prototype-archives'],
    queryFn: () => base44.entities.Memory.filter(
      { type: 'observation', keywords: 'prototype_archive' },
      '-created_date',
      50
    ),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Archive className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 text-xs font-semibold">Prototype Archives</span>
          <Badge className="text-[8px] bg-amber-500/15 text-amber-300 border-amber-500/30">IMMUTABLE</Badge>
        </div>
        <p className="text-white/40 text-[10px] leading-relaxed">
          Every experiment snapshot is stored here as a constitutional Memory record.
          Archives cannot be deleted or modified — they serve as proof of the experimental process.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : archives.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
          <Database className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-white/30 text-xs">No snapshots archived yet. Take the first snapshot to begin.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {archives.map(archive => {
            let meta = {};
            try { meta = JSON.parse(archive.context || '{}'); } catch {}
            return (
              <div key={archive.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hexagon className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-white text-xs font-medium">{meta.label || 'Heptagon Snapshot'}</span>
                  </div>
                  <Badge className="text-[8px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                    <FileCheck className="w-2.5 h-2.5 mr-0.5" /> archived
                  </Badge>
                </div>
                <p className="text-white/40 text-[10px] leading-relaxed">{archive.content}</p>
                <div className="flex items-center gap-3 text-[9px] text-white/20">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(archive.created_date).toLocaleString()}
                  </span>
                  {meta.version && <span>v{meta.version}</span>}
                  {meta.leaves_cloned && <span>{meta.leaves_cloned} leaves cloned</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}