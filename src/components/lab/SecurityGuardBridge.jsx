import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield, Activity, AlertTriangle, Clock, Radio, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const RISK_COLORS = {
  HEIGHTENED: 'bg-red-500/15 text-red-300 border-red-500/30',
  NORMAL: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

function RecommendationRow({ label, value, isElevated }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-slate-400">{label}</span>
      <span className={`text-[10px] font-mono ${isElevated ? 'text-amber-300' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}

export default function SecurityGuardBridge() {
  const [expanded, setExpanded] = useState(false);

  const { data: signal, isLoading, error } = useQuery({
    queryKey: ['guard-bridge'],
    queryFn: () => base44.functions.invoke('securityGuardBridge', { action: 'assess' }).then(r => r.data),
    refetchInterval: 120000, // Poll every 2 minutes
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h2 className="text-white font-semibold">Security Browser Guard Bridge</h2>
        </div>
        <div className="h-20 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-slate-900/60 p-5">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          <h2 className="text-white font-semibold">Security Browser Guard Bridge</h2>
          <Badge className="bg-red-500/15 text-red-300 border-red-500/20 text-[10px] ml-auto">offline</Badge>
        </div>
        <p className="text-xs text-red-400/70 mt-2">{error?.message || 'Unable to reach bridge'}</p>
      </div>
    );
  }

  const isHeightened = signal.heightened;
  const recs = signal.guard_recommendations;

  return (
    <div className={`rounded-2xl border ${isHeightened ? 'border-red-500/20' : 'border-cyan-500/20'} bg-slate-900/60 p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Shield className={`w-5 h-5 ${isHeightened ? 'text-red-400' : 'text-cyan-400'}`} />
          Security Browser Guard Bridge
        </h2>
        <div className="flex items-center gap-2">
          <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/20 text-[9px]">
            <Eye className="w-2.5 h-2.5 mr-1" />
            {recs.action_mode === 'log_only' ? 'Log Only' : 'Active'}
          </Badge>
          <Badge className={`${RISK_COLORS[signal.risk_level]} text-[10px]`}>
            {signal.risk_level}
          </Badge>
        </div>
      </div>

      {/* Risk Banner */}
      <div className={`rounded-xl p-3 border mb-3 ${RISK_COLORS[signal.risk_level]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4" />
            <span className="text-sm font-semibold">
              Threat Score: {signal.threat_score}/100
            </span>
            <span className="text-[10px] opacity-70">(threshold: {signal.threshold})</span>
          </div>
          {signal.stale && (
            <span className="text-[9px] text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> stale
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
          <Activity className="w-3 h-3 text-cyan-400 mx-auto mb-1" />
          <p className="text-white text-sm font-semibold">{signal.live_tripwire.active_count}</p>
          <p className="text-[9px] text-slate-500">Active Events</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
          <AlertTriangle className="w-3 h-3 text-red-400 mx-auto mb-1" />
          <p className="text-white text-sm font-semibold">
            {signal.live_tripwire.severity_breakdown.critical + signal.live_tripwire.severity_breakdown.high}
          </p>
          <p className="text-[9px] text-slate-500">High/Critical</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
          <Clock className="w-3 h-3 text-purple-400 mx-auto mb-1" />
          <p className="text-white text-sm font-semibold">
            {signal.last_analysis.age_minutes != null ? `${signal.last_analysis.age_minutes}m` : '—'}
          </p>
          <p className="text-[9px] text-slate-500">Last CA Age</p>
        </div>
      </div>

      {/* Expand for Guard Recommendations */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-slate-400 hover:text-white transition-colors flex items-center gap-1"
      >
        {expanded ? '▾' : '▸'} Guard Recommendations
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg bg-white/[0.02] border border-white/5 p-3 space-y-0.5">
          <RecommendationRow label="CAPTCHA Difficulty" value={recs.captcha_difficulty} isElevated={recs.captcha_difficulty === 'elevated'} />
          <RecommendationRow label="Phishing Sensitivity" value={recs.phishing_sensitivity} isElevated={recs.phishing_sensitivity === 'high'} />
          <RecommendationRow label="Trust Modifier" value={recs.behavioral_trust_modifier} isElevated={recs.behavioral_trust_modifier < 0} />
          <RecommendationRow label="Action Mode" value={recs.action_mode} isElevated={false} />
          <div className="pt-2 border-t border-white/5 mt-2">
            <p className="text-[9px] text-slate-500">
              Last CA: {signal.last_analysis.threat_level} · Max {signal.last_analysis.max_score}/100 · Avg {signal.last_analysis.avg_score}/100
            </p>
          </div>
        </div>
      )}
    </div>
  );
}