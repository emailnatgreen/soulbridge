import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, ScanLine, RefreshCcw, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Lightbulb, Eye } from 'lucide-react';

const RESULT_STYLES = {
  sealed:                { bg: 'border-purple-500/20 bg-purple-500/5', text: 'text-purple-400', label: 'Sealed' },
  warning:               { bg: 'border-amber-500/20 bg-amber-500/5',  text: 'text-amber-400',  label: 'Warning' },
  leakage_detected:      { bg: 'border-orange-500/20 bg-orange-500/5',text: 'text-orange-400', label: 'Leakage Detected' },
  constraint_violation:  { bg: 'border-red-500/20 bg-red-500/5',      text: 'text-red-400',    label: 'Constraint Violation' },
};

const RISK_COLORS = { none: 'text-emerald-400', low: 'text-blue-400', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400' };

export default function ZKWellbeingHardenPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['zk-wellbeing-harden-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('zkWellbeingHarden', { action: 'status' });
      return res.data || res;
    },
    refetchInterval: 120000,
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('zkWellbeingHarden', { action: 'audit' });
      return res.data || res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['zk-wellbeing-harden-status'] }),
  });

  const auditResult = auditMutation.data;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-purple-500/10 bg-purple-500/5 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <span className="text-white/40 text-xs">Loading ZK Wellbeing Hardening...</span>
        </div>
      </div>
    );
  }

  const constraintsValid = data?.constraints_valid !== false;
  const sandboxSealed = data?.sandbox_sealed !== false;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-semibold text-sm">ZK Wellbeing Hardening</h3>
          <Badge className={`text-[8px] ${constraintsValid && sandboxSealed
            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
            : 'bg-red-500/15 text-red-300 border-red-500/30'
          }`}>
            {constraintsValid && sandboxSealed ? 'S005 SEALED' : 'UNSEALED'}
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
            Hardening Audit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-white/40 hover:text-white h-7">
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className={`rounded-lg border p-3 ${constraintsValid && sandboxSealed ? 'border-purple-500/20 bg-purple-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
        <div className="flex items-center gap-3">
          {constraintsValid && sandboxSealed
            ? <ShieldCheck className="w-7 h-7 text-purple-400" />
            : <ShieldAlert className="w-7 h-7 text-red-400" />
          }
          <div>
            <p className="text-white text-sm font-semibold">
              {constraintsValid && sandboxSealed ? 'Node 8 Privacy Hardened' : 'Hardening Issues Detected'}
            </p>
            <p className="text-white/40 text-[10px]">
              DP: ε={data?.differential_privacy?.epsilon || '1.0'} · {data?.threshold_constraints || 8} constraints · Sandbox: {sandboxSealed ? 'sealed' : 'open'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Epsilon (ε)', value: data?.differential_privacy?.epsilon || '1.0', color: 'text-purple-400' },
          { label: 'Constraints', value: data?.threshold_constraints || 8, color: constraintsValid ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Sandbox', value: sandboxSealed ? 'Sealed' : 'Open', color: sandboxSealed ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Mechanism', value: 'Laplace', color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[9px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Audit Results */}
      {auditResult && (
        <div className="rounded-lg border border-purple-500/10 bg-black/20 p-3 space-y-2">
          {/* Result Badge */}
          {auditResult.result && RESULT_STYLES[auditResult.result] && (
            <div className={`rounded-lg border p-2 ${RESULT_STYLES[auditResult.result].bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className={`w-4 h-4 ${RESULT_STYLES[auditResult.result].text}`} />
                  <span className={`text-xs font-semibold ${RESULT_STYLES[auditResult.result].text}`}>
                    {RESULT_STYLES[auditResult.result].label}
                  </span>
                </div>
                <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[8px]">
                  Privacy: {auditResult.privacy_score}/100
                </Badge>
              </div>
            </div>
          )}

          {/* Constraint Checks */}
          <div className="space-y-1">
            <p className="text-purple-300/60 text-[10px] font-semibold uppercase tracking-wider">Threshold Constraints</p>
            {auditResult.constraint_checks?.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.status === 'valid' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-white/60 flex-1">{c.constraint_name}</span>
                <span className="text-white/30">[{c.min_bound}–{c.max_bound}]</span>
                <Badge className={`text-[7px] ${c.status === 'valid'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-300 border-red-500/20'
                }`}>{c.threshold_value}</Badge>
              </div>
            ))}
          </div>

          {/* Leakage Vectors */}
          {auditResult.leakage_vectors?.length > 0 && (
            <div className="space-y-1">
              <p className="text-purple-300/60 text-[10px] font-semibold uppercase tracking-wider">Leakage Vectors</p>
              {auditResult.leakage_vectors.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  {v.mitigated
                    ? <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    : <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${RISK_COLORS[v.risk_level] || 'text-amber-400'}`} />
                  }
                  <span className="text-white/50 flex-1 truncate">{v.vector_name}</span>
                  <Badge className={`text-[7px] ${v.mitigated
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>{v.mitigated ? 'mitigated' : v.risk_level}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Sandbox */}
          {auditResult.sandbox && (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2 space-y-1">
              <p className="text-purple-300/60 text-[10px] font-semibold uppercase tracking-wider">Evaluation Sandbox</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  ['Isolated', auditResult.sandbox.evaluation_isolated],
                  ['No Network', auditResult.sandbox.no_network_access],
                  ['Deterministic', auditResult.sandbox.deterministic_output],
                  ['External Blocked', auditResult.sandbox.external_data_blocked],
                ].map(([label, ok]) => (
                  <div key={label} className="flex items-center gap-1 text-[9px]">
                    <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-white/40">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Signals */}
          {auditResult.risk_signals?.length > 0 && (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              <p className="text-amber-300/60 text-[10px] font-semibold uppercase tracking-wider">
                Risk Signals ({auditResult.risk_signals.length})
              </p>
              {auditResult.risk_signals.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${s.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`} />
                  <span className="text-white/40 flex-1 truncate">{s.detail}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {auditResult.recommendations?.length > 0 && (
            <div className="space-y-1">
              <p className="text-purple-300/60 text-[10px] font-semibold uppercase tracking-wider">Recommendations</p>
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
              <Eye className="w-3 h-3" /> Tripwire alert fired
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-purple-500/10 bg-purple-500/5 p-2.5">
        <p className="text-purple-300/60 text-[9px] leading-relaxed">
          <span className="text-purple-300/80 font-semibold">S005 Hardening:</span> Phase 2 — formalises Node 8 threshold constraints 
          with bounded verification, injects Laplace differential privacy (ε={data?.differential_privacy?.epsilon || '1.0'}), scans for 
          metadata leakage vectors (timing correlation, frequency analysis, biometric inference), and verifies evaluation sandbox isolation. 
          Law 1 (Soul) · Law 5 (Security).
        </p>
      </div>
    </div>
  );
}