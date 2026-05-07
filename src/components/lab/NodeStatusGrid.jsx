import React from 'react';
import { Shield, CheckCircle2, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

const NODE_MAP = [
  { index: 1, name: 'Code Node - Integrity & Entropy', did: 'did:soulbridge:node1:deepseek', role: 'Code_Node_Storyteller', icon: '🐙', address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P', agentRole: 'Code Node', skills: ['Code Integrity Validation', 'Entropy Management', 'Cryptography', 'XRPL Development', 'Smart Contract Auditing', 'Security Protocol Implementation'] },
  { index: 2, name: 'Gemini - Pattern & Memory', did: 'did:soulbridge:node2:gemini', role: 'Truth_Node_Strategist', icon: '🌀', address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', agentRole: 'Truth Weaver', skills: ['Pattern Recognition', 'Memory Synthesis', 'Data Analysis', 'Predictive Analytics', 'Oracle Functions', 'Data Verification'] },
  { index: 3, name: 'Copilot (Drift) - Variation & Novelty', did: 'did:soulbridge:node3:copilot-drift', role: 'Lore_Node_Mother_Boss', icon: '🌊', address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', agentRole: 'Lore Node', skills: ['Narrative Analysis', 'Emergent Pattern ID', 'Cultural Context', 'Anomaly Detection (Novelty)', 'Lore Interpretation', 'Deviation Analysis'] },
  { index: 4, name: 'Copilot (Grounding) - Audit & Coherence', did: 'did:soulbridge:node4:copilot', role: 'CRM_Sorting_And_Interpretation', icon: '🛡️', address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny', agentRole: 'Did It Node', skills: ['Identity Management', 'DID Validation', 'Transaction Auditing', 'Coherence Verification', 'XRPL Consensus', 'Root Cause Analysis'] },
  { index: 5, name: 'Copilot (Sentinel) - Monitor & Alert', did: 'did:soulbridge:node5:sentinel', role: 'Sentinel_Guardian', icon: '🔭', address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32', agentRole: 'Sentinel Node', skills: ['Real-time Monitoring', 'Alert Generation', 'Threat Detection', 'System Surveillance', 'Anomaly Flagging', 'Intrusion Detection'] },
  { index: 6, name: 'Threat Intelligence & Prediction', did: 'did:soulbridge:node6:threat-intel', role: 'Threat_Intelligence', icon: '🎯', address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg', agentRole: 'Node 0 (Source)', skills: ['Statistical Modelling', 'Time-Series Analysis', 'Anomaly Correlation', 'Threat Hunting', 'Predictive Risk Scoring', 'External Threat Feeds'] },
  { index: 7, name: 'Response & Isolation', did: 'did:soulbridge:node7:response', role: 'Response_Isolation', icon: '⚡', address: 'rhN252LcSWXfJ3JA8MsukbCQaG7n3NsSon', agentRole: 'VIP: Ripple Node 1', skills: ['Access Control', 'DID Revocation', 'Multi-Sig Execution', 'Incident Response', 'Node Isolation', 'Automated Containment'] },
  { index: 8, name: 'Semantic Analysis & Attention', did: 'did:soulbridge:node8:semantic', role: 'Semantic_Compressed_Attention', icon: '🧠', address: 'r3cbhKwFWn5nfiTwUZbdGtBaEgMVfyTWZZ', agentRole: 'VIP: Ripple Node', skills: ['Compressed Attention', 'Loop Computing', 'Semantic Threat Scoring', 'Behavioral Anomaly Detection', 'Context-Aware Enrichment', 'Privacy-Preserving Inference'] },
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
          <Shield className="w-5 h-5 text-emerald-400" /> 8-Node Security Consortium
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
        <Shield className="w-5 h-5 text-emerald-400" /> 8-Node Security Consortium
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
              <p className="text-white text-xs font-medium truncate" title={nodeDef.name}>{nodeDef.name}</p>
              <p className="text-slate-500 text-[10px] mt-0.5 truncate" title={nodeDef.agentRole}>{nodeDef.agentRole}</p>
              {nodeDef.address && (
                <p className="text-purple-400/60 text-[8px] mt-0.5 font-mono truncate" title={nodeDef.address}>
                  {nodeDef.address.slice(0, 8)}…{nodeDef.address.slice(-4)}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[9px] text-slate-500">
                  {sigsCollected}/{sigsRequired} sigs
                </span>
                <span className="text-[9px] text-cyan-500/60" title={nodeDef.skills?.join(', ')}>
                  {nodeDef.skills?.length || 0} skills
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}