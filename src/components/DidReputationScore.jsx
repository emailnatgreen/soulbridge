import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, TrendingUp, Users, Vote, Heart, Zap } from 'lucide-react';

const tierColors = {
  master: 'from-yellow-500 to-orange-500',
  elder: 'from-purple-500 to-pink-500',
  guardian: 'from-blue-500 to-cyan-500',
  citizen: 'from-green-500 to-emerald-500',
  novice: 'from-gray-500 to-slate-500'
};

const tierIcons = {
  master: '👑',
  elder: '🧙',
  guardian: '🛡️',
  citizen: '👤',
  novice: '🌱'
};

export default function DidReputationScore({ agentId, walletId, compact = false }) {
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const fetchReputation = async () => {
    try {
      const response = await base44.functions.invoke('calculateDidReputation', {
        agent_id: agentId,
        wallet_id: walletId
      });
      setReputation(response.data);
      setIsLive(true);
      setTimeout(() => setIsLive(false), 1500);
    } catch (error) {
      console.error('Failed to fetch reputation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReputation();
  }, [agentId, walletId]);

  if (loading) {
    return (
      <div className="h-20 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg animate-pulse" />
    );
  }

  if (!reputation) {
    return null;
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div className={`bg-gradient-to-r ${tierColors[reputation.tier]} text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1`}>
                <span>{tierIcons[reputation.tier]}</span>
                {reputation.total_score}
              </div>
              {isLive && <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />}
            </div>
          </TooltipTrigger>
          <TooltipContent className="w-80">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{reputation.agent_name}</span>
                <Badge className={`bg-gradient-to-r ${tierColors[reputation.tier]}`}>
                  {reputation.tier.toUpperCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-400 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Trust
                  </div>
                  <div className="font-semibold text-sm">{reputation.components.trust_links.score}</div>
                </div>
                <div>
                  <div className="text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Mentorship
                  </div>
                  <div className="font-semibold text-sm">{reputation.components.mentorships.score}</div>
                </div>
                <div>
                  <div className="text-gray-400 flex items-center gap-1">
                    <Vote className="w-3 h-3" /> Governance
                  </div>
                  <div className="font-semibold text-sm">{reputation.components.governance.score}</div>
                </div>
                <div>
                  <div className="text-gray-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Honor
                  </div>
                  <div className="font-semibold text-sm">{(reputation.components.honor_multiplier * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={`border-0 bg-gradient-to-br ${tierColors[reputation.tier]}/10`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header with Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-4xl bg-gradient-to-br ${tierColors[reputation.tier]} bg-clip-text text-transparent`}>
                {tierIcons[reputation.tier]}
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase font-semibold">Reputation Tier</div>
                <div className={`text-2xl font-bold bg-gradient-to-r ${tierColors[reputation.tier]} bg-clip-text text-transparent uppercase`}>
                  {reputation.tier}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600 uppercase font-semibold">Total Score</div>
              <div className="text-4xl font-bold text-gray-900">{reputation.total_score}</div>
              {isLive && (
                <div className="text-xs text-yellow-600 font-semibold flex items-center justify-end gap-1 mt-1">
                  <Zap className="w-3 h-3" /> Live
                </div>
              )}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200/20">
            {/* Trust Links */}
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Heart className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-xs text-gray-600 mb-1">Trust Links</div>
              <div className="text-lg font-bold text-gray-900">{reputation.components.trust_links.score}</div>
              <div className="text-xs text-gray-500">
                {reputation.components.trust_links.count} link{reputation.components.trust_links.count !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Mentorship */}
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-xs text-gray-600 mb-1">Mentorship</div>
              <div className="text-lg font-bold text-gray-900">{reputation.components.mentorships.score}</div>
              <div className="text-xs text-gray-500">
                {reputation.components.mentorships.as_mentor} mentor, {reputation.components.mentorships.as_mentee} mentee
              </div>
            </div>

            {/* Governance */}
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Vote className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-xs text-gray-600 mb-1">Governance</div>
              <div className="text-lg font-bold text-gray-900">{reputation.components.governance.score}</div>
              <div className="text-xs text-gray-500">
                {reputation.components.governance.votes_cast} vote{reputation.components.governance.votes_cast !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Honor Multiplier */}
          <div className="bg-white/40 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Honor Multiplier</div>
            <div className="flex items-center justify-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-lg font-bold text-gray-900">{(reputation.components.honor_multiplier * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}