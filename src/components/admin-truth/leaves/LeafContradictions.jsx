import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import LeafShell from './LeafShell';

const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export default function LeafContradictions({ leaf, data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return <LeafShell leaf={leaf} />;

  const integrityFlags = data.filter(c => c.integrity_flag);

  return (
    <LeafShell leaf={leaf}>
      {integrityFlags.length > 0 && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-2.5 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-red-300 text-xs font-semibold">{integrityFlags.length} integrity flag{integrityFlags.length > 1 ? 's' : ''} detected — trust assumptions broken</span>
        </div>
      )}
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={i} className={`rounded border p-2.5 text-xs ${item.integrity_flag ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/5'}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-white/80 font-medium">{item.title}</p>
              <div className="flex gap-1 flex-shrink-0">
                <Badge className={`text-[8px] ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.medium}`}>{item.severity}</Badge>
                {item.integrity_flag && <Badge className="text-[8px] bg-red-500/30 text-red-200 border-red-400/40">INTEGRITY</Badge>}
              </div>
            </div>
            {item.description && <p className="text-white/50 mt-1">{item.description}</p>}
            {item.category && <Badge className="text-[8px] mt-1 bg-white/5 text-white/40 border-white/10">{item.category}</Badge>}
          </div>
        ))}
      </div>
    </LeafShell>
  );
}