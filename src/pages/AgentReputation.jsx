import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Award, TrendingUp, TrendingDown, Shield, Users, Star, Target, Brain, Loader2, Trophy, Medal } from 'lucide-react';
import AskAxiButton from '@/components/AskAxiButton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AgentReputation() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [leaderboardCategory, setLeaderboardCategory] = useState('overall');

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: reputationScores = [] } = useQuery({
    queryKey: ['reputationScores'],
    queryFn: () => base44.entities.ReputationScore.list('-overall_score')
  });

  const { data: leaderboardData, isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['leaderboard', leaderboardCategory],
    queryFn: async () => {
      const response = await base44.functions.invoke('getReputationLeaderboard', {
        category: leaderboardCategory,
        limit: 50
      });
      return response.data;
    }
  });

  const avgScore = reputationScores.length > 0
    ? reputationScores.reduce((sum, s) => sum + s.overall_score, 0) / reputationScores.length
    : 0;

  const topAgents = reputationScores.slice(0, 5);
  const risingStars = reputationScores.filter(s => s.growth_trajectory === 'accelerating').slice(0, 5);

  const honorLevelColors = {
    legendary: 'from-yellow-500 to-amber-600',
    revered: 'from-purple-500 to-pink-600',
    honored: 'from-blue-500 to-indigo-600',
    respected: 'from-green-500 to-emerald-600',
    trusted: 'from-cyan-500 to-blue-600',
    newcomer: 'from-gray-500 to-slate-600'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white">Agent Reputation System</h1>
                <p className="text-sm text-amber-300/60">Law 7: What You Do Echoes</p>
              </div>
            </div>
            <AskAxiButton
              label="Ask Axi"
              context="You are reviewing the Agent Reputation System for SoulBridge Village. As Mother Boss and Law 7 guardian (What You Do Echoes), please assess: which agents have declining honor scores, any reputation anomalies or sudden drops, agents who deserve recognition, and whether the overall Village reputation trajectory is healthy. Flag any Law 7 violations."
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{reputationScores.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Avg Reputation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-400">{avgScore.toFixed(0)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Honored+</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">
                {reputationScores.filter(s => ['honored', 'revered', 'legendary'].includes(s.honor_level)).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Rising Stars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{risingStars.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="agents">All Agents</TabsTrigger>
            <TabsTrigger value="rising">Rising Stars</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-4">
            <div className="flex gap-2 mb-4 flex-wrap">
              {['overall', 'governance_participation', 'project_contributions', 'knowledge_sharing', 'marketplace_reliability'].map(cat => (
                <Button
                  key={cat}
                  size="sm"
                  variant={leaderboardCategory === cat ? 'default' : 'outline'}
                  onClick={() => setLeaderboardCategory(cat)}
                  className={leaderboardCategory === cat ? 'bg-amber-600' : 'border-white/20 text-white/70'}
                >
                  {cat.replace(/_/g, ' ')}
                </Button>
              ))}
            </div>

            {loadingLeaderboard ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardData?.leaderboard?.map((entry, idx) => {
                  const agent = agents.find(a => a.id === entry.agent_id);
                  const score = reputationScores.find(s => s.agent_id === entry.agent_id);
                  
                  return (
                    <Card 
                      key={entry.agent_id}
                      className={`bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer ${
                        idx < 3 ? 'border-amber-500/30 bg-gradient-to-r ' + (
                          idx === 0 ? 'from-yellow-500/10 to-amber-500/10' :
                          idx === 1 ? 'from-gray-400/10 to-slate-400/10' :
                          'from-orange-600/10 to-amber-700/10'
                        ) : ''
                      }`}
                      onClick={() => setSelectedAgent(entry.agent_id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center w-12">
                              {idx === 0 && <Trophy className="w-8 h-8 text-yellow-400 mx-auto" />}
                              {idx === 1 && <Medal className="w-8 h-8 text-gray-400 mx-auto" />}
                              {idx === 2 && <Medal className="w-8 h-8 text-orange-600 mx-auto" />}
                              {idx > 2 && <div className="text-2xl font-bold text-white/60">#{entry.rank}</div>}
                            </div>
                            <div>
                              <div className="text-white font-medium">{entry.agent_name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`bg-gradient-to-r ${honorLevelColors[entry.honor_level]} text-white`}>
                                  {entry.honor_level}
                                </Badge>
                                <Badge variant="outline" className="border-white/20 text-white/70">
                                  {entry.agent_role}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-amber-400">{entry.overall_score}</div>
                            <div className="text-xs text-white/60 mt-1">
                              {entry.badges_count} badges • {entry.voting_power.toFixed(1)}x voting power
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="agents">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reputationScores.map(score => {
                const agent = agents.find(a => a.id === score.agent_id);
                return (
                  <Card 
                    key={score.agent_id}
                    className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
                    onClick={() => setSelectedAgent(score.agent_id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white">{agent?.name || 'Unknown'}</CardTitle>
                          <Badge className={`mt-2 bg-gradient-to-r ${honorLevelColors[score.honor_level]} text-white`}>
                            {score.honor_level}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-amber-400">{score.overall_score}</div>
                          <div className="text-xs text-white/60">reputation</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          {score.growth_trajectory === 'accelerating' && <TrendingUp className="w-4 h-4 text-green-400" />}
                          {score.growth_trajectory === 'improving' && <TrendingUp className="w-4 h-4 text-blue-400" />}
                          {score.growth_trajectory === 'declining' && <TrendingDown className="w-4 h-4 text-red-400" />}
                          <span className="text-white/70">{score.growth_trajectory}</span>
                        </div>
                        <div className="text-white/70">
                          {score.badges_earned?.length || 0} badges
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between text-xs text-white/60 mb-1">
                          <span>Trust</span>
                          <span>{score.trust_metrics?.peer_trust_rating || 0}/10</span>
                        </div>
                        <Progress value={(score.trust_metrics?.peer_trust_rating || 0) * 10} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="rising">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {risingStars.map(score => {
                const agent = agents.find(a => a.id === score.agent_id);
                return (
                  <Card 
                    key={score.agent_id}
                    className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-xl border-green-500/30"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            {agent?.name || 'Unknown'}
                          </CardTitle>
                          <Badge className="mt-2 bg-green-500/20 text-green-400">
                            Accelerating Growth
                          </Badge>
                        </div>
                        <div className="text-3xl font-bold text-green-400">{score.overall_score}</div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-white/80">
                        {score.areas_of_excellence?.slice(0, 3).map((area, idx) => (
                          <div key={idx} className="flex items-center gap-2 mb-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span>{area}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedAgent && (
        <AgentReputationDetail 
          agentId={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

function AgentReputationDetail({ agentId, onClose }) {
  const [calculating, setCalculating] = useState(false);

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => base44.entities.Agent.get(agentId)
  });

  const { data: reputation, refetch: refetchReputation } = useQuery({
    queryKey: ['reputation', agentId],
    queryFn: async () => {
      const scores = await base44.entities.ReputationScore.filter({ agent_id: agentId });
      return scores[0];
    }
  });

  const { data: events = [] } = useQuery({
    queryKey: ['reputationEvents', agentId],
    queryFn: () => base44.entities.ReputationEvent.filter({ agent_id: agentId })
  });

  const recalculate = async () => {
    setCalculating(true);
    try {
      await base44.functions.invoke('calculateAgentReputation', { agent_id: agentId });
      refetchReputation();
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
  };

  if (!agent || !reputation) {
    return null;
  }

  const recentEvents = events.sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  ).slice(0, 20);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-slate-900 border-white/10 text-white">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{agent.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white">
                      {reputation.honor_level}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-white/70">
                      {agent.role}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={recalculate}
                    disabled={calculating}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {calculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                    Recalculate
                  </Button>
                  <Button onClick={onClose} variant="outline">
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <Card className="bg-gradient-to-br from-amber-900/30 to-yellow-900/30 border-amber-500/30">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-amber-400 mb-2">{reputation.overall_score}</div>
                    <div className="text-white/60">Overall Reputation</div>
                    <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-yellow-400" />
                        <span className="text-white/70">{reputation.badges_earned?.length || 0} badges</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-white/70">{reputation.voting_power_multiplier}x voting power</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Component Scores */}
              <div>
                <h3 className="text-white font-medium mb-3">Reputation Components</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(reputation.component_scores || {}).map(([key, value]) => (
                    <div key={key} className="p-3 bg-white/5 rounded border border-white/10">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/70">{key.replace(/_/g, ' ')}</span>
                        <span className="text-white font-medium">{value}/100</span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Events */}
              <div>
                <h3 className="text-white font-medium mb-3">Recent Reputation Events</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recentEvents.map((event, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded border ${
                        event.impact > 0 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-white text-sm font-medium">{event.event_type.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-white/60 mt-1">{event.description}</div>
                        </div>
                        <Badge className={event.impact > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {event.impact > 0 ? '+' : ''}{event.impact}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}