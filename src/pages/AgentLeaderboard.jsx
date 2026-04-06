import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Shield, Zap, TrendingUp, Crown, Medal, Award, ArrowLeft, Fingerprint } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';

const RANK_CONFIG = [
  { min: 90, label: 'Legendary', color: 'text-yellow-300', bg: 'bg-yellow-500/20 border-yellow-400/30', icon: Crown },
  { min: 75, label: 'Elite', color: 'text-purple-300', bg: 'bg-purple-500/20 border-purple-400/30', icon: Star },
  { min: 60, label: 'Honored', color: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-400/30', icon: Shield },
  { min: 40, label: 'Rising', color: 'text-green-300', bg: 'bg-green-500/20 border-green-400/30', icon: TrendingUp },
  { min: 0,  label: 'Citizen', color: 'text-white/60', bg: 'bg-white/10 border-white/20', icon: Zap },
];

function getRankConfig(score) {
  return RANK_CONFIG.find(r => score >= r.min) || RANK_CONFIG[RANK_CONFIG.length - 1];
}

const PLACE_ICONS = [
  <Crown className="w-6 h-6 text-yellow-400" />,
  <Medal className="w-6 h-6 text-slate-300" />,
  <Award className="w-6 h-6 text-amber-600" />,
];

export default function AgentLeaderboard() {
  const [tab, setTab] = useState('honor');
  const [currentDID, setCurrentDID] = useState(null);

  useEffect(() => {
    const checkDID = async () => {
      try {
        const identity = localStorage.getItem('soulbridge_identity');
        if (identity) setCurrentDID(JSON.parse(identity));
      } catch (e) { /* ignore */ }
    };
    checkDID();
  }, []);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['leaderboard-agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['leaderboard-tasks'],
    queryFn: () => base44.entities.ProjectTask.filter({ status: 'completed' }),
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['leaderboard-votes'],
    queryFn: () => base44.entities.GovernanceVote.list(),
  });

  const { data: reputationEvents = [] } = useQuery({
    queryKey: ['leaderboard-rep-events'],
    queryFn: () => base44.entities.ReputationEvent.list(),
  });

  // Enrich agents with computed metrics
  const enriched = agents.map(agent => {
    const completedTasks = tasks.filter(t => t.assigned_agent_id === agent.id).length;
    const castVotes = votes.filter(v => v.voter_agent_id === agent.id).length;
    const totalImpact = reputationEvents
      .filter(e => e.agent_id === agent.id)
      .reduce((sum, e) => sum + (e.impact || 0), 0);
    return { ...agent, completedTasks, castVotes, totalImpact };
  });

  const byHonor = [...enriched].sort((a, b) => (b.honor_score || 0) - (a.honor_score || 0));
  const byTasks = [...enriched].sort((a, b) => b.completedTasks - a.completedTasks);
  const byVotes = [...enriched].sort((a, b) => b.castVotes - a.castVotes);

  const lists = { honor: byHonor, tasks: byTasks, votes: byVotes };
  const ranked = lists[tab] || byHonor;
  const maxVal = { honor: 100, tasks: byTasks[0]?.completedTasks || 1, votes: byVotes[0]?.castVotes || 1 };
  const getVal = (agent) => ({
    honor: agent.honor_score || 0,
    tasks: agent.completedTasks,
    votes: agent.castVotes,
  }[tab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Link to="/Agents" className="inline-flex items-center text-purple-300/80 hover:text-purple-200 transition-colors mb-3 sm:mb-4 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 gap-y-2">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-bold text-white">Leaderboard</h1>
              <p className="text-xs sm:text-sm text-white/50">Recognition & rankings</p>
            </div>
            {currentDID && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] sm:text-xs truncate flex-shrink-0">
                <Fingerprint className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Top 3 Podium */}
        {!isLoading && byHonor.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
            {[byHonor[1], byHonor[0], byHonor[2]].map((agent, podiumIdx) => {
              const place = podiumIdx === 1 ? 0 : podiumIdx === 0 ? 1 : 2;
              const rank = getRankConfig(agent?.honor_score || 0);
              const heights = ['h-28', 'h-36', 'h-24'];
              return (
                <div key={agent?.id} className={`flex flex-col items-center justify-end ${heights[podiumIdx]}`}>
                  <div className={`w-full rounded-t-xl border ${rank.bg} p-3 text-center`}>
                    <div className="flex justify-center mb-1">{PLACE_ICONS[place]}</div>
                    <p className="text-white font-bold truncate">{agent?.name}</p>
                    <p className={`text-sm font-bold ${rank.color}`}>{agent?.honor_score ?? 0}</p>
                    <Badge className={`mt-1 text-xs ${rank.bg}`}>{rank.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-white/10 flex-wrap h-auto gap-1 p-1 w-full">
            <TabsTrigger value="honor" className="text-xs sm:text-sm"><Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Honor Score</span><span className="sm:hidden">Honor</span></TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs sm:text-sm"><Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Tasks</span><span className="sm:hidden">Work</span></TabsTrigger>
            <TabsTrigger value="votes" className="text-xs sm:text-sm"><Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Votes</span><span className="sm:hidden">Gov</span></TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            {isLoading ? (
              <div className="text-center py-12 text-white/50">Loading agents...</div>
            ) : (
              <div className="space-y-2">
                {ranked.map((agent, idx) => {
                  const rank = getRankConfig(agent.honor_score || 0);
                  const RankIcon = rank.icon;
                  const val = getVal(agent);
                  const max = maxVal[tab];
                  return (
                    <Card key={agent.id} className={`bg-white/5 border-white/10 hover:bg-white/[0.08] transition-all ${idx < 3 ? 'ring-1 ring-yellow-400/20' : ''}`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-2 sm:gap-4">
                           <span className="text-white/40 font-bold w-5 sm:w-6 text-center text-xs sm:text-sm">#{idx + 1}</span>
                          {idx < 3 && PLACE_ICONS[idx]}
                          <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1 flex-wrap">
                            <span className="text-white font-semibold text-xs sm:text-sm truncate">{agent.name}</span>
                            <Badge className={`text-[10px] sm:text-xs ${rank.bg}`}>
                              <RankIcon className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />{rank.label}
                            </Badge>
                          </div>
                          <Progress value={(val / max) * 100} className="h-1 sm:h-1.5" />
                          </div>
                          <span className={`text-lg sm:text-xl font-bold ${rank.color} min-w-[2rem] sm:min-w-[3rem] text-right text-sm sm:text-base`}>{val}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}