import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ShieldAlert, Loader2, ScanLine, RefreshCcw, CheckCircle2, XCircle, AlertTriangle, Fingerprint } from 'lucide-react';

const PHASE_CONFIG = {
  complete:      { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Sealed' },
  agent_created: { color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    label: 'Created' },
  wallet_bound:  { color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20',    label: 'Wallet Bound' },
  nft_sealed:    { color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20', label: 'NFT Sealed' },
  initiated:     { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',  label: 'Initiated' },
  failed:        { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',      label: 'Failed' },
  rollback:      { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',      label: 'Rollback' },
};

export default function AgentExistentialGuardPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['agent-existential-guard-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('agentExistentialGuard', { action: 'status' });
      return res.data || res;
    },
    refetchInterval: 60000,
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('agentExistentialGuard', { action: 'audit' });
      return res.data || res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-existential-guard-status'] }),
  });

  const summary = data?.summary || {};
  const recentEvents = data?.recent_events || [];
  const auditResult = auditMutation.data;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-purple-500/10 bg-purple-500/5 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <span className="text-white/40 text-xs">Loading Existential Guard...</span>
        </div>
      </div>
    );
  }

  const isClean = summary.failed === 0;

  return (
    <div className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-semibold text-sm">Agent Existential Guard</h3>
          <Badge className={`text-[8px] ${isClean
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}>
            {isClean ? 'CLEAN' : 'ISSUES'}
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
      <div className={`rounded-lg border p-3 ${isClean
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-amber-500/20 bg-amber-500/5'
      }`}>
        <div className="flex items-center gap-3">
          {isClean
            ? <ShieldCheck className="w-7 h-7 text-emerald-400" />
            : <ShieldAlert className="w-7 h-7 text-amber-400" />
          }
          <div>
            <p className="text-white text-sm font-semibold">
              {isClean ? 'Soul-Bound Integrity Verified' : 'Genesis Anomalies Detected'}
            </p>
            <p className="text-white/40 text-[10px]">Law 1 (Soul) · Law 2 (Honour) · Identity permanence enforced</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Genesis Events', value: summary.total_genesis_events || 0, color: 'text-white' },
          { label: 'Complete', value: summary.complete || 0, color: 'text-emerald-400' },
          { label: 'Failed', value: summary.failed || 0, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[9px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Audit Results */}
      {auditResult && (
        <div className="rounded-lg border border-purple-500/10 bg-black/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-purple-300 text-xs font-semibold">
              Audit: {auditResult.audit_summary?.total_agents} agents scanned
            </span>
            <Badge className={`text-[8px] ${auditResult.audit_summary?.critical_issues > 0
              ? 'bg-red-500/15 text-red-300 border-red-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}>
              {auditResult.audit_summary?.verified || 0} verified · {auditResult.audit_summary?.compromised || 0} compromised
            </Badge>
          </div>
          {auditResult.critical_issues?.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {auditResult.critical_issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 text-red-400 mt-0.5" />
                  <div>
                    <span className="text-white/70 font-medium">{issue.agent_name}</span>
                    <span className="text-white/30"> — {issue.issues.map(i => i.check).join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {auditResult.critical_issues?.length === 0 && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-300/60">
              <CheckCircle2 className="w-3 h-3" />
              All agents passed integrity verification
            </div>
          )}
        </div>
      )}

      {/* Recent Genesis Events */}
      {recentEvents.length > 0 && (
        <div className="space-y-1 max-h-36 overflow-y-auto">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Recent Genesis Events</p>
          {recentEvents.map((evt, i) => {
            const cfg = PHASE_CONFIG[evt.phase] || PHASE_CONFIG.initiated;
            return (
              <div key={evt.id || i} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${cfg.bg}`}>
                <Shield className={`w-3 h-3 flex-shrink-0 ${cfg.color}`} />
                <span className="text-white/50 text-[10px] flex-1 truncate">{evt.agent_id === 'system_audit' ? 'System Audit' : evt.agent_id?.substring(0, 8) + '...'}</span>
                <Badge className={`text-[7px] ${cfg.bg}`}>{cfg.label}</Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-purple-500/10 bg-purple-500/5 p-2.5">
        <p className="text-purple-300/60 text-[9px] leading-relaxed">
          <span className="text-purple-300/80 font-semibold">Existential Guard:</span> Atomic genesis pipeline 
          ensures agent creation, wallet binding, and soul-bound NFT minting execute as one unit. 
          Lineage checksums verify identity permanence. Tripwire alerts fire on integrity failures.
        </p>
      </div>
    </div>
  );
}