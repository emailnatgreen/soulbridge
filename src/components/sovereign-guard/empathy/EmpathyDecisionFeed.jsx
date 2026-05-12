import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, AlertTriangle, ShieldX, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

const VERDICT_CONFIG = {
  ALLOW: { icon: ShieldCheck, color: 'text-green-400', badge: 'bg-green-500/15 text-green-300 border-green-500/30' },
  MODERATE: { icon: AlertTriangle, color: 'text-amber-400', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  WITHHOLD: { icon: ShieldX, color: 'text-red-400', badge: 'bg-red-500/15 text-red-300 border-red-500/30' },
  REPAIR: { icon: Wrench, color: 'text-purple-400', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
};

export default function EmpathyDecisionFeed({ decisions, loading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) return <div className="text-white/30 text-xs text-center py-6">Loading decisions…</div>;
  if (!decisions || decisions.length === 0) {
    return <div className="text-center py-8"><p className="text-white/20 text-xs">No empathy decisions recorded yet.</p></div>;
  }

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardContent className="p-0">
        <div className="px-3 py-2 border-b border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Recent Empathy Verdicts</p>
        </div>
        <ScrollArea className="max-h-[320px]">
          {decisions.map((d) => {
            let ctx = {};
            try { ctx = JSON.parse(d.context || '{}'); } catch {}
            const verdict = ctx.gate_verdict || 'PENDING';
            const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.WITHHOLD;
            const Icon = config.icon;
            const isExpanded = expandedId === d.id;

            return (
              <div key={d.id} className="border-b border-white/[0.03]">
                <div
                  className="px-3 py-2.5 flex items-center gap-3 hover:bg-white/[0.03] cursor-pointer transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : d.id)}
                >
                  <Icon className={`w-4 h-4 ${config.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[9px] border ${config.badge}`}>{verdict}</Badge>
                      <span className="text-[10px] text-white/30">Score: {ctx.empathy_score ?? '—'}</span>
                      <span className="text-[10px] text-white/20 ml-auto shrink-0">
                        {new Date(d.created_date).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/40 truncate mt-0.5">{ctx.gate_reason}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white/20 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20 shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {/* Score breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                      <div className="bg-white/[0.03] rounded p-2 border border-white/5">
                        <p className="text-white/25">Empathy</p>
                        <p className="font-semibold text-pink-300">{ctx.empathy_score}/100</p>
                      </div>
                      <div className="bg-white/[0.03] rounded p-2 border border-white/5">
                        <p className="text-white/25">History</p>
                        <p className="font-semibold text-purple-300">{ctx.regressive_history ?? '—'}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded p-2 border border-white/5">
                        <p className="text-white/25">Cluster</p>
                        <p className="font-semibold text-emerald-300">{ctx.cluster_health ?? '—'}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded p-2 border border-white/5">
                        <p className="text-white/25">Atrophy Risk</p>
                        <p className={`font-semibold ${(ctx.atrophy_risk || 0) > 50 ? 'text-red-300' : 'text-green-300'}`}>
                          {ctx.atrophy_risk ?? '—'}
                        </p>
                      </div>
                    </div>
                    {/* Repair suggestions */}
                    {ctx.repair_suggestions && ctx.repair_suggestions.length > 0 && (
                      <div className="bg-purple-500/[0.05] rounded-lg p-2.5 border border-purple-500/10">
                        <p className="text-[9px] text-purple-300/60 uppercase tracking-wider mb-1">Repair Guidance</p>
                        <ul className="space-y-0.5">
                          {ctx.repair_suggestions.map((s, i) => (
                            <li key={i} className="text-[10px] text-white/40 flex items-start gap-1.5">
                              <span className="text-purple-400 mt-0.5">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Flags */}
                    <div className="flex gap-2">
                      {ctx.atrophy_flag && (
                        <Badge className="text-[8px] bg-red-500/10 text-red-300 border-red-500/20">Atrophy Detected</Badge>
                      )}
                      {ctx.repair_required && (
                        <Badge className="text-[8px] bg-purple-500/10 text-purple-300 border-purple-500/20">Repair Required</Badge>
                      )}
                      {ctx.repair_bonus > 0 && (
                        <Badge className="text-[8px] bg-green-500/10 text-green-300 border-green-500/20">Repair Bonus +{ctx.repair_bonus}</Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}