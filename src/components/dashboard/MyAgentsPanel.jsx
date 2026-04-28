import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Users, Sparkles, Lock, Zap, ChevronRight } from 'lucide-react';
import AgentCommandCard from '@/components/agents/AgentCommandCard';

const GENESIS_WIDGET_NFT_ID = 'WIDGET-AGN-001';

export default function MyAgentsPanel({ userEmail }) {
  const queryClient = useQueryClient();

  // Check if user owns the Agent Genesis NFT
  const { data: genesisWidget, isLoading: widgetLoading } = useQuery({
    queryKey: ['genesis-widget-check'],
    queryFn: async () => {
      const widgets = await base44.entities.Widget.filter({ nft_id: GENESIS_WIDGET_NFT_ID });
      return widgets?.[0] || null;
    },
    staleTime: 60000,
  });

  // Fetch user's agents
  const { data: myAgents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['my-agents', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return base44.entities.Agent.filter({ created_by: userEmail }, '-created_date', 50);
    },
    enabled: !!userEmail,
  });

  // Fetch wallet map for DID display
  const { data: walletsMap = {} } = useQuery({
    queryKey: ['my-agents-wallets'],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.list(undefined, 200);
      const map = {};
      wallets.forEach(w => { if (w.id) map[w.id] = w; });
      return map;
    },
    staleTime: 30000,
  });

  // Get streaming fee from widget metadata
  const streamingFee = genesisWidget?.cost_per_stream_interval || 0.025;

  const handleStatusChange = (agentId, newStatus) => {
    queryClient.setQueryData(['my-agents', userEmail], (old) =>
      (old || []).map(a => a.id === agentId ? { ...a, is_serving: newStatus } : a)
    );
  };

  const servingCount = myAgents.filter(a => a.is_serving).length;
  const dailyCost = (servingCount * streamingFee).toFixed(3);
  const hasNFT = !!genesisWidget;
  const isLoading = widgetLoading || agentsLoading;

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="h-4 w-32 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  // NFT NOT owned — show unlock CTA
  if (!hasNFT) {
    return (
      <div className="bg-gradient-to-br from-slate-900/60 to-purple-900/30 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Agent Command Center</h3>
            <p className="text-white/40 text-xs">Unlock by acquiring the Agent Genesis NFT</p>
          </div>
        </div>
        <p className="text-white/50 text-xs mb-4 leading-relaxed">
          The Agent Genesis Unlock NFT ({GENESIS_WIDGET_NFT_ID}) grants you the ability to create, manage, and activate AI agents in the Village. Each serving agent contributes to the ecosystem and incurs a small streaming fee.
        </p>
        <Link to="/widget-marketplace"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all">
          <Sparkles className="w-4 h-4" /> Browse Widget Marketplace
        </Link>
      </div>
    );
  }

  // NFT owned — show Agent Command Center
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-semibold text-sm">My Agents</h3>
          <span className="text-white/30 text-xs">({myAgents.length})</span>
        </div>
        <Link to="/agents" className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1">
          All Agents <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Cost summary */}
      {servingCount > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-300 text-xs">{servingCount} agent{servingCount !== 1 ? 's' : ''} serving</span>
          </div>
          <span className="text-green-300 text-xs font-mono">-{dailyCost} RLUSD/day</span>
        </div>
      )}

      {/* Agent grid */}
      {myAgents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {myAgents.map(agent => (
            <AgentCommandCard
              key={agent.id}
              agent={agent}
              walletData={walletsMap[agent.wallet_id]}
              streamingFee={streamingFee}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-xs mb-3">No agents yet — create your first!</p>
        </div>
      )}

      {/* Create agent CTA */}
      <Link to="/agent-genesis"
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-all w-full">
        <Sparkles className="w-4 h-4" /> Create New Agent
      </Link>
    </div>
  );
}