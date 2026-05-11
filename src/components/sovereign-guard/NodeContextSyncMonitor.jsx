import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, RefreshCcw, Loader2, Activity, Shield, Fingerprint, Zap, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_COLORS = {
  NOMINAL: { bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  GUARDED: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  ELEVATED: { bg: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400' },
  CRITICAL: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
  UNKNOWN: { bg: 'bg-white/5 border-white/10', text: 'text-white/40', dot: 'bg-white/30' },
};

const NODE_STATUS_ICON = {
  healthy: { Icon: CheckCircle2, color: 'text-green-400' },
  stressed: { Icon: AlertTriangle, color: 'text-amber-400' },
  unsigned: { Icon: XCircle, color: 'text-white/20' },
};

function NodeGrid({ nodes }) {
  if (!nodes?.length) return null;
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {nodes.map(n => {
        const cfg = NODE_STATUS_ICON[n.status] || NODE_STATUS_ICON.unsigned;
        return (
          <div key={n.index} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <cfg.Icon className={`w-3.5 h-3.5 mx-auto ${cfg.color}`} />
            <p className="text-white/50 text-[8px] mt-1 truncate">{n.name}</p>
            {n.active_tripwires > 0 && (
              <Badge className="text-[7px] bg-red-500/15 text-red-300 border-red-500/30 mt-0.5">{n.active_tripwires} trip</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function NodeContextSyncMonitor() {
  const queryClient = useQueryClient();
  const [showNodes, setShowNodes] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['node-context-latest'],
    queryFn: async () => {
      const res = await base44.functions.invoke('nodeContextSync', { action: 'latest' });
      return res.data || res;
    },
    refetchInterval: 30000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('nodeContextSync', { action: 'sync' });
      return res.data || res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['node-context-latest'] });
    },
  });

  const frame = data?.data;
  const network = frame?.network;
  const statusKey = network?.status || 'UNKNOWN';
  const colors = STATUS_COLORS[statusKey] || STATUS_COLORS.UNKNOWN;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">8-Node Context Sync</h3>
          <Badge className="text-[8px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">PHASE 3</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="text-white/40 hover:text-white h-7 text-xs gap-1"
        >
          {syncMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          Sync Now
        </Button>
      </div>

      {/* Network Status Banner */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        </div>
      ) : !frame ? (
        <div className="text-center py-6">
          <p className="text-white/30 text-xs mb-3">No context frame available yet.</p>
          <Button
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
          >
            {syncMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
            Run First Sync
          </Button>
        </div>
      ) : (
        <>
          {/* Big status card */}
          <div className={`rounded-xl border ${colors.bg} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} animate-pulse`} />
                <span className={`text-lg font-bold ${colors.text}`}>{statusKey}</span>
              </div>
              <span className={`text-2xl font-black ${colors.text}`}>{network?.score ?? '?'}<span className="text-sm font-normal text-white/30">/100</span></span>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-white/30 text-[9px]">Nodes</p>
                <p className="text-white text-sm font-semibold">{network?.healthy ?? 0}<span className="text-white/30">/{network?.node_count ?? 8}</span></p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[9px]">Tripwires</p>
                <p className="text-white text-sm font-semibold">{frame?.tripwire?.active ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[9px]">Attention</p>
                <p className={`text-sm font-semibold ${
                  frame?.attention?.threat_level === 'CRITICAL' ? 'text-red-400' :
                  frame?.attention?.threat_level === 'ELEVATED' ? 'text-amber-400' : 'text-green-400'
                }`}>{frame?.attention?.threat_level || '—'}</p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[9px]">Agents</p>
                <p className="text-white text-sm font-semibold">{frame?.agents?.active ?? 0}</p>
              </div>
            </div>
          </div>

          {/* Gate status */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300 text-[10px] font-semibold">Hydrogeo Gate</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-green-400">{frame?.gates?.hydrogeo?.granted ?? 0} granted</span>
                <span className="text-red-400">{frame?.gates?.hydrogeo?.denied ?? 0} denied</span>
              </div>
            </div>
            <div className="rounded-lg border border-purple-500/10 bg-purple-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 text-[10px] font-semibold">Soul Signature</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-green-400">{frame?.gates?.soul_signature?.approved ?? 0} ok</span>
                <span className="text-amber-400">{frame?.gates?.soul_signature?.caution ?? 0} caution</span>
                <span className="text-red-400">{frame?.gates?.soul_signature?.denied ?? 0} denied</span>
              </div>
            </div>
          </div>

          {/* Entropy */}
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white/60 text-[10px] font-semibold">Entropy Round #{frame?.entropy?.latest_round || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`text-[7px] ${
                  frame?.entropy?.phase === 'finalised' ? 'bg-green-500/15 text-green-300 border-green-500/30' :
                  frame?.entropy?.phase === 'failed' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                  'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}>{frame?.entropy?.phase}</Badge>
                {frame?.entropy?.sentinel_verified && (
                  <Badge className="text-[7px] bg-green-500/15 text-green-300 border-green-500/30">Sentinel ✓</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Node Grid toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNodes(!showNodes)}
            className="text-white/30 hover:text-white text-[10px] w-full h-7"
          >
            {showNodes ? 'Hide' : 'Show'} Node Grid ({network?.healthy ?? 0}/{network?.node_count ?? 8} healthy)
          </Button>
          {showNodes && <NodeGrid nodes={frame?.nodes} />}

          {/* Frame metadata */}
          <div className="flex items-center justify-between text-[9px] text-white/15 px-1">
            <span>Synced: {frame?.synced_at ? new Date(frame.synced_at).toLocaleString('en-GB') : '—'}</span>
            <span>{frame?.processing_ms ?? 0}ms</span>
          </div>
        </>
      )}
    </div>
  );
}