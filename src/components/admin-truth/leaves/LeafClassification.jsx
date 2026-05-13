import React from 'react';
import { Badge } from '@/components/ui/badge';
import LeafShell from './LeafShell';

const PRIORITY_COLORS = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const DOMAIN_COLORS = {
  security: 'bg-red-500/10 text-red-300 border-red-500/20',
  ux: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  logic: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  governance: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
};

export default function LeafClassification({ leaf, data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return <LeafShell leaf={leaf} />;

  return (
    <LeafShell leaf={leaf}>
      <div className="space-y-1.5">
        {data.map((item, i) => (
          <div key={i} className="rounded bg-white/[0.03] border border-white/5 p-2.5 text-xs">
            <p className="text-white/80 font-medium">{item.title}</p>
            {item.description && <p className="text-white/50 mt-1">{item.description}</p>}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.item_type && <Badge className="text-[8px] bg-white/5 text-white/50 border-white/10">{item.item_type}</Badge>}
              {item.domain && <Badge className={`text-[8px] ${DOMAIN_COLORS[item.domain] || 'bg-white/5 text-white/40 border-white/10'}`}>{item.domain}</Badge>}
              {item.priority && <Badge className={`text-[8px] ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>{item.priority}</Badge>}
            </div>
          </div>
        ))}
      </div>
    </LeafShell>
  );
}