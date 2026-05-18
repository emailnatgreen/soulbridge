import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ShieldAlert, Loader2, ScanLine, RefreshCcw, CheckCircle2, AlertTriangle, Lock, Users, Zap } from 'lucide-react';

const RESULT_COLORS = {
  healthy:       { bg: 'border-emerald-500/20 bg-emerald-500/5', text: 'text-emerald-400', label: 'Healthy' },
  warning:       { bg: 'border-amber-500/20 bg-amber-500/5',     text: 'text-amber-400',   label: 'Warning' },
  critical:      { bg: 'border-red-500/20 bg-red-500/5',         text: 'text-red-400',     label: 'Critical' },
  deadlock_risk: { bg: 'border-orange-500/20 bg-orange-500/5',   text: 'text-orange-400',  label: 'Deadlock Risk' },
};

export default function MultiSigDiversityPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['multisig-diversity-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('multiSigDiversityGuard', { action: 'status' });
      return res.data || res;
    },
    refetchInterval: 120000,
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('multiSigDiversityGuard', { action: 'audit' });
      return res.data || res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['multisig-diversity-status'] }),
  });

  const auditResult = auditMutation.data;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-white/40 text-xs">Loading Multi-Sig Diversity Guard...</span>
        </div>
      </div>
    );
  }

  const isHealthy = (data?.critical_signals || 0) === 0;
  const diversityScore = data?.diversity_score || 0;

  return (
    <div className="rounded-xl border border-blue-500/20 bg-slate-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-400" />
          <h3 className="text-white font-semibold text-sm">Multi-Sig Diversity</h3>
          <Badge className={`text-[8px] ${isHealthy
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-300 border-red-500/30'
          }`}>
            {isHealthy ? 'RESILIENT' : 'AT RISK'}
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
      <div className={`rounded-lg border p-3 ${isHealthy ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
        <div className="flex items-center gap-3">
          {isHealthy ? <ShieldCheck className="w-7 h-7 text-emerald-400" /> : <ShieldAlert className="w-7 h-7 text-red-400" />}
          <div>
            <p className="text-white text-sm font-semibold">
              {isHealthy ? 'Governance Resilience Verified' : 'Diversity Issues Detected'}
            </p>
            <p className="text-white/40 text-[10px]">
              {data?.on_chain ? 'On-chain signer list verified' : 'Off-chain config'} · {data?.signer_count || 0} signers · Q{data?.quorum || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Signers', value: data?.signer_count || 0, color: 'text-white' },
          { label: 'Quorum', value: data?.quorum || 0, color: 'text-blue-400' },
          { label: 'Diversity', value: `${diversityScore}%`, color: diversityScore >= 70 ? 'text-emerald-400' : diversityScore >= 40 ? 'text-amber-400' : 'text-red-400' },
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
        <div className="rounded-lg border border-blue-500/10 bg-black/20 p-3 space-y-2">
          {/* Signers */}
          <div className="space-y-1">
            <p className="text-blue-300/60 text-[10px] font-semibold uppercase tracking-wider">Signer Profiles</p>
            {auditResult.signers?.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.is_live ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-white/70 flex-1 truncate">{s.name}</span>
                <span className="text-white/30">W:{s.weight}</span>
                <Badge className={`text-[7px] ${s.covenant_signed ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>
                  {s.covenant_signed ? 'Covenant' : 'Unsigned'}
                </Badge>
              </div>
            ))}
          </div>

          {/* Capture Vectors */}
          {auditResult.capture_vectors?.length > 0 && (
            <div className="space-y-1">
              <p className="text-amber-300/60 text-[10px] font-semibold uppercase tracking-wider">Capture Vectors ({auditResult.capture_vectors.length})</p>
              {auditResult.capture_vectors.slice(0, 4).map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <Zap className={`w-3 h-3 flex-shrink-0 ${v.severity === 'critical' ? 'text-red-400' : v.severity === 'high' ? 'text-orange-400' : 'text-amber-400'}`} />
                  <span className="text-white/50 flex-1 truncate">{v.vector}</span>
                  <Badge className={`text-[7px] ${v.human_required ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>
                    {v.human_required ? 'Human req.' : 'AI-only'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Deadlock Scenarios */}
          {auditResult.deadlock_scenarios?.length > 0 && (
            <div className="space-y-1">
              <p className="text-red-300/60 text-[10px] font-semibold uppercase tracking-wider">Deadlock Scenarios ({auditResult.deadlock_scenarios.length})</p>
              {auditResult.deadlock_scenarios.slice(0, 3).map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 text-red-400" />
                  <span className="text-white/50 flex-1 truncate">{d.scenario}</span>
                  <span className="text-red-300/60">{d.remaining_weight}/{auditResult.quorum}</span>
                </div>
              ))}
            </div>
          )}

          {/* Risk Signals */}
          {auditResult.risk_signals?.length > 0 && (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Risk Signals</p>
              {auditResult.risk_signals.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${s.severity === 'critical' ? 'text-red-400' : s.severity === 'high' ? 'text-orange-400' : 'text-amber-400'}`} />
                  <span className="text-white/40 flex-1 truncate">{s.detail}</span>
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
      <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 p-2.5">
        <p className="text-blue-300/60 text-[9px] leading-relaxed">
          <span className="text-blue-300/80 font-semibold">Multi-Sig Diversity Guard:</span> Enforces geographic/logical diversity 
          across the 8-node braid. Detects capture coalitions, deadlock scenarios, and liveness failures. 
          Tripwire alerts on critical findings. Law 8 (Governance) protected.
        </p>
      </div>
    </div>
  );
}