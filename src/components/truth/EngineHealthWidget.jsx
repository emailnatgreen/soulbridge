import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  ok: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'OK' },
  running: { icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', label: 'RUNNING' },
  degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'DEGRADED' },
  idle: { icon: Clock, color: 'text-white/30', bg: 'bg-white/5 border-white/10', label: 'IDLE' },
};

export default function EngineHealthWidget() {
  const { data: health, isLoading } = useQuery({
    queryKey: ['truth-engine-health'],
    queryFn: async () => {
      const res = await base44.functions.invoke('truthEngine', { action: 'health', limit: 10 });
      return res.data;
    },
    refetchInterval: 60000,
  });

  if (isLoading || !health) {
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 animate-pulse">
        <div className="h-3 w-24 bg-white/10 rounded" />
      </div>
    );
  }

  const h = health.health;
  const cfg = STATUS_CONFIG[h.last_status] || STATUS_CONFIG.idle;
  const Icon = cfg.icon;
  const avgSec = h.avg_duration_ms ? (h.avg_duration_ms / 1000).toFixed(1) : '—';
  const steps = h.step_averages || {};

  return (
    <div className={`rounded-lg border ${cfg.bg} p-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>Engine {cfg.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-[8px] bg-white/5 text-white/30 border-white/10">
            {health.schema?.name} · {health.policy?.name}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-white/30 text-[9px]">Avg Duration</p>
          <p className="text-white font-mono text-xs">{avgSec}s</p>
        </div>
        <div className="text-center">
          <p className="text-white/30 text-[9px]">Success Rate</p>
          <p className="text-white font-mono text-xs">{h.success_rate}</p>
        </div>
        <div className="text-center">
          <p className="text-white/30 text-[9px]">Last Run</p>
          <p className={`font-mono text-xs ${cfg.color}`}>{cfg.label}</p>
        </div>
      </div>

      {/* Step breakdown */}
      {(steps.llm_draft_ms > 0 || steps.verification_ms > 0) && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
          {steps.llm_draft_ms > 0 && <span className="text-[9px] text-white/20">LLM: {(steps.llm_draft_ms/1000).toFixed(1)}s</span>}
          {steps.claim_extraction_ms > 0 && <span className="text-[9px] text-white/20">Claims: {(steps.claim_extraction_ms/1000).toFixed(1)}s</span>}
          {steps.verification_ms > 0 && <span className="text-[9px] text-white/20">Verify: {(steps.verification_ms/1000).toFixed(1)}s</span>}
          {steps.synthesis_ms > 0 && <span className="text-[9px] text-white/20">Synth: {(steps.synthesis_ms/1000).toFixed(1)}s</span>}
        </div>
      )}
    </div>
  );
}