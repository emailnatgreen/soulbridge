import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldX, ChevronDown, ChevronUp } from 'lucide-react';
import SpindleNodeVotesPanel from './SpindleNodeVotesPanel';

export default function SpindleDecisionFeed({ decisions, loading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return <div className="text-white/30 text-xs text-center py-6">Loading decisions…</div>;
  }
  if (!decisions || decisions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/20 text-xs">No Spindle decisions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-white/30 uppercase tracking-wider">Recent Verdicts</p>
      {decisions.map((d) => {
        let ctx;
        try { ctx = JSON.parse(d.context || '{}'); } catch { ctx = {}; }
        const isPass = ctx.verdict === 'PASS';
        const isExpanded = expandedId === d.id;

        return (
          <div key={d.id} className="space-y-1">
            <Card
              className="bg-white/[0.03] border-white/10 cursor-pointer hover:bg-white/[0.05] transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : d.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                {isPass
                  ? <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                  : <ShieldX className="w-4 h-4 text-red-400 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] border ${isPass ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                      {ctx.verdict}
                    </Badge>
                    <span className="text-[10px] text-white/30 truncate">
                      {d.related_entity_id?.slice(0, 8)}…
                    </span>
                    <span className="text-[10px] text-white/20 ml-auto shrink-0">
                      {new Date(d.created_date).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{ctx.reason}</p>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-white/20 shrink-0" />
                }
              </CardContent>
            </Card>
            {isExpanded && <SpindleNodeVotesPanel decision={d} />}
          </div>
        );
      })}
    </div>
  );
}