import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Activity, Shield, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const THREAT_COLORS = {
  NOMINAL: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  GUARDED: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  ELEVATED: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  CRITICAL: 'bg-red-500/15 text-red-300 border-red-500/20',
};

const SEV_COLORS = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-amber-400',
  low: 'text-slate-400',
};

function ThreatRow({ threat, index }) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/[0.02] border border-white/5">
      <span className="text-[10px] text-slate-500 w-4">{index + 1}</span>
      <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${SEV_COLORS[threat.severity]}`} />
      <span className="text-xs text-white truncate flex-1">{threat.anomaly_detail || threat.event_type}</span>
      <span className={`text-[10px] font-mono ${SEV_COLORS[threat.severity]}`}>{threat.severity}</span>
      <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[9px] px-1.5">
        {threat.score}/100
      </Badge>
    </div>
  );
}

function AnomalyBadge({ anomaly }) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded bg-white/[0.02] border border-white/5">
      <Zap className={`w-3 h-3 flex-shrink-0 ${SEV_COLORS[anomaly.severity]}`} />
      <span className="text-[10px] text-slate-300 flex-1 truncate">{anomaly.description}</span>
      <span className={`text-[9px] ${SEV_COLORS[anomaly.severity]}`}>{anomaly.severity}</span>
    </div>
  );
}

export default function CompressedAttentionPanel() {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['ca-status'],
    queryFn: () => base44.functions.invoke('compressedAttention', { action: 'status' }).then(r => r.data),
    refetchInterval: 60000,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('compressedAttention', { action: 'analyze' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ca-status'] }),
  });

  const result = analyzeMutation.data?.data;
  const isAnalyzing = analyzeMutation.isPending;

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-slate-900/60 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          Node 8 — Compressed Attention
        </h2>
        <div className="flex items-center gap-2">
          {statusData && (
            <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-[10px]">
              {statusData.last_analyses} analyses
            </Badge>
          )}
          <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
            {statusLoading ? '…' : statusData?.status || 'unknown'}
          </Badge>
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {['Compressed Attention', 'Loop Computing', 'Semantic Scoring', 'Behavioral Anomaly', 'Context Enrichment', 'Privacy-Preserving'].map(cap => (
          <span key={cap} className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/15">
            {cap}
          </span>
        ))}
      </div>

      {/* Run Analysis */}
      <Button
        onClick={() => analyzeMutation.mutate()}
        disabled={isAnalyzing}
        className="w-full mb-4 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30"
        variant="outline"
        size="sm"
      >
        {isAnalyzing ? (
          <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Analyzing…</>
        ) : (
          <><Activity className="w-3.5 h-3.5 mr-1.5" /> Run Compressed Attention</>
        )}
      </Button>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Threat Level Banner */}
          <div className={`rounded-xl p-3 border ${THREAT_COLORS[result.threat_level]}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-semibold">Threat Level: {result.threat_level}</span>
              </div>
              <span className="text-xs font-mono">{result.summary.processing_ms}ms</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBox label="Avg Score" value={`${result.summary.avg_threat_score}/100`} icon={BarChart3} />
            <StatBox label="Signals" value={result.summary.signals_processed.tripwire + result.summary.signals_processed.entropy + result.summary.signals_processed.mwtp} icon={Activity} />
            <StatBox label="Anomalies" value={result.summary.anomalies_detected} icon={AlertTriangle} />
            <StatBox label="Loops" value={`${result.summary.loop_computing.passes}${result.summary.loop_computing.converged ? ' ✓' : ''}`} icon={RefreshCw} />
          </div>

          {/* Top Threats */}
          {result.top_threats?.length > 0 && (
            <div>
              <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 transition-colors">
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Top Threats ({result.top_threats.length})
              </button>
              {expanded && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {result.top_threats.map((t, i) => <ThreatRow key={t.id} threat={t} index={i} />)}
                </div>
              )}
            </div>
          )}

          {/* Anomalies */}
          {result.anomalies?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5">Behavioral Anomalies ({result.anomalies.length})</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {result.anomalies.map((a, i) => <AnomalyBadge key={i} anomaly={a} />)}
              </div>
            </div>
          )}

          {/* New Alerts */}
          {result.new_alerts?.length > 0 && (
            <p className="text-[10px] text-amber-400">
              ⚠ {result.new_alerts.length} new alert(s) injected into Tripwire
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-center">
      <Icon className="w-3 h-3 text-purple-400 mx-auto mb-1" />
      <p className="text-white text-sm font-semibold">{value}</p>
      <p className="text-[9px] text-slate-500">{label}</p>
    </div>
  );
}