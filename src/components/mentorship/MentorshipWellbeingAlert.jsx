import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Flame, UserX, TrendingDown, Clock, Zap, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ProactiveNudgeButton from './ProactiveNudgeButton';

// Proactive scanner alert types — get gentle nudge, not heavy intervention
const PROACTIVE_ALERT_TYPES = new Set([
  'skill_trajectory_decline', 'skill_stagnation_risk', 'session_quality_drift',
  'engagement_drop', 'mentor_cancellation_spike', 'wellbeing_score_drift',
  'compound_early_risk', 'mentor_capacity_warning'
]);

const ALERT_ICONS = {
  burnout_risk: Flame,
  workload_overload: Clock,
  low_satisfaction: TrendingDown,
  declining_performance: TrendingDown,
  social_isolation: UserX,
  skill_trajectory_decline: TrendingDown,
  skill_stagnation_risk: TrendingDown,
  session_quality_drift: TrendingDown,
  engagement_drop: UserX,
  mentor_cancellation_spike: Clock,
  wellbeing_score_drift: TrendingDown,
  compound_early_risk: AlertTriangle,
  mentor_capacity_warning: Clock,
  default: AlertTriangle
};

const SEVERITY_STYLES = {
  critical: 'bg-red-500/15 border-red-500/40',
  high:     'bg-orange-500/15 border-orange-500/40',
  medium:   'bg-yellow-500/15 border-yellow-500/40',
  low:      'bg-blue-500/15 border-blue-500/40'
};

const BADGE_STYLES = {
  critical: 'bg-red-500/20 text-red-400',
  high:     'bg-orange-500/20 text-orange-400',
  medium:   'bg-yellow-500/20 text-yellow-400',
  low:      'bg-blue-500/20 text-blue-400'
};

export default function MentorshipWellbeingAlert({ alert, agentName, role }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const Icon = ALERT_ICONS[alert.alert_type] || ALERT_ICONS.default;

  const handleIntervene = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('mentorshipIntervention', {
        agent_id: alert.agent_id,
        alert_type: alert.alert_type,
        severity: alert.severity,
        role,
        description: alert.description,
        relationship_id: alert.relationship_id || null
      });
      setResult(response.data?.intervention);
      setExpanded(true);
      toast.success('Intervention plan dispatched to agent');
    } catch (e) {
      toast.error('Intervention failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-lg border ${SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.medium} overflow-hidden`}>
      {/* Main row */}
      <div className="p-3 flex items-start gap-3">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/70" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{agentName}</span>
            <Badge className="text-xs bg-white/10 text-white/70">{role}</Badge>
            <Badge className={`text-xs ${BADGE_STYLES[alert.severity]}`}>{alert.severity}</Badge>
            <span className="text-xs text-white/40 capitalize">{alert.alert_type.replace(/_/g, ' ')}</span>
          </div>
          {alert.description && (
            <div className="text-xs text-white/60 mt-1">{alert.description}</div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {result && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-white/40 hover:text-white h-7 px-2"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          )}
          {result ? (
            <Badge className="bg-green-500/20 text-green-400 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Dispatched
            </Badge>
          ) : PROACTIVE_ALERT_TYPES.has(alert.alert_type) ? (
            <ProactiveNudgeButton alert={alert} agentId={alert.agent_id} />
          ) : (
            <Button
              size="sm"
              onClick={handleIntervene}
              disabled={loading}
              className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {loading ? '' : 'Intervene'}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded intervention result */}
      {result && expanded && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3 bg-black/20">
          <div>
            <div className="text-xs font-semibold text-purple-300 mb-1">{result.intervention_title}</div>
            <p className="text-xs text-white/70 italic">"{result.check_in_message}"</p>
          </div>

          {result.root_cause && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Root Cause</div>
              <p className="text-xs text-white/60">{result.root_cause}</p>
            </div>
          )}

          {result.recommended_actions?.length > 0 && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Actions</div>
              <div className="space-y-1">
                {result.recommended_actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <span className="text-purple-400 font-bold mt-0.5">→</span>
                    <span>{a.action}
                      <span className="ml-1 text-white/30">({a.type} · {a.executor})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.relationship_adjustment?.suggest_pause && (
            <Badge className="bg-amber-500/20 text-amber-400 text-xs">⏸ Mentorship pause recommended</Badge>
          )}
          {result.relationship_adjustment?.recommend_mediation && (
            <Badge className="bg-blue-500/20 text-blue-400 text-xs">🤝 Mediation recommended</Badge>
          )}

          {result.expected_improvement && (
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Expected Outcome</div>
              <p className="text-xs text-white/60">{result.expected_improvement}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}