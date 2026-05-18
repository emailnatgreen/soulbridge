import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, Loader2, ScanLine, RefreshCcw, AlertTriangle, Globe, Network, Users, Cpu, Lightbulb } from 'lucide-react';

const RESULT_COLORS = {
  healthy:              { bg: 'border-emerald-500/20 bg-emerald-500/5', text: 'text-emerald-400', label: 'Healthy' },
  warning:              { bg: 'border-amber-500/20 bg-amber-500/5',     text: 'text-amber-400',   label: 'Warning' },
  critical:             { bg: 'border-red-500/20 bg-red-500/5',         text: 'text-red-400',     label: 'Critical' },
  single_point_failure: { bg: 'border-orange-500/20 bg-orange-500/5',   text: 'text-orange-400',  label: 'SPF Risk' },
};

const DIMENSION_ICONS = {
  geographic:   Globe,
  logical:      Cpu,
  connectivity: Network,
  operator:     Users,
};

function ScoreBar({ label, score, icon: Icon }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';
  const barColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3 h-3 ${color}`} />
          <span className="text-white/60 text-[10px]">{label}</span>
        </div>
        <span className={`text-[10px] font-bold ${color}`}>{score}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function BraidNodeDiversityPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['braid-node-diversity-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('braidNodeDiversityAudit', { action: 'status' });
      return res.data || res;
    },
    refetchInterval: 120000,
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('braidNodeDiversityAudit', { action: 'audit' });
      return res.data || res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['braid-node-diversity-status'] }),
  });

  const auditResult = auditMutation.data;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span className="text-white/40 text-xs">Loading Braid Node Diversity...</span>
        </div>
      </div>
    );
  }

  const overallScore = data?.overall_diversity_score || 0;
  const isHealthy = (data?.critical_signals || 0) === 0;

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-slate-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-400" />
          <h3 className="text-white font-semibold text-sm">Braid Node Diversity</h3>
          <Badge className={`text-[8px] ${isHealthy
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-300 border-red-500/30'
          }`}>
            {isHealthy ? 'DIVERSE' : 'AT RISK'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            onClick={() => auditMutation.mutate()}
            disabled={auditMutation.isPending}
            className="text-white/40 hover:text-white h-7 text-[10px] gap-1"
          >
            {auditMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
            Full Audit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-white/40 hover:text-white h-7">
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <div className={`rounded-lg border p-3 ${isHealthy ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
              overallScore >= 70 ? 'border-emerald-400 text-emerald-400' : overallScore >= 40 ? 'border-amber-400 text-amber-400' : 'border-red-400 text-red-400'
            }`}>
              <span className="text-sm font-bold">{overallScore}</span>
            </div>
          </div>
          <div>
            <p className="text-white text-sm font-semibold">
              {overallScore >= 70 ? 'Braid Diversity Healthy' : overallScore >= 40 ? 'Diversity Improvements Needed' : 'Critical Diversity Gaps'}
            </p>
            <p className="text-white/40 text-[10px]">
              {data?.node_count || 0} nodes · {data?.published_count || 0} published · {data?.virtual_count || 0} virtual
            </p>
          </div>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="space-y-2">
        <ScoreBar label="Geographic" score={data?.geographic_score || 0} icon={Globe} />
        <ScoreBar label="Logical Roles" score={data?.logical_score || 0} icon={Cpu} />
        <ScoreBar label="Connectivity" score={data?.connectivity_score || 0} icon={Network} />
        <ScoreBar label="Operator Independence" score={data?.operator_score || 0} icon={Users} />
      </div>

      {/* Audit Results */}
      {auditResult && (
        <div className="rounded-lg border border-indigo-500/10 bg-black/20 p-3 space-y-2">
          {/* Result Badge */}
          {auditResult.result && RESULT_COLORS[auditResult.result] && (
            <div className={`rounded-lg border p-2 ${RESULT_COLORS[auditResult.result].bg}`}>
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${RESULT_COLORS[auditResult.result].text}`} />
                <span className={`text-xs font-semibold ${RESULT_COLORS[auditResult.result].text}`}>
                  {RESULT_COLORS[auditResult.result].label} — Score {auditResult.overall_diversity_score}%
                </span>
              </div>
            </div>
          )}

          {/* Node Profiles */}
          <div className="space-y-1">
            <p className="text-indigo-300/60 text-[10px] font-semibold uppercase tracking-wider">Node Profiles</p>
            {auditResult.node_profiles?.map((n, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.published ? 'bg-emerald-400' : n.virtual ? 'bg-purple-400' : 'bg-slate-400'}`} />
                <span className="text-white/70 flex-1 truncate">{n.name}</span>
                <Badge className="text-[7px] bg-slate-500/10 text-slate-300 border-slate-500/20">{n.node_class}</Badge>
                <Badge className="text-[7px] bg-indigo-500/10 text-indigo-300 border-indigo-500/20">{n.region}</Badge>
                {n.is_hub && <Badge className="text-[7px] bg-amber-500/10 text-amber-300 border-amber-500/20">HUB</Badge>}
              </div>
            ))}
          </div>

          {/* Risk Signals */}
          {auditResult.risk_signals?.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <p className="text-amber-300/60 text-[10px] font-semibold uppercase tracking-wider">
                Risk Signals ({auditResult.risk_signals.length})
              </p>
              {auditResult.risk_signals.map((s, i) => {
                const DimIcon = DIMENSION_ICONS[s.dimension] || AlertTriangle;
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <DimIcon className={`w-3 h-3 flex-shrink-0 ${
                      s.severity === 'critical' ? 'text-red-400' : s.severity === 'high' ? 'text-orange-400' : 'text-amber-400'
                    }`} />
                    <span className="text-white/40 flex-1 truncate">{s.detail}</span>
                    <Badge className={`text-[7px] ${
                      s.severity === 'critical' ? 'bg-red-500/10 text-red-300 border-red-500/20'
                      : s.severity === 'high' ? 'bg-orange-500/10 text-orange-300 border-orange-500/20'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }`}>{s.severity}</Badge>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommendations */}
          {auditResult.recommendations?.length > 0 && (
            <div className="space-y-1">
              <p className="text-emerald-300/60 text-[10px] font-semibold uppercase tracking-wider">
                Recommendations ({auditResult.recommendations.length})
              </p>
              {auditResult.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <Lightbulb className={`w-3 h-3 flex-shrink-0 mt-0.5 ${
                    r.priority === 'critical' ? 'text-red-400' : r.priority === 'high' ? 'text-orange-400' : 'text-amber-400'
                  }`} />
                  <span className="text-white/50">{r.recommendation}</span>
                </div>
              ))}
            </div>
          )}

          {auditResult.tripwire_fired && (
            <div className="flex items-center gap-2 text-[10px] text-red-300/80 mt-1">
              <Shield className="w-3 h-3" /> Tripwire alert fired
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-indigo-500/10 bg-indigo-500/5 p-2.5">
        <p className="text-indigo-300/60 text-[9px] leading-relaxed">
          <span className="text-indigo-300/80 font-semibold">Braid Node Diversity Audit:</span> Phase 2 hardening — analyses 
          geographic distribution, logical role variety, connectivity resilience, and operator independence across all {data?.node_count || 8} braid 
          nodes. Tripwire alerts on critical findings. Law 5 (Dwelling) + Law 8 (Governance) protected.
        </p>
      </div>
    </div>
  );
}