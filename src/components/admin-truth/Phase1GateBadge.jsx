import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, AlertTriangle } from 'lucide-react';
import { getGateBadgeState } from '@/lib/phase1CompletionGate';

const BADGE_CONFIG = {
  open:       { icon: Unlock,        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'GATE OPEN' },
  overridden: { icon: AlertTriangle, className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',   label: 'GATE WAIVED' },
  closed:     { icon: Lock,          className: 'bg-red-500/15 text-red-300 border-red-500/30',           label: 'GATE LOCKED' },
};

export default function Phase1GateBadge({ result }) {
  const state = getGateBadgeState(result);
  const cfg = BADGE_CONFIG[state];
  const Icon = cfg.icon;

  return (
    <Badge className={`text-[9px] gap-1 ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}