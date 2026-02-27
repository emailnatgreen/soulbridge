import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Flame, UserX, TrendingDown, Clock } from 'lucide-react';

const ALERT_ICONS = {
  burnout_risk: Flame,
  workload_overload: Clock,
  low_satisfaction: TrendingDown,
  declining_performance: TrendingDown,
  social_isolation: UserX,
  default: AlertTriangle
};

const SEVERITY_STYLES = {
  critical: 'bg-red-500/15 border-red-500/40 text-red-300',
  high:     'bg-orange-500/15 border-orange-500/40 text-orange-300',
  medium:   'bg-yellow-500/15 border-yellow-500/40 text-yellow-300',
  low:      'bg-blue-500/15 border-blue-500/40 text-blue-300'
};

const BADGE_STYLES = {
  critical: 'bg-red-500/20 text-red-400',
  high:     'bg-orange-500/20 text-orange-400',
  medium:   'bg-yellow-500/20 text-yellow-400',
  low:      'bg-blue-500/20 text-blue-400'
};

export default function MentorshipWellbeingAlert({ alert, agentName, role }) {
  const Icon = ALERT_ICONS[alert.alert_type] || ALERT_ICONS.default;
  return (
    <div className={`p-3 rounded-lg border flex items-start gap-3 ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium}`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white">{agentName}</span>
          <Badge className="text-xs">{role}</Badge>
          <Badge className={`text-xs ${BADGE_STYLES[alert.severity]}`}>{alert.severity}</Badge>
        </div>
        <div className="text-xs mt-0.5 capitalize">{alert.alert_type.replace(/_/g, ' ')}</div>
        {alert.description && (
          <div className="text-xs text-white/60 mt-1">{alert.description}</div>
        )}
      </div>
    </div>
  );
}