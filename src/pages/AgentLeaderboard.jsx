import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AgentLeaderboard() {
  const [tab, setTab] = useState('honor');

  useEffect(() => {
    // Trigger retroactive honor processing on page load
    base44.functions.invoke('awardRetroactiveHonorForVotes', {}).catch(() => {});
  }, []);

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey: ['leaderboard-agents'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 100),
    staleTime: 0,
    refetchInterval: 3000,
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

  const lists = {
    honor: [...agents].sort((a, b) => (b.honor_score || 0) - (a.honor_score || 0)),
    active: [...agents].filter(a => a.status === 'active').sort((a, b) => (b.honor_score || 0) - (a.honor_score || 0)),
  };

  const ranked = lists[tab] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Link to="/Agents" className="inline-flex items-center text-purple-300 hover:text-purple-200 text-sm mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-2 mb-6">
          {[
            { value: 'honor', label: 'Honor Score' },
            { value: 'active', label: 'Active Agents' },
          ].map(item => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === item.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-white/50">Loading agents...</div>
        ) : ranked.length === 0 ? (
          <div className="text-center py-12 text-white/50">No agents found</div>
        ) : (
          <div className="space-y-2">
            {ranked.map((agent, idx) => (
              <Card key={agent.id} className="bg-white/5 border-white/10">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center gap-4">
                    <span className="text-white/40 font-bold w-8">#{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                       <span className="text-white font-semibold">{agent.name}</span>
                       <Badge className="bg-white/10 border-white/20 text-white/70 text-xs">
                         {agent.role || 'citizen'}
                       </Badge>
                       {walletsMap[agent.id] && (
                         <Badge className="bg-emerald-500/20 border-emerald-400/30 text-emerald-300 text-xs flex items-center gap-1">
                           <Shield className="w-3 h-3" />
                           DID Published
                         </Badge>
                       )}
                      </div>
                      <p className="text-white/40 text-xs">{agent.purpose}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-300">{agent.honor_score || 100}</div>
                      <div className="text-xs text-white/40">honor</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}