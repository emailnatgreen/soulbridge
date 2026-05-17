import React from 'react';
import { Badge } from '@/components/ui/badge';
import LeafShell from './LeafShell';

const SOURCE_COLORS = {
  human: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  system: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  agent: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  external: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

export default function LeafRawData({ leaf, data, grounding }) {
  if (!data || !Array.isArray(data) || data.length === 0) return <LeafShell leaf={leaf} grounding={grounding} />;

  return (
    <LeafShell leaf={leaf} grounding={grounding}>
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={i} className="rounded bg-slate-800/60 border border-slate-700/50 p-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <p className="text-slate-200 font-medium">{item.title}</p>
              <Badge className={`text-[8px] flex-shrink-0 ${SOURCE_COLORS[item.source_type] || SOURCE_COLORS.system}`}>
                {item.source_type || 'system'}
              </Badge>
            </div>
            {item.description && <p className="text-slate-400 mt-1">{item.description}</p>}
          </div>
        ))}
      </div>
    </LeafShell>
  );
}