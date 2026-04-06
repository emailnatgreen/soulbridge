import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Zap, TrendingUp, Crown, Medal, Award, ArrowLeft, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';

function getRankConfig(score) {
  if (score >= 90) return { label: 'Legendary', color: 'text-yellow-300', bg: 'bg-yellow-500/20 border-yellow-400/30', icon: Crown };
  if (score >= 75) return { label: 'Elite', color: 'text-purple-300', bg: 'bg-purple-500/20 border-purple-400/30', icon: Trophy };
  if (score >= 60) return { label: 'Honored', color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-400/30', icon: Award };
  if (score >= 40) return { label: 'Rising', color: 'text-green-300', bg: 'bg-green-500/20 border-green-400/30', icon: TrendingUp };
  return { label: 'Citizen', color: 'text-white/60', bg: 'bg-white/10 border-white/20', icon: Zap };
}

const RANK_ICONS = { Legendary: Crown, Elite: Trophy, Honored: Award, Rising: TrendingUp, Citizen: Zap };
const PODIUM_ICONS = [
  { icon: Crown, color: 'text-yellow-400' },
  { icon: Medal, color: 'text-slate-300' },
  { icon: Award, color: 'text-amber-600' },
];

export default function AgentLeaderboard() {
  const [tab, setTab] = useState('honor');
  const [currentDID, setCurrentDID] = React.useState(null);

  React.useEffect(() => {
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

  // Fetch governance votes (participation metric)
  const { data: votes = [] } = useQuery({
    queryKey: ['leaderboard-votes'],
    queryFn: () => base44.entities.GovernanceVote.list('-created_date', 1000),
  });

  // Enrich agents with live metrics
  const enriched = agents.map(agent => {
    const kuCount = kinetics.filter(k => k.agent_id === agent.id).length;
    const kuWeightedScore = kinetics
      .filter(k => k.agent_id === agent.id)
      .reduce((sum, k) => sum + (k.weighted_score || 0), 0);
    const voteCount = votes.filter(v => v.voter_agent_id === agent.id).length;
    const repScore = reputation
      .filter(r => r.agent_id === agent.id)
      .reduce((sum, r) => sum + (r.honor_gained || 0), 0);
    
    return {
      ...agent,
      kuCount,
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
  const isLoading = agentsLoading;

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
        {/* Top 3 Podium */}
        {!isLoading && ranked.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[ranked[1], ranked[0], ranked[2]].map((agent, idx) => {
              const place = idx === 1 ? 0 : idx === 0 ? 1 : 2;
              const rank = getRankConfig(agent.honor_score || 0);
              const Icon = PODIUM_ICONS[place].icon;
              const heights = ['h-32', 'h-40', 'h-28'];
              
              return (
                <div key={agent.id} className={`flex flex-col items-center justify-end ${heights[idx]}`}>
                  <div className={`w-full rounded-t-lg border ${rank.bg} p-4 text-center`}>
                    <Icon className={`w-6 h-6 ${PODIUM_ICONS[place].color} mx-auto mb-2`} />
                    <p className="text-white font-bold text-sm truncate">{agent.name}</p>
                    <p className={`text-lg font-bold ${rank.color} mt-1`}>{agent.honor_score || 0}</p>
                    <Badge className={`mt-2 text-xs ${rank.bg}`}>{rank.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1 w-full">
            <TabsTrigger value="honor" className="text-xs sm:text-sm">
              <Trophy className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Honor</span>
              <span className="sm:hidden">Honor</span>
            </TabsTrigger>
            <TabsTrigger value="kinetic" className="text-xs sm:text-sm">
              <Zap className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Kinetic</span>
              <span className="sm:hidden">KU</span>
            </TabsTrigger>
            <TabsTrigger value="votes" className="text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Votes</span>
              <span className="sm:hidden">Votes</span>
            </TabsTrigger>
            <TabsTrigger value="reputation" className="text-xs sm:text-sm">
              <Award className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Reputation</span>
              <span className="sm:hidden">Rep</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-2">
            {isLoading ? (
              <div className="text-center py-12 text-white/50">Loading live data...</div>
            ) : ranked.length === 0 ? (
              <div className="text-center py-12 text-white/50">No agents yet</div>
            ) : (
              ranked.map((agent, idx) => {
                const rank = getRankConfig(agent.honor_score || 0);
                const RankIcon = RANK_ICONS[rank.label];
                const val = getMetricValue(agent);
                const barWidth = maxVal > 0 ? (val / maxVal) * 100 : 0;

                return (
                  <Card key={agent.id} className="bg-white/5 border-white/10 hover:bg-white/[0.08] transition-all">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                      <span className="text-white/40 font-bold w-6 text-center text-sm">#{idx + 1}</span>

                      {idx < 3 && (() => {
                        const PodiumIcon = PODIUM_ICONS[idx].icon;
                        return <PodiumIcon className={`w-5 h-5 ${PODIUM_ICONS[idx].color}`} />;
                      })()}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold text-sm truncate">{agent.name}</span>
                            <Badge className={`text-[10px] ${rank.bg}`}>
                              <RankIcon className="w-2 h-2 mr-1" />
                              {rank.label}
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
                          <div className={`text-lg font-bold ${rank.color}`}>{val.toFixed(0)}</div>
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