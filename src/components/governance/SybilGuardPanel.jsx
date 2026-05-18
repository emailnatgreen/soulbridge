import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ShieldAlert, Users, RefreshCcw, Loader2, ScanLine, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const RESULT_CONFIG = {
  passed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Passed' },
  blocked: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Blocked' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Warning' },
  flagged: { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Flagged' },
};

export default function SybilGuardPanel() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sybil-guard-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('sybilGuard', { action: 'status' });
      return res.data || res;
    },
    refetchInterval: 60000,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('sybilGuard', { action: 'scan' });
      return res.data || res;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sybil-guard-status'] }),
  });

  const summary = data?.summary || {};
  const recentChecks = data?.recent_checks || [];
  const scanResult = scanMutation.data;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span className="text-white/40 text-xs">Loading Sybil Guard status...</span>
        </div>
      </div>
    );
  }

  const isClean = summary.blocked === 0 && summary.flagged === 0;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-white font-semibold text-sm">Sybil Guard</h3>
          <Badge className={`text-[8px] ${isClean
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}>
            {isClean ? 'CLEAN' : 'ALERTS'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="text-white/40 hover:text-white h-7 text-[10px] gap-1"
          >
            {scanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
            Full Scan
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-white/40 hover:text-white h-7">
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Status Card */}
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
              {isClean ? 'Governance Integrity Verified' : 'Anomalies Detected'}
            </p>
            <p className="text-white/40 text-[10px]">
              One user, one vote — enforced across all proposals
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Checks', value: summary.total_checks || 0, color: 'text-white' },
          { label: 'Passed', value: summary.passed || 0, color: 'text-emerald-400' },
          { label: 'Blocked', value: summary.blocked || 0, color: 'text-red-400' },
          { label: 'Avg Risk', value: summary.avg_risk_score || 0, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[9px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="rounded-lg border border-cyan-500/10 bg-black/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-cyan-300 text-xs font-semibold">
              Scan: {scanResult.scan_summary?.total_votes} votes, {scanResult.scan_summary?.unique_users} users
            </span>
            <Badge className={`text-[8px] ${scanResult.scan_summary?.critical > 0
              ? 'bg-red-500/15 text-red-300 border-red-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}>
              {scanResult.scan_summary?.anomalies_found || 0} anomalies
            </Badge>
          </div>
          {scanResult.anomalies?.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {scanResult.anomalies.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${
                    a.severity === 'critical' ? 'text-red-400' : a.severity === 'high' ? 'text-orange-400' : 'text-amber-400'
                  }`} />
                  <span className="text-white/50 flex-1 truncate">{a.type.replace(/_/g, ' ')}</span>
                  <Badge className={`text-[7px] ${
                    a.severity === 'critical' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                    a.severity === 'high' ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' :
                    'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>{a.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Checks */}
      {recentChecks.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Recent Checks</p>
          {recentChecks.map((check, i) => {
            const cfg = RESULT_CONFIG[check.result] || RESULT_CONFIG.passed;
            const Icon = cfg.icon;
            return (
              <div key={check.id || i} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${cfg.bg}`}>
                <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.color}`} />
                <span className="text-white/50 text-[10px] flex-1 truncate font-mono">{check.user_hash}</span>
                <span className="text-white/30 text-[9px]">{check.check_type}</span>
                <Badge className={`text-[7px] ${cfg.bg}`}>{cfg.label}</Badge>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-2.5">
        <p className="text-cyan-300/60 text-[9px] leading-relaxed">
          <span className="text-cyan-300/80 font-semibold">Sybil Guard:</span> Enforces one authenticated user = one vote per proposal, 
          regardless of how many agents they control. All identifiers SHA-256 hashed. 
          Pattern detection flags suspicious clusters. Law 8 (Governance) protected.
        </p>
      </div>
    </div>
  );
}