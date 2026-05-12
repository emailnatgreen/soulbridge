import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, Zap } from 'lucide-react';

const STATUS_STYLES = {
  BLOCK: 'bg-red-500/20 text-red-300 border-red-500/30',
  PASS: 'bg-green-500/20 text-green-300 border-green-500/30',
  NONE: 'bg-white/10 text-white/40 border-white/20',
};

export default function SpindleTopBar({ lastDecision }) {
  let ctx = {};
  let agentLabel = '—';
  let timeLabel = '—';
  let statusKey = 'NONE';
  let statusLabel = 'AWAITING';

  if (lastDecision) {
    try { ctx = JSON.parse(lastDecision.context || '{}'); } catch { /* */ }
    agentLabel = lastDecision.related_entity_id?.slice(0, 10) + '…' || '—';
    timeLabel = new Date(lastDecision.created_date).toLocaleTimeString();
    statusKey = ctx.verdict || 'NONE';
    statusLabel = ctx.verdict === 'PASS' ? 'CLEAR' : ctx.verdict === 'BLOCK' ? 'BLOCKED' : 'AWAITING';
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-purple-500/15 bg-purple-500/[0.03] px-3 py-2">
      <div className="flex items-center gap-1.5 mr-2">
        <Shield className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold text-white/70">SpindleMonitor</span>
        <span className="text-[10px] text-white/25">— Sovereign Guard</span>
      </div>
      <Badge className="text-[9px] bg-white/5 text-white/50 border-white/10">
        Agent: {agentLabel}
      </Badge>
      <Badge className="text-[9px] bg-white/5 text-white/50 border-white/10">
        <Clock className="w-2.5 h-2.5 mr-1" />
        {timeLabel}
      </Badge>
      <Badge className={`text-[9px] border font-semibold ${STATUS_STYLES[statusKey] || STATUS_STYLES.NONE}`}>
        <Zap className="w-2.5 h-2.5 mr-1" />
        {statusLabel}
      </Badge>
    </div>
  );
}