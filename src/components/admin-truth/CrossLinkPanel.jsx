import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, AlertTriangle, ShieldAlert, FileWarning, ChevronDown, ChevronUp } from 'lucide-react';
import { crossLinkInvestigations } from '@/lib/investigationMemory';

const SEVERITY_DOT = {
  critical: 'bg-red-400',
  high: 'bg-amber-400',
  medium: 'bg-slate-400',
  low: 'bg-emerald-400',
};

function PatternRow({ item, type }) {
  const Icon = type === 'risk' ? AlertTriangle : type === 'contradiction' ? ShieldAlert : FileWarning;
  const color = type === 'risk' ? 'text-red-400' : type === 'contradiction' ? 'text-amber-400' : 'text-cyan-400';

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
      <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-slate-300 text-[10px] font-medium truncate">{item.title || item.reason}</p>
          <Badge className="text-[7px] bg-violet-500/10 text-violet-300 border-violet-500/20 flex-shrink-0">
            ×{item.count}
          </Badge>
          {item.severity && (
            <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[item.severity] || SEVERITY_DOT.medium} flex-shrink-0`} />
          )}
        </div>
        <p className="text-slate-500 text-[9px] mt-0.5">
          Found in {item.count} investigation{item.count > 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

export default function CrossLinkPanel({ investigations }) {
  const [expanded, setExpanded] = useState(false);
  const crossLinks = useMemo(() => crossLinkInvestigations(investigations), [investigations]);

  const totalPatterns = crossLinks.risks.length + crossLinks.contradictions.length + crossLinks.waivers.length;
  const strongPatterns = crossLinks.patterns.length;

  if (totalPatterns === 0) {
    return (
      <Card className="bg-slate-900/80 border-slate-700/60">
        <CardContent className="py-4 px-4">
          <div className="flex items-center gap-2 text-slate-500 text-[10px]">
            <Link2 className="w-3.5 h-3.5" />
            <span>No cross-investigation patterns detected yet (need 2+ investigations with shared items)</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/80 border-slate-700/60">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-[11px] flex items-center gap-1.5 text-slate-300">
          <Link2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="uppercase tracking-wider">Cross-Link Intelligence</span>
          <Badge className="text-[7px] bg-cyan-500/10 text-cyan-300 border-cyan-500/20 ml-auto">
            {totalPatterns} patterns
          </Badge>
          {strongPatterns > 0 && (
            <Badge className="text-[7px] bg-red-500/10 text-red-300 border-red-500/20">
              {strongPatterns} strong
            </Badge>
          )}
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-200 ml-1">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="px-4 pb-3 space-y-3">
          {/* Recurring Risks */}
          {crossLinks.risks.length > 0 && (
            <div>
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold mb-1">Recurring Risks</p>
              {crossLinks.risks.slice(0, 8).map((r, i) => (
                <PatternRow key={i} item={r} type="risk" />
              ))}
            </div>
          )}

          {/* Recurring Contradictions */}
          {crossLinks.contradictions.length > 0 && (
            <div>
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold mb-1">Recurring Contradictions</p>
              {crossLinks.contradictions.slice(0, 8).map((c, i) => (
                <PatternRow key={i} item={c} type="contradiction" />
              ))}
            </div>
          )}

          {/* Recurring Waivers */}
          {crossLinks.waivers.length > 0 && (
            <div>
              <p className="text-slate-400 text-[8px] uppercase tracking-wider font-semibold mb-1">Recurring Waivers</p>
              {crossLinks.waivers.slice(0, 8).map((w, i) => (
                <PatternRow key={i} item={w} type="waiver" />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}