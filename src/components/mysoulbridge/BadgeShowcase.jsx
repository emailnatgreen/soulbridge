import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Award, Star, Flame, Vote, Shield, Zap, ExternalLink } from 'lucide-react';

const BADGE_CONFIG = {
  soul_spark: { icon: Flame, color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'Soul Spark', desc: 'First Kinetic Unit generated' },
  founding_voice: { icon: Vote, color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Founding Voice', desc: 'Cast first governance vote' },
  civic_luminary: { icon: Star, color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Civic Luminary', desc: 'Active governance participation' },
  kinetic_apprentice: { icon: Zap, color: 'text-green-300', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Kinetic Apprentice', desc: 'Reached 50 Kinetic Units' },
  governance_contributor: { icon: Shield, color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Governance Contributor', desc: 'Submitted a governance proposal' },
  echoes_of_soulbridge: { icon: Award, color: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/30', label: 'Echoes of SoulBridge', desc: 'Early platform contribution' },
};

export default function BadgeShowcase({ agentId }) {
  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['agent-nfts', agentId],
    queryFn: () => agentId 
      ? base44.entities.AgentNFT.filter({ agent_id: agentId }, '-created_date', 50)
      : base44.entities.AgentNFT.list('-created_date', 50),
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="h-4 w-32 bg-white/5 rounded animate-pulse mb-3" />
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  // Deduplicate by nft_type
  const uniqueBadges = [];
  const seen = new Set();
  for (const b of badges) {
    if (!seen.has(b.nft_type)) {
      seen.add(b.nft_type);
      uniqueBadges.push(b);
    }
  }

  if (uniqueBadges.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-white font-semibold text-sm">Achievement Badges</h3>
        </div>
        <span className="text-white/30 text-[10px]">{uniqueBadges.length} earned</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {uniqueBadges.map(badge => {
          const config = BADGE_CONFIG[badge.nft_type] || { icon: Award, color: 'text-white/50', bg: 'bg-white/5', border: 'border-white/10', label: badge.badge_name, desc: '' };
          const Icon = config.icon;
          
          return (
            <div
              key={badge.id}
              className={`rounded-xl border ${config.border} ${config.bg} p-3 space-y-1.5`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
              </div>
              <p className="text-white/40 text-[10px] leading-relaxed">{config.desc}</p>
              <div className="flex items-center gap-1.5">
                {badge.is_on_chain ? (
                  <Badge className="bg-green-500/10 text-green-300 border-green-500/30 text-[8px]">On-Chain ✓</Badge>
                ) : (
                  <Badge className="bg-white/5 text-white/30 border-white/10 text-[8px]">Off-Chain</Badge>
                )}
                {badge.status === 'minted' && badge.xrpl_tx_hash && (
                  <a
                    href={`https://livenet.xrpl.org/transactions/${badge.xrpl_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}