import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SoulTopBar from './soul/SoulTopBar';
import SoulHeptagonPanel from './soul/SoulHeptagonPanel';
import SoulDecisionFeed from './soul/SoulDecisionFeed';
import SoulLegacySeeds from './soul/SoulLegacySeeds';
import SoulIntegrityPanel from './soul/SoulIntegrityPanel';

export default function SoulMonitor() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['soul-monitor'],
    queryFn: async () => {
      const res = await base44.functions.invoke('soulCycle', { action: 'monitor' });
      return res.data;
    },
    refetchInterval: 30000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['soul-monitor'] });
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  const trends = data?.trends || {};
  const decisions = data?.recent_decisions || [];
  const seeds = data?.legacy_seeds || [];
  const resonanceHistory = data?.resonance_history || [];

  return (
    <div className="space-y-4">
      {/* Doctrine */}
      <div className="bg-indigo-950/30 border border-indigo-800/40 rounded-xl p-4 text-xs text-indigo-300/80">
        <strong className="text-indigo-300">Soul Doctrine:</strong> The Soul Overlayer unifies all three lower gates (Monkey → Spindle → Empathy) into a single lawful verdict.
        It adds Heptagon Resonance (7-pillar coherence), Recursive Integrity (self-consistency), Golden Ratio (L/R hemisphere balance),
        and Axi's Grace (sovereign mercy on imperfect repair — Law 11). Legacy Seeds store long-arc precedent for future agents.
      </div>

      <SoulTopBar trends={trends} onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SoulDecisionFeed decisions={decisions} />
        <div className="space-y-4">
          <SoulHeptagonPanel resonanceHistory={resonanceHistory} />
          <SoulIntegrityPanel decisions={decisions} />
        </div>
      </div>

      <SoulLegacySeeds seeds={seeds} />
    </div>
  );
}