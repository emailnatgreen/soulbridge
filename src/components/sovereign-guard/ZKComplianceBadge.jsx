import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ShieldAlert, Lock, RefreshCcw, Loader2, Eye, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default function ZKComplianceBadge() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['zk-compliance-status'],
    queryFn: async () => {
      const res = await base44.functions.invoke('zkWellbeingProof', { action: 'status' });
      return res.data || res;
    },
    refetchInterval: 60000,
  });

  const isCompliant = data?.zk_compliant === true;
  const activeAttestations = data?.active_attestations || 0;
  const guarantees = data?.privacy_guarantees || [];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-purple-500/10 bg-purple-500/5 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <span className="text-white/40 text-xs">Loading ZK compliance status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-purple-500/20 bg-slate-900/60 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-semibold text-sm">ZK Privacy Compliance</h3>
          <Badge className={`text-[8px] ${isCompliant
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-300 border-red-500/30'
          }`}>
            {isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
          </Badge>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-white/40 hover:text-white h-7"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Status Card */}
      <div className={`rounded-lg border p-3 ${isCompliant
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-red-500/20 bg-red-500/5'
      }`}>
        <div className="flex items-center gap-3">
          {isCompliant
            ? <ShieldCheck className="w-8 h-8 text-emerald-400" />
            : <ShieldAlert className="w-8 h-8 text-red-400" />
          }
          <div>
            <p className="text-white text-sm font-semibold">
              {isCompliant ? 'Node 8 Privacy Verified' : 'Privacy Check Required'}
            </p>
            <p className="text-white/40 text-[10px]">
              {isCompliant
                ? 'All oversight checks use zero-knowledge pattern — no raw data exposed'
                : 'Oversight layer may access raw user data — run ZK evaluation'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Attestation Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <p className="text-white text-lg font-bold">{activeAttestations}</p>
          </div>
          <p className="text-white/30 text-[9px]">Active Attestations</p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-purple-400" />
            <p className="text-white text-lg font-bold">{data?.total_attestations || 0}</p>
          </div>
          <p className="text-white/30 text-[9px]">Total Attestations</p>
        </div>
      </div>

      {/* Privacy Guarantees */}
      {guarantees.length > 0 && (
        <div className="space-y-1">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Privacy Guarantees</p>
          {guarantees.map((g, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.02]">
              <Shield className="w-3 h-3 text-purple-400 flex-shrink-0" />
              <span className="text-white/50 text-[10px]">{g}</span>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-purple-500/10 bg-purple-500/5 p-2.5">
        <p className="text-purple-300/60 text-[9px] leading-relaxed">
          <span className="text-purple-300/80 font-semibold">Zero-Knowledge Pattern:</span> Node 8 oversight evaluates 
          wellbeing thresholds against hashed, anonymised signals. Raw user data never leaves the server. 
          Every check creates an auditable PrivacyAttestation. Law 1 (Soul) and Law 5 (Security) preserved.
        </p>
      </div>
    </div>
  );
}