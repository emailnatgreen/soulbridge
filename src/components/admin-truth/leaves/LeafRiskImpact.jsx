import React from 'react';
import { Badge } from '@/components/ui/badge';
import LeafShell from './LeafShell';

const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const DOMAIN_COLORS = {
  security: 'bg-red-500/10 text-red-300 border-red-500/20',
  ux: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  logic: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  governance: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
};

function RiskBar({ score }) {
  const width = Math.min(Math.max(score || 0, 0), 10) * 10;
  const color = score >= 8 ? 'bg-red-500' : score >= 5 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-[9px] text-white/40">{score}/10</span>
    </div>
  );
}

export default function LeafRiskImpact({ leaf, data }) {
  if (!data || !Array.isArray(data) || data.length === 0) return <LeafShell leaf={leaf} />;

  const sorted = [...data].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  return (
    <LeafShell leaf={leaf}>
      <div className="space-y-1.5">
        {sorted.map((item, i) => (
          <div key={i} className={`rounded border p-2.5 text-xs ${item.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/5'}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-white/80 font-medium">{item.title}</p>
              <Badge className={`text-[8px] flex-shrink-0 ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.medium}`}>{item.severity}</Badge>
            </div>
            {item.description && <p className="text-white/50 mt-1">{item.description}</p>}
            <div className="flex items-center gap-3 mt-2">
              <RiskBar score={item.risk_score} />
              {item.risk_domain && <Badge className={`text-[8px] ${DOMAIN_COLORS[item.risk_domain] || 'bg-white/5 text-white/40 border-white/10'}`}>{item.risk_domain}</Badge>}
            </div>
            {item.impact_description && (
              <p className="text-white/30 text-[10px] mt-1.5 italic">Impact: {item.impact_description}</p>
            )}
          </div>
        ))}
      </div>
    </LeafShell>
  );
}