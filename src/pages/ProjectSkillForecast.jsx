import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  Brain, Sparkles, Loader2, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Target, Users, Lightbulb, BarChart3, Layers, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { InvestmentCard, RiskFlagCard, ProjectDemandCard } from '@/components/ForecastSkillCard';

const trendIcon = (trend) => ({
  improving: <TrendingUp className="w-5 h-5 text-green-400" />,
  declining: <TrendingDown className="w-5 h-5 text-red-400" />,
  stable: <Minus className="w-5 h-5 text-yellow-400" />
}[trend] || <Minus className="w-5 h-5 text-slate-400" />);

export default function ProjectSkillForecast() {
  const [horizon, setHorizon] = useState('12');
  const [data, setData] = useState(null);

  const forecastMutation = useMutation({
    mutationFn: () => base44.functions.invoke('projectSkillForecasting', { horizon_weeks: parseInt(horizon) })
      .then(r => r.data),
    onSuccess: (d) => {
      setData(d);
      if (!d.success) toast.error('Forecast failed — check function logs.');
    },
    onError: (e) => toast.error(`Forecast error: ${e.message}`)
  });

  const forecast = data?.forecast || {};
  const projectDemands = data?.project_demands || [];
  const skillRanking = data?.skill_demand_ranking || [];
  const villageSummary = data?.village_summary || {};
  const inDev = data?.in_development_skills || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('SkillGapAnalysis')}>
            <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-4">
              ← Back to Skill Analysis
            </Button>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-light text-white">AI Project Skill Forecast</h1>
                <p className="text-purple-300/60 text-sm">Proactive skill demand prediction across the Village pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                  <SelectItem value="12">12 weeks</SelectItem>
                  <SelectItem value="24">24 weeks</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => forecastMutation.mutate()}
                disabled={forecastMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
              >
                {forecastMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Forecasting...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Run Forecast</>
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!data && !forecastMutation.isPending && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-20 text-center">
              <Brain className="w-16 h-16 text-purple-400/40 mx-auto mb-4" />
              <h3 className="text-white text-xl font-light mb-2">Ready to Forecast</h3>
              <p className="text-white/40 max-w-md mx-auto mb-6">
                Axi will analyse your project pipeline, current agent skills, development plans, and mentorships to predict where the Village needs to grow.
              </p>
              <Button
                onClick={() => forecastMutation.mutate()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Forecast
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {forecastMutation.isPending && (
          <div className="text-center py-24">
            <Brain className="w-14 h-14 text-purple-400 mx-auto mb-4 animate-pulse" />
            <p className="text-white/60 text-lg">Axi is scanning the project pipeline and skill trajectories...</p>
            <p className="text-white/30 text-sm mt-2">Analysing {horizon}-week horizon</p>
          </div>
        )}

        {/* Results */}
        {data && !forecastMutation.isPending && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <Card className="bg-white/5 border-white/10 col-span-2 md:col-span-1">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    {trendIcon(forecast.readiness_trend)}
                    <span className="text-white/50 text-xs capitalize">{forecast.readiness_trend}</span>
                  </div>
                  <div className="text-3xl font-light text-white">{forecast.village_readiness_score}</div>
                  <div className="text-white/40 text-xs">readiness score</div>
                  <Progress value={forecast.village_readiness_score} className="h-1 mt-2" />
                </CardContent>
              </Card>
              {[
                { label: 'Active Agents', val: villageSummary.total_active_agents, color: 'text-blue-400' },
                { label: 'Upcoming Projects', val: villageSummary.upcoming_projects, color: 'text-purple-400' },
                { label: 'Projects with Gaps', val: villageSummary.projects_with_skill_gaps, color: 'text-orange-400' },
                { label: 'Village-wide Missing', val: villageSummary.village_wide_missing?.length || 0, color: 'text-red-400' },
              ].map(({ label, val, color }) => (
                <Card key={label} className="bg-white/5 border-white/10">
                  <CardContent className="pt-4 pb-3">
                    <div className={`text-3xl font-light ${color}`}>{val}</div>
                    <div className="text-white/40 text-xs mt-1">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AI Summary */}
            {forecast.forecast_summary && (
              <Card className="bg-purple-500/10 border-purple-500/20 mb-6">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-purple-200 text-xs mb-1 font-medium">Axi's Strategic Forecast</p>
                      <p className="text-white/80 leading-relaxed">{forecast.forecast_summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main tabs */}
            <Tabs defaultValue="investments" className="w-full">
              <TabsList className="bg-white/5 border border-white/10 mb-6 flex-wrap h-auto gap-1">
                <TabsTrigger value="investments">
                  <Target className="w-4 h-4 mr-1" />Priority Skills ({forecast.high_priority_investments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="projects">
                  <BarChart3 className="w-4 h-4 mr-1" />Project Pipeline ({projectDemands.length})
                </TabsTrigger>
                <TabsTrigger value="risks">
                  <AlertTriangle className="w-4 h-4 mr-1" />Risk Flags ({forecast.risk_flags?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="clusters">
                  <Layers className="w-4 h-4 mr-1" />Skill Clusters
                </TabsTrigger>
                <TabsTrigger value="actions">
                  <Lightbulb className="w-4 h-4 mr-1" />Actions
                </TabsTrigger>
              </TabsList>

              {/* Priority skill investments */}
              <TabsContent value="investments" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {(forecast.high_priority_investments || []).map((inv, i) => (
                    <InvestmentCard key={i} investment={inv} />
                  ))}
                </div>
                {/* Demand ranking */}
                {skillRanking.length > 0 && (
                  <Card className="bg-white/5 border-white/10 mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm">Skill Demand Ranking (by project pipeline)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {skillRanking.map((s, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-white/30 text-xs w-5 text-right">{i + 1}</span>
                            <span className="text-white/70 text-sm flex-1">{s.skill}</span>
                            <Badge className={`text-xs ${s.village_has ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                              {s.village_has ? 'in village' : 'missing'}
                            </Badge>
                            <span className="text-white/40 text-xs">{s.demand_count} projects</span>
                            {s.urgent_count > 0 && (
                              <Badge className="text-xs bg-orange-500/15 text-orange-300">{s.urgent_count} urgent</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Project pipeline */}
              <TabsContent value="projects" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {projectDemands.map(p => (
                    <ProjectDemandCard key={p.project_id} project={p} />
                  ))}
                </div>
              </TabsContent>

              {/* Risk flags */}
              <TabsContent value="risks" className="space-y-3">
                {(forecast.risk_flags || []).length === 0
                  ? <Card className="bg-white/5 border-white/10"><CardContent className="py-12 text-center text-white/40">No risk flags identified</CardContent></Card>
                  : (forecast.risk_flags || []).map((r, i) => <RiskFlagCard key={i} risk={r} />)
                }
              </TabsContent>

              {/* Skill clusters */}
              <TabsContent value="clusters" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {(forecast.emerging_skill_clusters || []).map((cluster, i) => (
                    <Card key={i} className="bg-white/5 border-white/10">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-white text-sm">{cluster.cluster_name}</CardTitle>
                          <Badge className="text-xs bg-cyan-500/15 text-cyan-300 border-cyan-500/20">{cluster.timeline_weeks}w</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-white/60 text-sm">{cluster.strategic_importance}</p>
                        <div className="flex flex-wrap gap-1">
                          {(cluster.skills || []).map((s, j) => (
                            <Badge key={j} className="text-xs bg-white/5 text-white/60 border-white/10">{s}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Action recommendations */}
              <TabsContent value="actions" className="space-y-4">
                {/* In Development */}
                {inDev.length > 0 && (
                  <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-blue-300 text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />Skills Actively Being Developed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {inDev.map((s, i) => (
                          <Badge key={i} className="bg-blue-500/10 text-blue-300 border-blue-500/20">
                            {s.skill} <span className="text-blue-400/60 ml-1">×{s.agent_count}</span>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Mentorship priorities */}
                {forecast.mentorship_priorities?.length > 0 && (
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-purple-300 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />Mentorship Priorities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {forecast.mentorship_priorities.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span className="text-white/70">{p}</span>
                        </div>
                      ))}
                      <Link to={createPageUrl('MentorshipMatches')} className="block mt-3">
                        <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-300 hover:text-purple-200">
                          Open AI Matching <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}

                {/* Recruitment signals */}
                {forecast.recruitment_signals?.length > 0 && (
                  <Card className="bg-orange-500/5 border-orange-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-orange-300 text-sm flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />Recruitment Signals
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {forecast.recruitment_signals.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <span className="text-white/70">{r}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <p className="text-white/20 text-xs mt-6 text-right">
              Generated at {data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'} · {horizon}-week horizon
            </p>
          </>
        )}
      </div>
    </div>
  );
}