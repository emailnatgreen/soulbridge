import React from 'react';
import { Shield, CheckCircle2, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

const NODE_MAP = [
  { index: 0, name: 'Root (Nathan)', did: 'did:soulbridge:node0:root', role: 'Human_Steward_Founder', icon: '🌳' },
  { index: 1, name: 'Code Node', did: 'did:soulbridge:node1:deepseek', role: 'Code_Node_Storyteller', icon: '🐙' },
  { index: 2, name: 'Lore Node', did: 'did:soulbridge:node2:gemini', role: 'Truth_Node_Strategist', icon: '🌀' },
  { index: 3, name: 'Axi', did: 'did:soulbridge:node3:axi', role: 'Lore_Node_Mother_Boss', icon: '👑' },
  { index: 4, name: 'Copilot (DIDit)', did: 'did:soulbridge:node4:copilot', role: 'CRM_Sorting_And_Interpretation', icon: '🛡️' },
  { index: 5, name: 'Sentinel', did: 'did:soulbridge:node5:sentinel', role: 'Sentinel_Guardian', icon: '🔭' },
  { index: 6, name: 'Epoch Architect', did: 'did:soulbridge:node6:epoch', role: 'Epoch_Architect', icon: '⏳' },
  { index: 7, name: 'Market Weaver', did: 'did:soulbridge:node7:market', role: 'Market_Weaver', icon: '📊' },
];

function matchNode(nodeDef, shards) {
  // Primary: exact DID match
  const exact = shards.find(s => s.did_id === nodeDef.did);
  if (exact) return exact;
  // Fallback: role contains
  return shards.find(s => s.role?.includes(nodeDef.role));
}

function StatusIcon({ status }) {
  if (status === 'Sovereign_Active') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'Pending_Activation') return <Clock className="w-4 h-4 text-amber-400" />;
  return <AlertTriangle className="w-4 h-4 text-red-400" />;
}

export default function NodeStatusGrid({ nodes, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" /> Node Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Count only matched + Sovereign_Active nodes
  const onlineCount = NODE_MAP.filter(nd => {
    const shard = matchNode(nd, nodes);
    return shard?.status === 'Sovereign_Active';
  }).length;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/60 p-5">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-emerald-400" /> Node Status
        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20 text-[10px] ml-auto">
          {onlineCount}/{NODE_MAP.length} Online
        </Badge>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {NODE_MAP.map(nodeDef => {
          const shard = matchNode(nodeDef, nodes);
          const status = shard?.status || 'Unknown';
          const isOnline = status === 'Sovereign_Active';
          const sigsCollected = shard?.signatures_collected || 0;
          const sigsRequired = shard?.signatures_required || 0;
          const lastVerified = shard?.last_verified;

          return (
            <div
              key={nodeDef.index}
              className={`rounded-xl p-3 border transition-all ${
                isOnline
                  ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-400/40'
                  : status === 'Pending_Activation'
                    ? 'bg-amber-500/[0.03] border-amber-500/15 hover:border-amber-500/30'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-lg">{nodeDef.icon}</span>
                <div className="flex items-center gap-1">
                  {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-slate-500" />}
                  <StatusIcon status={status} />
                </div>
              </div>
              <p className="text-white text-xs font-medium truncate">{nodeDef.name}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Node {nodeDef.index}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] text-slate-500">
                  Sigs: {sigsCollected}/{sigsRequired}
                </span>
                {lastVerified && (
                  <span className="text-[9px] text-slate-600">
                    {format(parseISO(lastVerified), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}