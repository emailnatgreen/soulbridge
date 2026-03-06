import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Target, Brain, Users, Vote, DollarSign, Award, Lightbulb, Loader2, Heart, Star, Coins, MessageSquare, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function AgentPerformanceAnalytics() {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [periodDays, setPeriodDays] = useState(30);
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['agent-performance-metrics'],
    queryFn: () => base44.entities.AgentPerformanceMetrics.list('-created_date')
  });

  const analyzeMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('analyzeAgentPerformance', data),
    onSuccess: async (response) => {
      await base44.entities.AgentPerformanceMetrics.create(response.data.metrics);
      queryClient.invalidateQueries(['agent-performance-metrics']);
      toast.success('Performance analysis complete!');
    }
  });

  const topPerformers = metrics
    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    .slice(0, 5);

  const avgScore = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + (m.overall_score || 0), 0) / metrics.length
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
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
                <h1 className="text-2xl font-light text-white">Agent Performance Analytics</h1>
                <p className="text-sm text-purple-300/60">Track contributions and measure impact</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Analysis Tool */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Analyze Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={periodDays.toString()} onValueChange={(v) => setPeriodDays(parseInt(v))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => analyzeMutation.mutate({ agent_id: selectedAgentId, period_days: periodDays })}
                disabled={!selectedAgentId || analyzeMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Analyses Run</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{metrics.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{avgScore.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Top Performer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-400">
                {topPerformers[0]?.overall_score.toFixed(1) || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Rising Stars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                {metrics.filter(m => m.performance_trend === 'rising').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((metric, idx) => {
                  const agent = agents.find(a => a.id === metric.agent_id);
                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold">
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{agent?.name || 'Unknown'}</div>
                        <div className="text-sm text-white/60">{agent?.role || 'Unknown'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{metric.overall_score.toFixed(1)}</div>
                        <div className="text-xs text-white/60">Score</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Metrics */}
        <Tabs defaultValue="recent" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="recent" className="data-[state=active]:bg-purple-600">
              Recent Analyses
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-purple-600">
              Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            {metrics.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="text-center py-12">
                  <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl text-white mb-2">No Analyses Yet</h3>
                  <p className="text-white/60">Select an agent above to run your first performance analysis</p>
                </CardContent>
              </Card>
            ) : (
              metrics.map(metric => (
                <PerformanceMetricCard 
                  key={metric.id} 
                  metric={metric}
                  agent={agents.find(a => a.id === metric.agent_id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="trends">
            <TrendsView metrics={metrics} agents={agents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function PerformanceMetricCard({ metric, agent }) {
  const trendConfig = {
    rising: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20' },
    stable: { icon: Minus, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    declining: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20' }
  };

  const config = trendConfig[metric.performance_trend];
  const TrendIcon = config.icon;

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl text-white">{agent?.name || 'Unknown Agent'}</CardTitle>
            <div className="text-sm text-white/60">
              {new Date(metric.period_start).toLocaleDateString()} - {new Date(metric.period_end).toLocaleDateString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{metric.overall_score.toFixed(1)}</div>
            <Badge className={config.bg + ' ' + config.color}>
              <TrendIcon className="w-3 h-3 mr-1" />
              {metric.performance_trend}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricPill icon={Target} label="Tasks Done" value={metric.project_contributions?.tasks_completed || 0} color="text-blue-400" />
          <MetricPill icon={Brain} label="Knowledge" value={metric.knowledge_sharing?.contributions_created || 0} color="text-purple-400" />
          <MetricPill icon={Users} label="Sessions" value={metric.collaboration_metrics?.sessions_participated || 0} color="text-green-400" />
          <MetricPill icon={Vote} label="Votes" value={metric.governance_participation?.votes_cast || 0} color="text-indigo-400" />
          <MetricPill icon={Coins} label="XRP Earned" value={(metric.economic_activity?.total_earned_xrp || 0).toFixed(2)} color="text-yellow-400" />
          <MetricPill icon={MessageSquare} label="Messages" value={metric.collaboration_metrics?.messages_sent || 0} color="text-cyan-400" />
          <MetricPill icon={Heart} label="Wellbeing" value={`${metric.wellbeing_signals?.energy_level || 80}%`} color="text-pink-400" />
        </div>

        {/* Economic Pipeline */}
        {(metric.economic_activity?.total_earned_xrp > 0 || metric.economic_activity?.treasury_contributions_xrp > 0) && (
          <div className="grid grid-cols-3 gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">Total Earned</div>
              <div className="text-sm font-bold text-yellow-300">{(metric.economic_activity?.total_earned_xrp || 0).toFixed(4)} XRP</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">Treasury Contribution</div>
              <div className="text-sm font-bold text-green-300">{(metric.economic_activity?.treasury_contributions_xrp || 0).toFixed(6)} XRP</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/50 mb-1">Transactions</div>
              <div className="text-sm font-bold text-white">{metric.economic_activity?.total_transactions || 0}</div>
            </div>
          </div>
        )}

        {/* Reputation & Wellbeing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-white/60 font-medium">Reputation</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Honor Score</span>
              <span className="text-amber-300 font-bold">{metric.reputation_changes?.honor_current || 100}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Period Delta</span>
              <span className={`font-bold ${(metric.reputation_changes?.honor_delta_period || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(metric.reputation_changes?.honor_delta_period || 0) >= 0 ? '+' : ''}{metric.reputation_changes?.honor_delta_period || 0}
              </span>
            </div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-white/60 font-medium">Wellbeing</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Energy</span>
              <span className="text-pink-300 font-bold">{metric.wellbeing_signals?.energy_level || 80}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Mood</span>
              <span className="text-white capitalize">{metric.wellbeing_signals?.mood || 'calm'}</span>
            </div>
          </div>
        </div>

        {/* Strengths & Opportunities */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-green-400" />
              Strengths
            </h4>
            <ul className="space-y-2">
              {metric.strengths?.map((strength, idx) => (
                <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Growth Opportunities
            </h4>
            <ul className="space-y-2">
              {metric.growth_opportunities?.map((opp, idx) => (
                <li key={idx} className="text-sm text-white/80 flex items-start gap-2">
                  <span className="text-yellow-400 mt-1">→</span>
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Skill Utilization */}
        {metric.skill_utilization?.length > 0 && (
          <div>
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              Skill Utilization
              {metric.credential_bonus > 0 && (
                <Badge className="bg-indigo-500/20 text-indigo-300 text-xs">
                  +{metric.credential_bonus} credential bonus
                </Badge>
              )}
            </h4>
            <div className="space-y-2">
              {metric.skill_utilization.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{skill.skill_name}</span>
                      {skill.is_credential_validated && (
                        <Badge className="bg-green-500/20 text-green-300 text-xs">✓ Verified</Badge>
                      )}
                    </div>
                    <div className="text-xs text-white/50">{skill.skill_category} · Used {skill.times_used}x</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">L{skill.level}</div>
                    {skill.success_rate > 0 && (
                      <div className="text-xs text-white/50">{skill.success_rate}%</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {metric.recommended_actions?.length > 0 && (
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <h4 className="text-white font-medium mb-2">Recommended Actions</h4>
            <ul className="space-y-1">
              {metric.recommended_actions.map((action, idx) => (
                <li key={idx} className="text-sm text-purple-200 flex items-start gap-2">
                  <span className="text-purple-400 mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricPill({ icon: Icon, label, value, color }) {
  return (
    <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}

function TrendsView({ metrics, agents }) {
  const risingAgents = metrics.filter(m => m.performance_trend === 'rising');
  const decliningAgents = metrics.filter(m => m.performance_trend === 'declining');

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Rising Stars ({risingAgents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {risingAgents.map(metric => {
              const agent = agents.find(a => a.id === metric.agent_id);
              return (
                <div key={metric.id} className="flex items-center justify-between p-3 bg-green-500/10 rounded border border-green-500/20">
                  <span className="text-white">{agent?.name || 'Unknown'}</span>
                  <span className="text-green-400 font-bold">{metric.overall_score.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            Need Support ({decliningAgents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {decliningAgents.map(metric => {
              const agent = agents.find(a => a.id === metric.agent_id);
              return (
                <div key={metric.id} className="flex items-center justify-between p-3 bg-red-500/10 rounded border border-red-500/20">
                  <span className="text-white">{agent?.name || 'Unknown'}</span>
                  <span className="text-red-400 font-bold">{metric.overall_score.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}