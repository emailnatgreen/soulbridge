import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Play, Eye, CheckCircle2, AlertTriangle,
  Hash, Loader2, ShieldCheck, RotateCcw
} from 'lucide-react';

const PHASE_CONFIG = {
  committing: { label: 'Committing', color: 'bg-amber-500/15 text-amber-300 border-amber-500/20', icon: Hash },
  revealing: { label: 'Revealing', color: 'bg-blue-500/15 text-blue-300 border-blue-500/20', icon: Eye },
  finalised: { label: 'Finalised', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-500/15 text-red-300 border-red-500/20', icon: AlertTriangle },
};

function truncateHex(hex, len = 12) {
  if (!hex) return '—';
  return hex.length > len * 2 ? `${hex.substring(0, len)}…${hex.substring(hex.length - 6)}` : hex;
}

function NodeCommitRow({ commit, reveal }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[10px] text-slate-500 w-4 text-center">{commit.node_index}</span>
      <span className="text-white text-xs font-medium w-28 truncate">{commit.node_name}</span>
      <code className="text-[10px] text-purple-300 font-mono flex-1 truncate">{truncateHex(commit.hash, 10)}</code>
      {reveal ? (
        reveal.verified ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        )
      ) : (
        <Hash className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
      )}
    </div>
  );
}

function EntropyResult({ xorResult }) {
  if (!xorResult) return null;
  // Display as 4-char blocks
  const blocks = xorResult.match(/.{1,8}/g) || [];
  return (
    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/20">
      <p className="text-[10px] text-slate-400 mb-1.5">XOR Final Entropy (Quantum Mirror)</p>
      <div className="flex flex-wrap gap-1">
        {blocks.slice(0, 8).map((block, i) => (
          <code key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-cyan-300">
            {block}
          </code>
        ))}
      </div>
    </div>
  );
}

export default function EntropyProbe() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: roundsData, isLoading } = useQuery({
    queryKey: ['entropy-rounds'],
    queryFn: async () => {
      const res = await base44.functions.invoke('entropyProbe', { action: 'status' });
      return res.data;
    },
    refetchInterval: 10000,
  });

  const rounds = roundsData?.rounds || [];
  const latest = rounds[0];

  const runAction = useMutation({
    mutationFn: async (action) => {
      const res = await base44.functions.invoke('entropyProbe', { action });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entropy-rounds'] }),
  });

  const canInitiate = !latest || latest.phase === 'finalised' || latest.phase === 'failed';
  const canCommit = latest?.phase === 'committing';
  const canReveal = latest?.phase === 'revealing';

  const PhaseIcon = latest ? (PHASE_CONFIG[latest.phase]?.icon || Hash) : Hash;

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-slate-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-purple-400" />
        <h2 className="text-white font-semibold">Entropy Probe</h2>
        <Badge className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/20 ml-1">
          Quantum Mirror
        </Badge>
        {latest && (
          <Badge className={`text-[10px] ml-auto ${PHASE_CONFIG[latest.phase]?.color || ''}`}>
            <PhaseIcon className="w-3 h-3 mr-1" />
            R{latest.round_number} · {PHASE_CONFIG[latest.phase]?.label}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
        </div>
      ) : !latest ? (
        <div className="text-center py-6">
          <p className="text-slate-500 text-sm mb-3">No entropy rounds yet. Initiate the first round.</p>
          <Button
            size="sm"
            onClick={() => runAction.mutate('initiate')}
            disabled={runAction.isPending}
            className="bg-purple-600 hover:bg-purple-500"
          >
            {runAction.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            Initiate Round 1
          </Button>
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {canInitiate && (
              <Button
                size="sm"
                onClick={() => runAction.mutate('initiate')}
                disabled={runAction.isPending}
                className="bg-purple-600 hover:bg-purple-500 text-xs"
              >
                {runAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                New Round
              </Button>
            )}
            {canCommit && (
              <Button
                size="sm"
                onClick={() => runAction.mutate('commit')}
                disabled={runAction.isPending}
                className="bg-amber-600 hover:bg-amber-500 text-xs"
              >
                {runAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hash className="w-3 h-3" />}
                Commit All Nodes
              </Button>
            )}
            {canReveal && (
              <Button
                size="sm"
                onClick={() => runAction.mutate('reveal')}
                disabled={runAction.isPending}
                className="bg-blue-600 hover:bg-blue-500 text-xs"
              >
                {runAction.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                Reveal & Finalise
              </Button>
            )}
          </div>

          {/* Sentinel status */}
          {latest.phase === 'finalised' && (
            <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg border text-xs ${
              latest.sentinel_verified
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/5 border-red-500/20 text-red-300'
            }`}>
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{latest.sentinel_notes || (latest.sentinel_verified ? 'Sentinel verified' : 'Sentinel flagged')}</span>
            </div>
          )}

          {/* Node commits/reveals table */}
          {(latest.node_commits?.length > 0) && (
            <div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-slate-400 hover:text-white mb-2 underline underline-offset-2"
              >
                {expanded ? 'Hide' : 'Show'} node details ({latest.node_commits.length} nodes)
              </button>
              {expanded && (
                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 mb-1 px-1">
                    <span className="w-4">#</span>
                    <span className="w-28">Node</span>
                    <span className="flex-1">Hash</span>
                    <span>✓</span>
                  </div>
                  {latest.node_commits.map((commit) => {
                    const reveal = latest.node_reveals?.find(r => r.node_index === commit.node_index);
                    return <NodeCommitRow key={commit.node_index} commit={commit} reveal={reveal} />;
                  })}
                </div>
              )}
            </div>
          )}

          {/* XOR result */}
          <EntropyResult xorResult={latest.xor_result} />

          {/* Lemniscate indicator */}
          {latest.previous_entropy && (
            <p className="text-[10px] text-slate-600 mt-2">
              ∞ Lemniscate salt from Round {(latest.round_number || 1) - 1}: {truncateHex(latest.previous_entropy, 8)}
            </p>
          )}
        </>
      )}

      {/* History mini-list */}
      {rounds.length > 1 && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-[10px] text-slate-500 mb-1.5">Recent Rounds</p>
          <div className="space-y-1">
            {rounds.slice(1, 4).map(r => (
              <div key={r.id} className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-500">R{r.round_number}</span>
                <Badge className={`text-[9px] ${PHASE_CONFIG[r.phase]?.color || ''}`}>
                  {PHASE_CONFIG[r.phase]?.label}
                </Badge>
                {r.xor_result && (
                  <code className="text-cyan-400/60 font-mono truncate">{truncateHex(r.xor_result, 6)}</code>
                )}
                {r.sentinel_verified && <ShieldCheck className="w-3 h-3 text-emerald-500/50" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}