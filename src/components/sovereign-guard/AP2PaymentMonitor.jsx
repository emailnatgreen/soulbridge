import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Banknote, CheckCircle2, XCircle, AlertTriangle, RefreshCcw, Loader2, Eye, Shield, ArrowRight } from 'lucide-react';

const GATES = [
  { name: 'Soul Signature', desc: 'Phase 2 verification — agent purpose + permissions' },
  { name: 'Honour Gate', desc: 'Sender ≥ 30, Receiver ≥ 10 honour score' },
  { name: 'Sincerity Check', desc: 'Prompt injection + manipulation detection' },
  { name: 'Balance Gate', desc: 'Sufficient RLUSD + daily spending limits' },
  { name: 'Village Fee', desc: 'Law 6: 1% fee — transparent distribution' },
  { name: 'Immutable Audit', desc: 'Every payment recorded to Memory entity' },
];

export default function AP2PaymentMonitor() {
  const [expanded, setExpanded] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ap2-audit'],
    queryFn: async () => {
      const res = await base44.functions.invoke('ap2PaymentGate', {
        action: 'audit',
        limit: 50,
      });
      return res.data || res;
    },
    refetchInterval: 30000,
  });

  const stats = data?.stats || {};
  const trail = data?.audit_trail || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-semibold text-sm">AP2 Payment Gate</h3>
          <Badge className="text-[8px] bg-amber-500/15 text-amber-300 border-amber-500/30">PHASE 5</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-white/40 hover:text-white h-7"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* 6-Gate explainer */}
      <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-3">
        <p className="text-amber-300/60 text-[9px] font-semibold mb-2">6-GATE VERIFICATION PROTOCOL</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
          {GATES.map((gate, i) => (
            <div key={i} className="flex items-start gap-1.5 px-2 py-1 rounded-md bg-white/[0.02]">
              <span className="text-amber-400/60 text-[8px] font-mono mt-0.5">{i + 1}</span>
              <div>
                <p className="text-white/50 text-[9px] font-medium">{gate.name}</p>
                <p className="text-white/20 text-[7px]">{gate.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Total', value: stats.total || 0, color: 'text-white' },
          { label: 'Completed', value: stats.completed || 0, color: 'text-green-400' },
          { label: 'Soul Block', value: stats.blocked_soul || 0, color: 'text-purple-400' },
          { label: 'Honour Block', value: stats.blocked_honour || 0, color: 'text-amber-400' },
          { label: 'Sincerity Block', value: stats.blocked_sincerity || 0, color: 'text-red-400' },
          { label: 'Balance Block', value: stats.blocked_balance || 0, color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[8px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Audit Trail */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        </div>
      ) : trail.length === 0 ? (
        <div className="text-center py-6 text-white/30 text-xs">
          No AP2 payment activity yet. Agent payments will appear here.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {trail.map((record, i) => {
            const isCompleted = record.content?.includes('COMPLETED');
            const isBlocked = record.content?.includes('BLOCKED');
            const isExpanded = expanded === i;

            const Icon = isCompleted ? CheckCircle2 : isBlocked ? XCircle : AlertTriangle;
            const iconColor = isCompleted ? 'text-green-400' : 'text-red-400';
            const borderColor = isCompleted ? 'border-green-500/10' : 'border-red-500/10';

            // Extract summary
            const summary = (record.content || '').split('|')[0].replace(/^[💰🚫⚠️]\s*/, '').trim();

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
                  <Eye className={`w-3 h-3 ${isExpanded ? 'text-amber-400' : 'text-white/10'}`} />
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