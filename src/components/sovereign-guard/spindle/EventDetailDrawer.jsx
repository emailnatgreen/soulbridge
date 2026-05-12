import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ShieldCheck, ShieldX, FileText, AlertTriangle, Link2 } from 'lucide-react';

const NODE_LABELS = [
  'Source', 'Sentinel', 'Lore', 'Truth Weaver',
  'Did It', 'Soulbridge', 'Human', 'Code',
];

export default function EventDetailDrawer({ decision, onClose }) {
  if (!decision) return null;

  let ctx = {};
  try { ctx = JSON.parse(decision.context || '{}'); } catch { /* */ }
  const isPass = ctx.verdict === 'PASS';
  const consistentCount = ctx.consistent_count ?? 0;

  // Extract action from content
  const actionMatch = decision.content?.match(/Action:\s*(.+?)$/);
  const actionLabel = actionMatch ? actionMatch[1] : 'Unknown action';

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-slate-950 border-l border-purple-500/20 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPass ? <ShieldCheck className="w-5 h-5 text-green-400" /> : <ShieldX className="w-5 h-5 text-red-400" />}
                <h3 className="text-sm font-semibold text-white">Spindle Evaluation</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white/40 hover:text-white h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <Badge className="text-[9px] bg-white/5 text-white/30 border-white/10">
              {new Date(decision.created_date).toLocaleString()}
            </Badge>

            {/* Summary */}
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-3 space-y-2">
                <p className="text-[10px] text-white/25 uppercase tracking-wider">Summary</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-white/[0.02] rounded p-2 border border-white/5">
                    <p className="text-white/25">Monkey Verdict</p>
                    <p className={`font-semibold ${ctx.monkey_verdict === 'PASS' ? 'text-green-300' : 'text-red-300'}`}>
                      {ctx.monkey_verdict}
                    </p>
                  </div>
                  <div className="bg-white/[0.02] rounded p-2 border border-white/5">
                    <p className="text-white/25">Sincerity Score</p>
                    <p className={`font-semibold ${(ctx.sincerity_score || 0) >= 50 ? 'text-green-300' : 'text-red-300'}`}>
                      {ctx.sincerity_score}/100
                    </p>
                  </div>
                  <div className="bg-white/[0.02] rounded p-2 border border-white/5">
                    <p className="text-white/25">Consensus</p>
                    <p className={`font-semibold ${ctx.consensus_verdict === 'CONSENSUS_PASS' ? 'text-green-300' : 'text-red-300'}`}>
                      {ctx.consensus_verdict?.replace('CONSENSUS_', '')}
                    </p>
                  </div>
                  <div className="bg-white/[0.02] rounded p-2 border border-white/5">
                    <p className="text-white/25">Final Verdict</p>
                    <p className={`font-semibold ${isPass ? 'text-green-300' : 'text-red-300'}`}>
                      {ctx.verdict}
                    </p>
                  </div>
                </div>
                {ctx.block_source && (
                  <div className="bg-red-500/[0.05] rounded p-2 border border-red-500/10">
                    <p className="text-[9px] text-red-300/50">Block Source</p>
                    <p className="text-[10px] text-red-300 font-semibold">{ctx.block_source}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action */}
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Action Evaluated</p>
                <p className="text-xs text-white/60">{actionLabel}</p>
              </CardContent>
            </Card>

            {/* Node Votes */}
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">Node Votes ({consistentCount}/8)</p>
                <div className="space-y-1">
                  {NODE_LABELS.map((name, i) => {
                    const approved = i < consistentCount;
                    return (
                      <div key={i} className="flex items-center gap-2 text-[10px] py-1 border-b border-white/[0.03]">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${approved ? 'bg-green-400' : 'bg-red-400'}`} />
                        <span className="text-white/50 w-20">{name}</span>
                        <span className={`font-semibold ${approved ? 'text-green-300' : 'text-red-300'}`}>
                          {approved ? 'Approve' : 'Deny'}
                        </span>
                        <span className="text-white/20 text-[9px] ml-auto truncate">
                          {approved ? 'Delta within tolerance' : 'Delta exceeds tolerance'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Reason */}
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">Reason</p>
                <p className="text-[10px] text-white/50 leading-relaxed">{ctx.reason}</p>
              </CardContent>
            </Card>

            {/* Artifacts */}
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-3">
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">
                  <FileText className="w-3 h-3 inline mr-1" />
                  Artifacts
                </p>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5 text-purple-300/60">
                    <Link2 className="w-3 h-3" />
                    <span>Memory Record: {decision.id}</span>
                  </div>
                  {ctx.verdict === 'BLOCK' && (
                    <div className="flex items-center gap-1.5 text-red-300/60">
                      <AlertTriangle className="w-3 h-3" />
                      <span>TripwireEvent created on BLOCK</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-white/30">
                    <Link2 className="w-3 h-3" />
                    <span>Agent: {decision.related_entity_id}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}