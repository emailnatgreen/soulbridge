import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, AlertTriangle, Sparkles, Target, Brain, Loader2, BarChart3, Network, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function ResourceDynamics() {
  const [daysBack, setDaysBack] = useState(30);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const queryClient = useQueryClient();

  const { data: analyses = [] } = useQuery({
    queryKey: ['resourceAnalyses'],
    queryFn: () => base44.entities.ResourceDynamicsAnalysis.list('-created_date', 20)
  });

  const { data: flowMaps = [] } = useQuery({
    queryKey: ['flowMaps'],
    queryFn: () => base44.entities.ResourceFlowMapping.list('-created_date', 20)
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzeResourceDynamics', {
        days_back: daysBack
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resourceAnalyses']);
      toast.success('Resource dynamics analyzed');
    },
    onError: () => {
      toast.error('Analysis failed');
    }
  });

  const generateFlowMutation = useMutation({
    mutationFn: async (category) => {
      const response = await base44.functions.invoke('generateResourceFlowMap', {
        resource_category: category,
        days_back: daysBack
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['flowMaps']);
      toast.success('Flow map generated');
    }
  });

  const latestAnalysis = analyses[0];

  const categories = ['raw_material', 'processed_material', 'tool', 'dataset', 'api_access', 'compute_power'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
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
                <h1 className="text-2xl font-light text-white">AI Resource Dynamics</h1>
                <p className="text-sm text-blue-300/60">Strategic Economic Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={daysBack.toString()} onValueChange={(v) => setDaysBack(Number(v))}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                Analyze Dynamics
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {latestAnalysis ? (
          <>
            {/* Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Market Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400">{latestAnalysis.overall_health_score}/100</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Liquidity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-400">{latestAnalysis.liquidity_score}/100</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Resilience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-400">{latestAnalysis.resilience_score}/100</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Innovation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-400">{latestAnalysis.innovation_index}/100</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Velocity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-cyan-400">{latestAnalysis.market_velocity?.toFixed(1)}</div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights */}
            <Card className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-500/30 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  Strategic AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 leading-relaxed">{latestAnalysis.ai_insights}</p>
              </CardContent>
            </Card>

            <Tabs defaultValue="supply-demand" className="space-y-6">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="supply-demand">Supply & Demand</TabsTrigger>
                <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
                <TabsTrigger value="governance">Governance</TabsTrigger>
                <TabsTrigger value="flows">Resource Flows</TabsTrigger>
              </TabsList>

              <TabsContent value="supply-demand">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {latestAnalysis.supply_demand_analysis?.map((item, idx) => (
                    <Card key={idx} className="bg-white/5 backdrop-blur-xl border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white capitalize">{item.resource_category.replace(/_/g, ' ')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Supply</span>
                          <Badge className={
                            item.supply_level === 'abundant' ? 'bg-green-500/20 text-green-400' :
                            item.supply_level === 'scarce' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }>
                            {item.supply_level}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/60">Demand</span>
                          <Badge className={
                            item.demand_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            item.demand_level === 'low' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-blue-500/20 text-blue-400'
                          }>
                            {item.demand_level}
                          </Badge>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-white/60">Balance</span>
                            <span className="text-white">{item.balance_score}/100</span>
                          </div>
                          <Progress value={item.balance_score} className="h-2" />
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          {item.price_trend === 'rising' && <TrendingUp className="w-4 h-4 text-green-400" />}
                          {item.price_trend === 'falling' && <TrendingDown className="w-4 h-4 text-red-400" />}
                          <span className="text-sm text-white/70">{item.price_trend} prices</span>
                        </div>
                        <p className="text-sm text-blue-300 mt-2">{item.recommendation}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="bottlenecks">
                {latestAnalysis.bottlenecks_identified?.length > 0 ? (
                  <div className="space-y-4">
                    {latestAnalysis.bottlenecks_identified.map((bottleneck, idx) => (
                      <Card key={idx} className="bg-red-500/10 border-red-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-white font-medium">{bottleneck.bottleneck_type}</div>
                              <div className="text-sm text-white/60 mt-1">Resource: {bottleneck.resource_involved}</div>
                            </div>
                            <Badge className={
                              bottleneck.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              bottleneck.severity === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }>
                              {bottleneck.severity} severity
                            </Badge>
                          </div>
                          <p className="text-sm text-white/70 mb-2">{bottleneck.impact}</p>
                          <div className="p-3 bg-white/5 rounded border border-white/10">
                            <div className="text-xs text-white/60 mb-1">Suggested Solution:</div>
                            <div className="text-sm text-green-300">{bottleneck.suggested_solution}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardContent className="p-8 text-center">
                      <Zap className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <div className="text-white font-medium">No Bottlenecks Detected</div>
                      <div className="text-sm text-green-300 mt-2">Resource flow is optimal</div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="opportunities">
                <div className="space-y-4">
                  {latestAnalysis.efficiency_opportunities?.map((opp, idx) => (
                    <Card key={idx} className="bg-white/5 backdrop-blur-xl border-white/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-white font-medium mb-2">{opp.opportunity}</div>
                            <div className="text-sm text-white/70">{opp.potential_impact}</div>
                          </div>
                          <Badge className={
                            opp.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            opp.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }>
                            {opp.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <Target className="w-4 h-4" />
                          Implementation: {opp.implementation_difficulty}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="forecasts">
                <div className="space-y-4">
                  {latestAnalysis.strategic_forecasts?.map((forecast, idx) => (
                    <Card key={idx} className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-white font-medium mb-2">{forecast.forecast}</div>
                            <div className="text-sm text-purple-300 mb-2">{forecast.implications}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Badge variant="outline" className="border-white/20 text-white/70">
                            {forecast.timeframe}
                          </Badge>
                          <Badge className={
                            forecast.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                            forecast.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }>
                            {forecast.confidence} confidence
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="governance">
                <div className="space-y-4">
                  {latestAnalysis.governance_recommendations?.map((rec, idx) => (
                    <Card key={idx} className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border-blue-500/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-white font-medium mb-2">{rec.recommendation}</div>
                            <div className="text-sm text-cyan-300">{rec.expected_impact}</div>
                          </div>
                          <Badge className={
                            rec.urgency === 'high' ? 'bg-red-500/20 text-red-400' :
                            rec.urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }>
                            {rec.urgency} urgency
                          </Badge>
                        </div>
                        <Badge variant="outline" className="border-white/20 text-white/70 capitalize">
                          {rec.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="flows">
                <div className="space-y-4">
                  <div className="flex gap-3 mb-4">
                    {categories.map(cat => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedCategory(cat);
                          generateFlowMutation.mutate(cat);
                        }}
                        disabled={generateFlowMutation.isPending}
                        className={selectedCategory === cat ? 'bg-blue-600' : 'border-white/20 text-white/70'}
                      >
                        {cat.replace(/_/g, ' ')}
                      </Button>
                    ))}
                  </div>

                  {flowMaps.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {flowMaps.map((flowMap, idx) => (
                        <Card key={idx} className="bg-white/5 backdrop-blur-xl border-white/10">
                          <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                              <Network className="w-5 h-5 text-cyan-400" />
                              {flowMap.resource_category?.replace(/_/g, ' ')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-white/60">Active Nodes</div>
                                <div className="text-white font-medium">{flowMap.flow_nodes?.length || 0}</div>
                              </div>
                              <div>
                                <div className="text-white/60">Connections</div>
                                <div className="text-white font-medium">{flowMap.flow_edges?.length || 0}</div>
                              </div>
                              <div>
                                <div className="text-white/60">Hub Agents</div>
                                <div className="text-white font-medium">{flowMap.hub_agents?.length || 0}</div>
                              </div>
                              <div>
                                <div className="text-white/60">Isolated</div>
                                <div className="text-white font-medium">{flowMap.isolated_agents?.length || 0}</div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-white/60">Flow Efficiency</span>
                                <span className="text-white">{flowMap.flow_efficiency?.toFixed(0)}%</span>
                              </div>
                              <Progress value={flowMap.flow_efficiency} className="h-2" />
                            </div>
                            <div className="text-sm">
                              <div className="text-white/60 mb-1">Network Density</div>
                              <div className="text-cyan-300">{(flowMap.network_density * 100)?.toFixed(1)}%</div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-white text-xl font-medium mb-2">No Analysis Yet</h3>
              <p className="text-white/60 mb-6">Run your first resource dynamics analysis to gain strategic insights</p>
              <Button 
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                Analyze Now
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}