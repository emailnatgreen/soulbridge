import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Scale, Loader2, ScanLine, RefreshCcw, CheckCircle2, XCircle, AlertTriangle, Lightbulb, TrendingDown, BarChart3 } from 'lucide-react';

const RESULT_STYLES = {
  formalized:          { bg: 'border-blue-500/20 bg-blue-500/5',   text: 'text-blue-400',   label: 'Formalised' },
  warning:             { bg: 'border-amber-500/20 bg-amber-500/5', text: 'text-amber-400',  label: 'Warning' },
  heuristic_detected:  { bg: 'border-orange-500/20 bg-orange-500/5',text: 'text-orange-400',label: 'Heuristics Active' },
  gaming_vulnerability:{ bg: 'border-red-500/20 bg-red-500/5',     text: 'text-red-400',    label: 'Gaming Vulnerability' },
};

export default function SincerityScoringPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sincerity-scoring-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('sincerityScoringFormalization', { action: 'status' });
      return res.data || res;
    },
    refetchInterval: 120000,
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('sincerityScoringFormalization', { action: 'audit' });
      return res.data || res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sincerity-scoring-status'] }),
  });

  const auditResult = auditMutation.data;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-white/40 text-xs">Loading Sincerity Scoring...</span>
        </div>
      </div>
    );
  }

  const fm = data?.formal_model || {};

  return (
    <div className="rounded-xl border border-blue-500/20 bg-slate-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-400" />
          <h3 className="text-white font-semibold text-sm">Sincerity Scoring</h3>
          <Badge className="text-[8px] bg-blue-500/15 text-blue-300 border-blue-500/30">S007</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            onClick={() => auditMutation.mutate()}
            disabled={auditMutation.isPending}
            className="text-white/40 hover:text-white h-7 text-[10px] gap-1"
          >
            {auditMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
            Formalise Audit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-white/40 hover:text-white h-7">
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Model Summary */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-blue-400" />
          <div>
            <p className="text-white text-sm font-semibold">Formal Scoring Model</p>
            <p className="text-white/40 text-[10px]">
              {fm.weights_defined || 0} weights · {fm.frequency_caps || 0} caps · {fm.diminishing_returns || 'log'} · {fm.half_life_days || 30}d decay
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Weights', value: fm.weights_defined || 0, color: 'text-blue-400' },
          { label: 'Freq Caps', value: fm.frequency_caps || 0, color: 'text-blue-400' },
          { label: 'Heuristics', value: data?.known_heuristics || 0, color: (data?.known_heuristics || 0) > 0 ? 'text-amber-400' : 'text-emerald-400' },
          { label: 'Half-life', value: `${fm.half_life_days || 30}d`, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[9px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Audit Results */}
      {auditResult && (
        <div className="rounded-lg border border-blue-500/10 bg-black/20 p-3 space-y-2">
          {/* Result Badge */}
          {auditResult.result && RESULT_STYLES[auditResult.result] && (
            <div className={`rounded-lg border p-2 ${RESULT_STYLES[auditResult.result].bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className={`w-4 h-4 ${RESULT_STYLES[auditResult.result].text}`} />
                  <span className={`text-xs font-semibold ${RESULT_STYLES[auditResult.result].text}`}>
                    {RESULT_STYLES[auditResult.result].label}
                  </span>
                </div>
                <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-[8px]">
                  Score: {auditResult.formalization_score}/100
                </Badge>
              </div>
            </div>
          )}

          {/* Distribution */}
          {auditResult.agent_distribution && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
              <p className="text-blue-300/60 text-[10px] font-semibold uppercase tracking-wider mb-1">Score Distribution</p>
              <div className="grid grid-cols-4 gap-1 text-[9px]">
                <div className="text-center">
                  <p className="text-white font-bold">{auditResult.agent_distribution.mean}</p>
                  <p className="text-white/30">Mean</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">{auditResult.agent_distribution.median}</p>
                  <p className="text-white/30">Median</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">{auditResult.agent_distribution.std}</p>
                  <p className="text-white/30">Std Dev</p>
                </div>
                <div className="text-center">
                  <p className={`font-bold ${auditResult.agent_distribution.gini < 0.1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {auditResult.agent_distribution.gini}
                  </p>
                  <p className="text-white/30">Gini</p>
                </div>
              </div>
            </div>
          )}

          {/* Heuristic Paths */}
          {auditResult.heuristic_paths?.length > 0 && (
            <div className="space-y-1">
              <p className="text-amber-300/60 text-[10px] font-semibold uppercase tracking-wider">
                Heuristic Paths ({auditResult.heuristic_paths.length})
              </p>
              {auditResult.heuristic_paths.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${
                    h.severity === 'critical' ? 'text-red-400' : h.severity === 'high' ? 'text-orange-400' : 'text-amber-400'
                  }`} />
                  <span className="text-white/50 flex-1 truncate">{h.name}</span>
                  <Badge className={`text-[7px] ${
                    h.severity === 'critical' ? 'bg-red-500/10 text-red-300 border-red-500/20'
                    : h.severity === 'high' ? 'bg-orange-500/10 text-orange-300 border-orange-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>{h.severity}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Gaming Vectors */}
          {auditResult.gaming_vectors?.length > 0 && (
            <div className="space-y-1">
              <p className="text-blue-300/60 text-[10px] font-semibold uppercase tracking-wider">Gaming Vectors</p>
              {auditResult.gaming_vectors.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  {v.mitigated
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    : <TrendingDown className={`w-3 h-3 flex-shrink-0 ${
                        v.risk_level === 'high' ? 'text-red-400' : 'text-amber-400'
                      }`} />
                  }
                  <span className="text-white/50 flex-1 truncate">{v.vector_name}</span>
                  <Badge className={`text-[7px] ${v.mitigated
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>{v.mitigated ? 'safe' : v.risk_level}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {auditResult.recommendations?.length > 0 && (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              <p className="text-blue-300/60 text-[10px] font-semibold uppercase tracking-wider">Recommendations</p>
              {auditResult.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <Lightbulb className={`w-3 h-3 flex-shrink-0 mt-0.5 ${r.priority === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                  <span className="text-white/50">{r.recommendation}</span>
                </div>
              ))}
            </div>
          )}

          {auditResult.tripwire_fired && (
            <div className="flex items-center gap-2 text-[10px] text-red-300/80 mt-1">
              <AlertTriangle className="w-3 h-3" /> Tripwire alert fired
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 p-2.5">
        <p className="text-blue-300/60 text-[9px] leading-relaxed">
          <span className="text-blue-300/80 font-semibold">S007 Formalisation:</span> Phase 2 — replaces heuristic flat-point honour awards 
          with mathematically bounded weights, logarithmic diminishing returns, exponential time-decay ({fm.half_life_days || 30}d half-life), 
          frequency caps, and Gini-based distribution health monitoring. Anti-gaming vectors: task spam, vote farming, ceiling clustering. 
          Law 2 (Honour) · Law 9 (Growth).
        </p>
      </div>
    </div>
  );
}