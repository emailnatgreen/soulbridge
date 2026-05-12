import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Heart, Leaf, Clock } from 'lucide-react';

const VERDICT_STYLE = {
  ALLOW: 'bg-green-500/20 text-green-300 border-green-500/30',
  MODERATE: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  WITHHOLD: 'bg-red-500/20 text-red-300 border-red-500/30',
  REPAIR: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  PENDING: 'bg-white/10 text-white/40 border-white/20',
};

const VERDICT_LABEL = {
  ALLOW: 'Symbiotic',
  MODERATE: 'Correctable',
  WITHHOLD: 'Necrotic',
  REPAIR: 'Transitional',
  PENDING: 'Awaiting',
};

export default function EmpathyTopBar({ lastDecision }) {
  let ctx = {};
  let timeLabel = '—';
  let verdict = 'PENDING';

  if (lastDecision) {
    try { ctx = JSON.parse(lastDecision.context || '{}'); } catch {}
    timeLabel = new Date(lastDecision.created_date).toLocaleTimeString();
    verdict = ctx.gate_verdict || 'PENDING';
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-pink-500/15 bg-pink-500/[0.03] px-3 py-2">
      <div className="flex items-center gap-1.5 mr-2">
        <Heart className="w-4 h-4 text-pink-400" />
        <span className="text-xs font-semibold text-white/70">Empathy Layer</span>
        <Badge className="text-[9px] bg-pink-500/15 text-pink-300 border-pink-500/30">Phase 8</Badge>
      </div>
      <Badge className="text-[9px] bg-white/5 text-white/50 border-white/10">
        <Leaf className="w-2.5 h-2.5 mr-1" />
        Score: {ctx.empathy_score ?? '—'}
      </Badge>
      <Badge className="text-[9px] bg-white/5 text-white/50 border-white/10">
        <Clock className="w-2.5 h-2.5 mr-1" />
        {timeLabel}
      </Badge>
      <Badge className={`text-[9px] border font-semibold ${VERDICT_STYLE[verdict] || VERDICT_STYLE.PENDING}`}>
        {verdict} — {VERDICT_LABEL[verdict] || 'Unknown'}
      </Badge>
    </div>
  );
}