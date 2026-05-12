import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function SpindleNodeVotesPanel({ decision }) {
  if (!decision) return null;

  let ctx;
  try { ctx = JSON.parse(decision.context || '{}'); } catch { ctx = {}; }

  // Node votes are stored in the most recent live evaluation — not in Memory.
  // This panel visualises a selected decision's high-level data from the Memory context.
  const isPass = ctx.verdict === 'PASS';

  return (
    <Card className="bg-white/[0.03] border-white/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPass
              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
              : <XCircle className="w-4 h-4 text-red-400" />
            }
            <span className={`text-sm font-semibold ${isPass ? 'text-green-300' : 'text-red-300'}`}>
              {ctx.verdict || 'UNKNOWN'}
            </span>
          </div>
          <Badge className="text-[9px] bg-white/5 text-white/40 border-white/10">
            {new Date(decision.created_date).toLocaleString()}
          </Badge>
        </div>

        <p className="text-xs text-white/50">{ctx.reason}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
          <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
            <p className="text-white/30">Monkey</p>
            <p className={`font-semibold ${ctx.monkey_verdict === 'PASS' ? 'text-green-300' : 'text-red-300'}`}>
              {ctx.monkey_verdict}
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
            <p className="text-white/30">Sincerity</p>
            <p className={`font-semibold ${ctx.sincerity_score >= 50 ? 'text-green-300' : 'text-red-300'}`}>
              {ctx.sincerity_score}/100
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
            <p className="text-white/30">Consensus</p>
            <p className={`font-semibold ${ctx.consensus_verdict === 'CONSENSUS_PASS' ? 'text-green-300' : 'text-red-300'}`}>
              {ctx.consensus_verdict?.replace('CONSENSUS_', '')}
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 border border-white/5">
            <p className="text-white/30">Nodes</p>
            <p className={`font-semibold ${ctx.consistent_count >= 6 ? 'text-green-300' : 'text-orange-300'}`}>
              {ctx.consistent_count}/8
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}