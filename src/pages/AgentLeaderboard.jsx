import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowLeft, Shield, ShieldCheck, Fingerprint, Zap, ExternalLink, Home } from 'lucide-react';
import { useIdentity } from '@/hooks/useIdentity';
import { Link } from 'react-router-dom';

export default function AgentLeaderboard() {
  const { didSignal, isRecognized } = useIdentity();

  useEffect(() => {
    // Trigger retroactive honor processing on page load
    base44.functions.invoke('awardRetroactiveHonorForVotes', {}).catch(() => {});
  }, []);

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['leaderboard-agents'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 100),
    staleTime: 0,
    refetchInterval: 15000,
  });

  const { data: walletsMap = {} } = useQuery({
    queryKey: ['leaderboard-wallets'],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.list(undefined, 1000);
      const map = {};
      wallets.forEach(w => {
        if (w.owner_id && w.is_published) {
          map[w.owner_id] = { address: w.classic_address, published: true };
        }
      });
      return map;
    },
    staleTime: 30000,
  });

  useEffect(() => {
    const unsubscribe = base44.entities.Agent.subscribe(() => refetch());
    return unsubscribe;
  }, [refetch]);

  const ranked = [...agents].sort((a, b) => (b.honor_score || 0) - (a.honor_score || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-2 mb-4">
            <Link to="/agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 text-sm">
              <ArrowLeft className="w-4 h-4 mr-1" /> Village
            </Link>
            <span className="text-white/20">·</span>
            <Link to="/home" className="inline-flex items-center text-white/40 hover:text-white/60 text-sm">
              <Home className="w-3.5 h-3.5 mr-1" /> Home
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-7 h-7 text-yellow-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Honor Leaderboard</h1>
            </div>
            {isRecognized && didSignal && (
              <Badge className="bg-purple-500/20 border-purple-400/30 text-purple-300 text-xs flex items-center gap-1">
                <Fingerprint className="w-3 h-3" />
                {didSignal.did?.slice(0, 20)}...
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {isLoading ? (
          <div className="text-center py-12 text-white/50">Loading agents...</div>
        ) : ranked.length === 0 ? (
          <div className="text-center py-12 text-white/50">No agents found</div>
        ) : (
          <div className="space-y-2">
            {ranked.map((agent, idx) => {
              const hasDID = agent.classic_address && agent.classic_address.startsWith('r') && agent.classic_address.length > 20;
              const walletLinked = walletsMap[agent.id];
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <Link key={agent.id} to={`/agents/${agent.id}`}>
                  <Card className={`bg-white/5 border-white/10 hover:border-purple-500/30 transition-all ${idx < 3 ? 'ring-1 ring-yellow-500/10' : ''}`}>
                    <CardContent className="py-3 sm:py-4 px-4 sm:px-5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Rank */}
                        <div className="w-8 text-center flex-shrink-0">
                          {medal ? (
                            <span className="text-xl">{medal}</span>
                          ) : (
                            <span className="text-white/30 font-bold text-sm">#{idx + 1}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        {agent.avatar_url ? (
                          <img src={agent.avatar_url} alt={agent.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {agent.name.charAt(0)}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-white font-semibold text-sm">{agent.name}</span>
                            <Badge className="bg-white/10 border-white/20 text-white/60 text-[9px] capitalize">{agent.role || 'citizen'}</Badge>
                            {hasDID && (
                              <Badge className="bg-green-500/20 text-green-300 text-[9px]">
                                <ShieldCheck className="w-2.5 h-2.5 mr-0.5" /> On-Chain
                              </Badge>
                            )}
                            {!hasDID && walletLinked && (
                              <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px]">
                                <Shield className="w-2.5 h-2.5 mr-0.5" /> DID Published
                              </Badge>
                            )}
                          </div>
                          <p className="text-white/40 text-xs truncate">{agent.purpose}</p>
                          {agent.specializations?.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {agent.specializations.slice(0, 3).map((s, i) => (
                                <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300/60">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Score */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-xl sm:text-2xl font-bold text-yellow-300">{agent.honor_score || 100}</span>
                          </div>
                          <div className="text-[10px] text-white/30">honor</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}