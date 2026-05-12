import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import EarthTopBar from './earth/EarthTopBar';
import EarthActionFeed from './earth/EarthActionFeed';
import EarthConsensusGrid from './earth/EarthConsensusGrid';
import EarthImpactPanel from './earth/EarthImpactPanel';

export default function EarthMonitor() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['earth-monitor'],
    queryFn: async () => {
      const res = await base44.functions.invoke('earthNode', { action: 'monitor' });
      return res.data;
    },
    refetchInterval: 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['earth-monitor'] });
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  const trends = data?.trends || {};
  const actions = data?.recent_actions || [];
  const typeDistribution = data?.type_distribution || {};

  return (
    <div className="space-y-4">
      {/* Doctrine */}
      <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 text-xs text-emerald-300/80">
        <strong className="text-emerald-300">Earth Doctrine:</strong> The Earth Node is not a gate — it is a root.
        It does not ask "are you worthy?" — it asks "what is real?"
        Physical actions weigh <em>heavier</em> than digital. A tree planted, a river cleaned, a meal delivered — 
        these are the nutrients the Village draws from the soil of embodied reality.
        The 9-node consensus (8 braid + Earth) votes on each action. ≥6/9 APPROVE = CONNECTED.
        The earth remembers every root that reaches down.
      </div>

      <EarthTopBar trends={trends} onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EarthActionFeed actions={actions} />
        <div className="space-y-4">
          <EarthConsensusGrid actions={actions} />
          <EarthImpactPanel typeDistribution={typeDistribution} trends={trends} />
        </div>
      </div>
    </div>
  );
}