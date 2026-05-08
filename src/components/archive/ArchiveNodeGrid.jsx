import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Fingerprint, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ArchiveNodeGrid() {
  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ['archive-nodes'],
    queryFn: () => base44.entities.QuadShardDID.list('-created_date', 50),
  });

  if (isLoading) {
    return <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array(8).fill(0).map((_, i) => <div key={i} className="h-28 bg-slate-800/40 rounded-xl animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-red-400" />
        <span className="text-white/60 text-xs">Archived Node Registry — {nodes.length} records · Read-only snapshot</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {nodes.map(node => (
          <div key={node.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-slate-400" />
              <span className="text-white text-sm font-medium truncate">{node.role || node.did_id}</span>
            </div>
            <Badge className={`text-[9px] ${
              node.status === 'Sovereign_Active' ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
            }`}>
              {node.status}
            </Badge>
            <p className="text-white/30 text-[10px] font-mono truncate">{node.did_id}</p>
            <p className="text-white/20 text-[9px]">Sigs: {node.signatures_collected || 0}/{node.signatures_required || 4}</p>
          </div>
        ))}
      </div>
      {nodes.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No node records in archive.</p>}
    </div>
  );
}