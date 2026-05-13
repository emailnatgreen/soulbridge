import React from 'react';
import { Badge } from '@/components/ui/badge';
import LeafShell from './LeafShell';

const LINK_TYPE_COLORS = {
  node: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  agent: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  feature: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  historical: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export default function LeafCrossLinks({ leaf, data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return <LeafShell leaf={leaf} />;

  return (
    <LeafShell leaf={leaf}>
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={i} className="rounded bg-slate-800/60 border border-slate-700/50 p-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <p className="text-slate-200 font-medium">{item.title}</p>
              <Badge className={`text-[8px] flex-shrink-0 ${LINK_TYPE_COLORS[item.link_type] || 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                {item.link_type || 'related'}
              </Badge>
            </div>
            {item.description && <p className="text-slate-400 mt-1">{item.description}</p>}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.linked_to && <Badge className="text-[8px] bg-purple-600/20 text-purple-300 border-purple-500/30">→ {item.linked_to}</Badge>}
              {item.relationship && <Badge className="text-[8px] bg-slate-700/50 text-slate-300 border-slate-600">{item.relationship}</Badge>}
            </div>
          </div>
        ))}
      </div>
    </LeafShell>
  );
}