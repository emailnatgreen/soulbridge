import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldOff } from 'lucide-react';
import { getReadinessBadgeState } from '@/lib/exposureReadinessEngine';

const BADGE_CONFIG = {
  ready:   { icon: ShieldCheck, className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'EXPOSURE READY' },
  waiver:  { icon: ShieldAlert, className: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'WAIVER REQUIRED' },
  blocked: { icon: ShieldOff,   className: 'bg-red-500/15 text-red-300 border-red-500/30', label: 'NOT READY' },
};

export default function ExposureReadinessBadge({ result }) {
  const state = getReadinessBadgeState(result);
  const cfg = BADGE_CONFIG[state];
  const Icon = cfg.icon;

  return (
    <Badge className={`text-[9px] gap-1 ${cfg.className}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}