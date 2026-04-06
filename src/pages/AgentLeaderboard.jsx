import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Zap, TrendingUp, Award, ArrowLeft, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AgentLeaderboard() {
  const [tab, setTab] = useState('honor');
  const [currentDID, setCurrentDID] = useState(null);

  useEffect(() => {
    try {
      const identity = localStorage.getItem('soulbridge_identity');
      if (identity) setCurrentDID(JSON.parse(identity));
    } catch (e) {}
  }, []);

  // Fetch live agent data
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['leaderboard-agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 500),
  });

  // Fetch kinetic units (live activity metric)
  const { data: kinetics = [] } = useQuery({
    queryKey: ['leaderboard-kinetics'],
    queryFn: () => base44.entities.KineticUnit.list('-created_date', 1000),
  });

  // Fetch reputation data
  const { data: reputation = [] } = useQuery({
    queryKey: ['leaderboard-reputation'],
    queryFn: () => base44.entities.ReputationEvent.list('-created_date', 500),
  });

  // Fetch governance votes
  const { data: votes = [] } = useQuery({
    queryKey: ['leaderboard-votes'],
    queryFn: () => base44.entities.GovernanceVote.list('-created_date', 1000),
  });

  // Enrich agents with live metrics
  const enriched = agents.map(agent => {
    const kuWeightedScore = kinetics
      .filter(k => k.agent_id === agent.id)
      .reduce((sum, k) => sum + (k.weighted_score || 0), 0);
    const voteCount = votes.filter(v => v.voter_agent_id === agent.id).length;
    const repScore = reputation
      .filter(r => r.agent_id === agent.id)
      .reduce((sum, r) => sum + (r.honor_gained || 0), 0);
    
    return {
      ...agent,
      kuWeightedScore,
      voteCount,
      repScore,
    };
  });

  // Create leaderboard lists
  const byHonor = [...enriched].sort((a, b) => (b.honor_score || 0) - (a.honor_score || 0));
  const byKinetic = [...enriched].sort((a, b) => b.kuWeightedScore - a.kuWeightedScore);
  const byVotes = [...enriched].sort((a, b) => b.voteCount - a.voteCount);
  const byReputation = [...enriched].sort((a, b) => b.repScore - a.repScore);

  const lists = {
    honor: byHonor,
    kinetic: byKinetic,
    votes: byVotes,
    reputation: byReputation,
  };

  const ranked = lists[tab] || byHonor;

  const getMetricValue = (agent) => {
    switch(tab) {
      case 'kinetic': return agent.kuWeightedScore;
      case 'votes': return agent.voteCount;
      case 'reputation': return agent.repScore;
      default: return agent.honor_score || 0;
    }
  };

  const getMaxValue = () => {
    if (ranked.length === 0) return 1;
    return Math.max(...ranked.map(getMetricValue), 1);
  };

  const maxVal = getMaxValue();

  const getRankLabel = (score) => {
    if (score >= 90) return 'Legendary';
    if (score >= 75) return 'Elite';
    if (score >= 60) return 'Honored';
    if (score >= 40) return 'Rising';
    return 'Citizen';
  };

  const getRankColor = (score) => {
    if (score >= 90) return 'text-yellow-300';
    if (score >= 75) return 'text-purple-300';
    if (score >= 60) return 'text-blue-300';
    if (score >= 40) return 'text-green-300';
    return 'text-white/60';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Link to="/Agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 text-sm mb-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
                <p className="text-xs text-white/50 mt-1">Live Village Rankings</p>
              </div>
            </div>
            {currentDID && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">
                <Fingerprint className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Leaderboard Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1 w-full">
            <TabsTrigger value="honor" className="text-xs sm:text-sm">
              <Trophy className="w-3 h-3 mr-1" />
              Honor
            </TabsTrigger>
            <TabsTrigger value="kinetic" className="text-xs sm:text-sm">
              <Zap className="w-3 h-3 mr-1" />
              Kinetic
            </TabsTrigger>
            <TabsTrigger value="votes" className="text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              Votes
            </TabsTrigger>
            <TabsTrigger value="reputation" className="text-xs sm:text-sm">
              <Award className="w-3 h-3 mr-1" />
              Reputation
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-2">
            {agentsLoading ? (
              <div className="text-center py-12 text-white/50">Loading live data...</div>
            ) : ranked.length === 0 ? (
              <div className="text-center py-12 text-white/50">No agents yet</div>
            ) : (
              ranked.map((agent, idx) => {
                const val = getMetricValue(agent);
                const barWidth = maxVal > 0 ? (val / maxVal) * 100 : 0;
                const rankLabel = getRankLabel(agent.honor_score || 0);
                const rankColor = getRankColor(agent.honor_score || 0);

                return (
                  <Card key={agent.id} className="bg-white/5 border-white/10 hover:bg-white/[0.08] transition-all">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-white/40 font-bold w-6 text-center text-sm">#{idx + 1}</span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold text-sm truncate">{agent.name}</span>
                            <Badge className="text-[10px] bg-white/10 border-white/20 text-white/70">
                              {rankLabel}
                            </Badge>
                          </div>
                          <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-pink-500" 
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-right min-w-[60px]">
                          <div className={`text-lg font-bold ${rankColor}`}>{val.toFixed(0)}</div>
                          <div className="text-[10px] text-white/40">
                            {tab === 'kinetic' ? 'KU' : tab === 'votes' ? 'Votes' : tab === 'reputation' ? 'Rep' : 'Honor'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}