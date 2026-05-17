import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
import LeafShell from './LeafShell';
import SuggestedWeightBadge from '../SuggestedWeightBadge';

const PRIORITY_COLORS = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export default function LeafProposedActions({ leaf, data, grounding }) {
  if (!data || !Array.isArray(data) || data.length === 0) return <LeafShell leaf={leaf} grounding={grounding} />;

  // Group by action_group
  const groups = {};
  data.forEach(item => {
    const group = item.action_group || 'general';
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  });

  return (
    <LeafShell leaf={leaf} grounding={grounding}>
      <div className="space-y-3">
        {Object.entries(groups).map(([group, actions]) => (
          <div key={group} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Badge className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">{group}</Badge>
              <span className="text-slate-500 text-[9px]">{actions.length} action{actions.length > 1 ? 's' : ''}</span>
            </div>
            {actions.map((item, i) => (
              <div key={i} className="rounded bg-slate-800/60 border border-slate-700/50 p-2.5 text-xs ml-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5">
                    <ArrowRight className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-200 font-medium">{item.title}</p>
                  </div>
                  <Badge className={`text-[8px] flex-shrink-0 ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>{item.priority}</Badge>
                  <SuggestedWeightBadge weight={item.suggested_weight} category={item.weight_category} />
                </div>
                {item.description && <p className="text-slate-400 mt-1 ml-4">{item.description}</p>}
                {item.dependencies && item.dependencies !== 'none' && (
                  <p className="text-slate-500 text-[10px] mt-1 ml-4">Depends on: {item.dependencies}</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </LeafShell>
  );
}