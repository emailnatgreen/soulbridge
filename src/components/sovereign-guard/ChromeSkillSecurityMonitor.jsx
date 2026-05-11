import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Chrome, RefreshCcw, Loader2, Eye, ShieldCheck, ShieldX, AlertTriangle, ScanLine, CheckCircle2 } from 'lucide-react';

export default function ChromeSkillSecurityMonitor() {
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['chrome-skill-security-audit'],
    queryFn: async () => {
      const res = await base44.functions.invoke('chromeSkillSecurityGate', { action: 'audit', limit: 30 });
      return res.data || res;
    },
    refetchInterval: 30000,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('chromeSkillSecurityGate', { action: 'scan_all' });
      return res.data || res;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chrome-skill-security-audit'] });
      setScanResult(result);
    },
  });

  const [scanResult, setScanResult] = useState(null);

  const stats = data?.stats || {};
  const trail = data?.audit_trail || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Chrome className="w-5 h-5 text-teal-400" />
          <h3 className="text-white font-semibold text-sm">Chrome Skill Security</h3>
          <Badge className="text-[8px] bg-teal-500/15 text-teal-300 border-teal-500/30">PHASE 4</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="text-white/40 hover:text-white h-7 text-[10px] gap-1"
          >
            {scanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanLine className="w-3 h-3" />}
            Scan All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-white/40 hover:text-white h-7">
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* How It Works */}
      <div className="rounded-lg border border-teal-500/10 bg-teal-500/5 p-3">
        <p className="text-teal-300/60 text-[10px] leading-relaxed">
          <span className="text-teal-300/80 font-semibold">6-Gate Security Scan:</span> Instruction Injection → Manifest Integrity → AP2 Protocol → Category Compliance → Scope Boundary → Soul Signature.
          Every Chrome Skill NFT must pass before minting or activation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Total', value: stats.total || 0, color: 'text-white' },
          { label: 'Approved', value: stats.approved || 0, color: 'text-green-400' },
          { label: 'Caution', value: stats.caution || 0, color: 'text-amber-400' },
          { label: 'Denied', value: stats.denied || 0, color: 'text-red-400' },
          { label: 'Blocked', value: stats.blocked || 0, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[9px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Scan All Results */}
      {scanResult && (
        <div className="rounded-lg border border-teal-500/10 bg-black/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-teal-300 text-xs font-semibold">Bulk Scan Results — {scanResult.scanned} widgets</span>
            <Button variant="ghost" size="sm" onClick={() => setScanResult(null)} className="text-white/20 h-6 text-[9px]">Dismiss</Button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Approved', val: scanResult.summary?.approved || 0, color: 'text-green-400' },
              { label: 'Caution', val: scanResult.summary?.caution || 0, color: 'text-amber-400' },
              { label: 'Denied', val: scanResult.summary?.denied || 0, color: 'text-red-400' },
              { label: 'Blocked', val: scanResult.summary?.blocked || 0, color: 'text-red-500' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-sm font-bold ${s.color}`}>{s.val}</p>
                <p className="text-white/30 text-[8px]">{s.label}</p>
              </div>
            ))}
          </div>
          {scanResult.results?.filter(r => r.verdict !== 'APPROVED').length > 0 && (
            <div className="space-y-1 mt-1">
              {scanResult.results.filter(r => r.verdict !== 'APPROVED').map(r => (
                <div key={r.widget_id} className="flex items-center gap-2 text-[10px]">
                  {r.verdict === 'BLOCKED' ? <ShieldX className="w-3 h-3 text-red-400" /> :
                   r.verdict === 'DENIED' ? <ShieldX className="w-3 h-3 text-red-300" /> :
                   <AlertTriangle className="w-3 h-3 text-amber-400" />}
                  <span className="text-white/50 truncate flex-1">{r.name}</span>
                  <Badge className={`text-[7px] ${
                    r.verdict === 'BLOCKED' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                    r.verdict === 'DENIED' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
                    'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  }`}>{r.verdict} ({r.issues})</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Trail */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
        </div>
      ) : trail.length === 0 ? (
        <div className="text-center py-6 text-white/30 text-xs">
          No Chrome Skill validations yet. Skills will be scanned here.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {trail.map((record, i) => {
            const isApproved = record.content?.includes('APPROVED') && !record.content?.includes('CAUTION');
            const isCaution = record.content?.includes('CAUTION');
            const isBlocked = record.content?.includes('BLOCKED');
            const isExpanded = expanded === i;

            const Icon = isApproved ? ShieldCheck : isCaution ? AlertTriangle : isBlocked ? ShieldX : ShieldX;
            const iconColor = isApproved ? 'text-green-400' : isCaution ? 'text-amber-400' : 'text-red-400';
            const borderColor = isApproved ? 'border-green-500/10' : isCaution ? 'border-amber-500/10' : 'border-red-500/10';

            const summary = (record.content || '').replace(/^[✅⚠️🚫]\s*/, '');

            return (
              <div
                key={record.id}
                className={`rounded-lg border ${borderColor} bg-black/20 px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition-all`}
                onClick={() => setExpanded(isExpanded ? null : i)}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
                  <span className="text-white/60 text-xs flex-1 truncate">{summary}</span>
                  <span className="text-white/20 text-[9px] flex-shrink-0">
                    {new Date(record.created_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Eye className={`w-3 h-3 ${isExpanded ? 'text-teal-400' : 'text-white/10'}`} />
                </div>
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-white/40 text-[10px] whitespace-pre-wrap">{record.content}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {(record.keywords || []).map(kw => (
                        <Badge key={kw} className="text-[7px] bg-white/5 text-white/30 border-white/10">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}