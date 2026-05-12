import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, ShieldX, AlertTriangle } from 'lucide-react';

const MONKEY_STYLE = {
  PASS: 'bg-green-500/15 text-green-300 border-green-500/30',
  BLOCK: 'bg-red-500/15 text-red-300 border-red-500/30',
  QUARANTINE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const BLOCK_SRC_SHORT = {
  consensus_failure: 'Consensus',
  low_sincerity: 'Sincerity',
  monkey_block: 'Monkey',
  monkey_quarantine: 'Quarantine',
};

function parseDecision(d) {
  let ctx = {};
  try { ctx = JSON.parse(d.context || '{}'); } catch { /* */ }
  return { ...d, ctx };
}

export default function LiveSpindleStream({ decisions, loading, onSelectDecision }) {
  if (loading) return <div className="text-white/30 text-xs text-center py-6">Loading stream…</div>;

  const parsed = (decisions || []).map(parseDecision);

  if (parsed.length === 0) {
    return <div className="text-center py-8"><p className="text-white/20 text-xs">No evaluations yet.</p></div>;
  }

  return (
    <Card className="bg-white/[0.02] border-white/10">
      <CardContent className="p-0">
        <div className="px-3 py-2 border-b border-white/5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Panel 1 — Live Spindle Stream</p>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-7 gap-1 px-3 py-1.5 border-b border-white/5 text-[9px] text-white/25 uppercase tracking-wider">
          <span>Time</span>
          <span>Action</span>
          <span>Monkey</span>
          <span>Sincerity</span>
          <span>Consensus</span>
          <span>Verdict</span>
          <span>Block Src</span>
        </div>

        <ScrollArea className="max-h-[280px]">
          {parsed.map((d) => {
            const c = d.ctx;
            const isPass = c.verdict === 'PASS';
            // Extract action label from content
            const actionMatch = d.content?.match(/Action:\s*(.+?)$/);
            const actionLabel = actionMatch ? actionMatch[1].slice(0, 30) : '—';

            return (
              <div
                key={d.id}
                onClick={() => onSelectDecision(d)}
                className="grid grid-cols-7 gap-1 px-3 py-2 border-b border-white/[0.03] hover:bg-white/[0.04] cursor-pointer transition-colors items-center text-[10px]"
              >
                <span className="text-white/30 font-mono">
                  {new Date(d.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-white/50 truncate">{actionLabel}</span>
                <Badge className={`text-[8px] border w-fit ${MONKEY_STYLE[c.monkey_verdict] || 'bg-white/10 text-white/40 border-white/20'}`}>
                  {c.monkey_verdict || '—'}
                </Badge>
                <span className={`font-semibold ${(c.sincerity_score || 0) >= 50 ? 'text-green-300' : 'text-red-300'}`}>
                  {c.sincerity_score ?? '—'}
                </span>
                <span className={`font-semibold ${c.consistent_count >= 6 ? 'text-green-300' : 'text-orange-300'}`}>
                  {c.consistent_count ?? '?'}/8 {c.consensus_verdict === 'CONSENSUS_PASS' ? 'PASS' : 'FAIL'}
                </span>
                <div className="flex items-center gap-1">
                  {isPass
                    ? <ShieldCheck className="w-3 h-3 text-green-400" />
                    : <ShieldX className="w-3 h-3 text-red-400" />
                  }
                  <span className={`font-semibold ${isPass ? 'text-green-300' : 'text-red-300'}`}>{c.verdict}</span>
                </div>
                <span className="text-white/30 truncate">
                  {c.block_source ? (BLOCK_SRC_SHORT[c.block_source] || c.block_source) : '—'}
                </span>
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}