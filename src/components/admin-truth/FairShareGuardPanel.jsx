import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, ScanLine, RefreshCcw, AlertTriangle, Coins, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';

const RESULT_COLORS = {
  compliant:           { bg: 'border-emerald-500/20 bg-emerald-500/5', text: 'text-emerald-400', label: 'Compliant' },
  warning:             { bg: 'border-amber-500/20 bg-amber-500/5',     text: 'text-amber-400',   label: 'Warning' },
  violation:           { bg: 'border-red-500/20 bg-red-500/5',         text: 'text-red-400',     label: 'Violation' },
  critical_extraction: { bg: 'border-red-500/20 bg-red-500/5',         text: 'text-red-400',     label: 'Critical Extraction' },
};

export default function FairShareGuardPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['fair-share-guard-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('fairShareGuard', { action: 'status' });
      return res.data || res;
    },
    refetchInterval: 120000,
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('fairShareGuard', { action: 'audit' });
      return res.data || res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fair-share-guard-status'] }),
  });

  const auditResult = auditMutation.data;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span className="text-white/40 text-xs">Loading Fair Share Guard...</span>
        </div>
      </div>
    );
  }

  const hasViolations = (data?.violations_in_config || 0) > 0;
  const maxExtraction = data?.max_extraction_detected || 0;

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">Fair Share Guard</h3>
          <Badge className={`text-[8px] ${!hasViolations
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-300 border-red-500/30'
          }`}>
            {!hasViolations ? 'LAW 3 OK' : 'EXTRACTIVE'}
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

      {/* Status */}
      <div className={`rounded-lg border p-3 ${!hasViolations ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
        <div className="flex items-center gap-3">
          {!hasViolations
            ? <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            : <XCircle className="w-7 h-7 text-red-400" />
          }
          <div>
            <p className="text-white text-sm font-semibold">
              {!hasViolations ? 'Creator Value Protected' : 'Extraction Violations Detected'}
            </p>
            <p className="text-white/40 text-[10px]">
              Ceiling: {data?.extraction_ceiling || 2.5}% · Max detected: {maxExtraction}% · {data?.flows_defined || 0} flows
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Ceiling', value: `${data?.extraction_ceiling || 2.5}%`, color: 'text-emerald-400' },
          { label: 'Max Found', value: `${maxExtraction}%`, color: maxExtraction <= 2.5 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Violations', value: data?.violations_in_config || 0, color: (data?.violations_in_config || 0) > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Signals', value: data?.risk_signals_count || 0, color: (data?.critical_signals || 0) > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[9px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Audit Results */}
      {auditResult && (
        <div className="rounded-lg border border-emerald-500/10 bg-black/20 p-3 space-y-2">
          {/* Result Badge */}
          {auditResult.result && RESULT_COLORS[auditResult.result] && (
            <div className={`rounded-lg border p-2 ${RESULT_COLORS[auditResult.result].bg}`}>
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${RESULT_COLORS[auditResult.result].text}`} />
                <span className={`text-xs font-semibold ${RESULT_COLORS[auditResult.result].text}`}>
                  {RESULT_COLORS[auditResult.result].label} — {auditResult.total_violations} violations
                </span>
              </div>
            </div>
          )}

          {/* Flow Analysis */}
          <div className="space-y-1">
            <p className="text-emerald-300/60 text-[10px] font-semibold uppercase tracking-wider">Flow Analysis</p>
            {auditResult.flow_analysis?.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  f.status === 'compliant' ? 'bg-emerald-400' : f.status === 'violation' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <span className="text-white/70 flex-1 truncate">{f.flow_name}</span>
                {f.platform_cut_pct !== null && (
                  <Badge className={`text-[7px] ${f.status === 'compliant'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-300 border-red-500/20'
                  }`}>
                    {f.platform_cut_pct}%
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Widget + Transaction Scans */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
              <p className="text-white/30 text-[9px] mb-1">Widget Royalties</p>
              <p className="text-white text-xs">
                <span className="text-emerald-400">{auditResult.widget_scan?.compliant || 0}</span>
                <span className="text-white/30"> / </span>
                <span className={auditResult.widget_scan?.violations > 0 ? 'text-red-400' : 'text-white/50'}>
                  {auditResult.widget_scan?.violations || 0} violations
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
              <p className="text-white/30 text-[9px] mb-1">Recent Transactions</p>
              <p className="text-white text-xs">
                <span className="text-emerald-400">{auditResult.transaction_scan?.compliant || 0}</span>
                <span className="text-white/30"> / </span>
                <span className={auditResult.transaction_scan?.violating > 0 ? 'text-red-400' : 'text-white/50'}>
                  {auditResult.transaction_scan?.violating || 0} violations
                </span>
              </p>
            </div>
          </div>

          {/* Risk Signals */}
          {auditResult.risk_signals?.length > 0 && (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              <p className="text-amber-300/60 text-[10px] font-semibold uppercase tracking-wider">
                Risk Signals ({auditResult.risk_signals.length})
              </p>
              {auditResult.risk_signals.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${
                    s.severity === 'critical' ? 'text-red-400' : s.severity === 'high' ? 'text-orange-400' : 'text-amber-400'
                  }`} />
                  <span className="text-white/40 flex-1 truncate">{s.detail}</span>
                </div>
              ))}
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
      <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-2.5">
        <p className="text-emerald-300/60 text-[9px] leading-relaxed">
          <span className="text-emerald-300/80 font-semibold">Fair Share Guard:</span> Phase 2 hardening — enforces Law 3 (Fair Share) 
          with a hard {data?.extraction_ceiling || 2.5}% extraction ceiling across all value flows. Audits marketplace fees, widget royalties, 
          streaming charges, and NFT treasury shares. Creator minimum: {data?.creator_minimum || 97.5}%.
        </p>
      </div>
    </div>
  );
}