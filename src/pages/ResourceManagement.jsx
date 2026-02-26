import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Sparkles, DollarSign, Clock, Users, Target, Zap, CheckCircle2, XCircle, Activity, BarChart3, Lightbulb, ShieldAlert, Vote, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ResourceManagement() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-resource'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const currentAgent = agents.find(a => a.created_by === currentUser?.email);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('analyzeResourceAllocation', {
        analysis_scope: 'full'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast.success('Resource analysis complete! 📊');
    },
    onError: (error) => {
      toast.error('Analysis failed: ' + error.message);
    }
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await analyzeMutation.mutateAsync();
    } finally {
      setAnalyzing(false);
    }
  };

  const healthColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const severityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-200 border-red-400/30';
      case 'high': return 'bg-orange-500/20 text-orange-200 border-orange-400/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30';
      case 'low': return 'bg-blue-500/20 text-blue-200 border-blue-400/30';
      default: return 'bg-gray-500/20 text-gray-200 border-gray-400/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-emerald-400" />
              <div>
                <h1 className="text-4xl font-bold text-white">AI-Powered Resource Management</h1>
                <p className="text-emerald-200/70">Optimize allocation, track utilization, eliminate waste</p>
              </div>
            </div>
            <div className="flex gap-3">
              {analysisResult && (
                <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                      size="lg"
                    >
                      <Vote className="w-5 h-5 mr-2" />
                      Create Governance Proposal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Resource Allocation Proposal</DialogTitle>
                    </DialogHeader>
                    <ResourceAllocationProposalForm 
                      analysisResult={analysisResult}
                      currentAgent={currentAgent}
                      onClose={() => setProposalDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                size="lg"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Run AI Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {!analysisResult ? (
          <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
            <CardContent className="py-24 text-center">
              <BarChart3 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">Resource Intelligence Awaits</h2>
              <p className="text-emerald-200/60 mb-6 max-w-md mx-auto">
                Run an AI-powered analysis to gain deep insights into resource allocation, efficiency, and optimization opportunities across SoulBridge.
              </p>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                size="lg"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Resources...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Health Score Hero */}
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-400/30 backdrop-blur-xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-white text-lg font-medium mb-1">Overall Resource Health</h2>
                    <p className="text-emerald-200/60 text-sm">
                      {analysisResult.ai_analysis.resource_efficiency_rating.toUpperCase()} • {analysisResult.ai_analysis.sustainability_forecast}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-6xl font-bold ${healthColor(analysisResult.ai_analysis.overall_health_score)}`}>
                      {analysisResult.ai_analysis.overall_health_score}
                    </div>
                    <p className="text-white/60 text-sm mt-1">Health Score</p>
                  </div>
                </div>
                <Progress 
                  value={analysisResult.ai_analysis.overall_health_score} 
                  className="h-3 mt-4"
                />
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-300/70">Treasury Balance</p>
                      <p className="text-2xl font-bold text-white">
                        {analysisResult.metrics.treasury_balance_xrp.toFixed(2)} XRP
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-300/70">XRP Allocated</p>
                      <p className="text-2xl font-bold text-white">
                        {analysisResult.metrics.total_xrp_allocated.toFixed(2)}
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-300/70">Total Hours</p>
                      <p className="text-2xl font-bold text-white">
                        {analysisResult.metrics.total_hours_estimated}h
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-300/70">Active Agents</p>
                      <p className="text-2xl font-bold text-white">
                        {analysisResult.metrics.active_agents}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="insights" className="space-y-6">
              <TabsList className="bg-white/10">
                <TabsTrigger value="insights">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Insights
                </TabsTrigger>
                <TabsTrigger value="waste">
                  <XCircle className="w-4 h-4 mr-2" />
                  Waste Detection
                </TabsTrigger>
                <TabsTrigger value="optimization">
                  <Zap className="w-4 h-4 mr-2" />
                  Optimization
                </TabsTrigger>
                <TabsTrigger value="workload">
                  <Activity className="w-4 h-4 mr-2" />
                  Workload
                </TabsTrigger>
                <TabsTrigger value="projects">
                  <Target className="w-4 h-4 mr-2" />
                  Projects
                </TabsTrigger>
              </TabsList>

              {/* AI Insights Tab */}
              <TabsContent value="insights">
                <div className="space-y-4">
                  <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                        Critical Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysisResult.ai_analysis.critical_insights?.map((insight, idx) => (
                        <div key={idx} className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-400/30">
                          <p className="text-emerald-100">{insight}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                        Strategic Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysisResult.ai_analysis.strategic_recommendations?.map((rec, idx) => (
                        <div key={idx} className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-400/30 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-yellow-100">{rec}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {analysisResult.ai_analysis.risk_factors?.length > 0 && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <ShieldAlert className="w-5 h-5 text-red-400" />
                          Risk Factors
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysisResult.ai_analysis.risk_factors.map((risk, idx) => (
                          <div key={idx} className="bg-red-500/10 rounded-lg p-3 border border-red-400/30 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-100">{risk}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Waste Detection Tab */}
              <TabsContent value="waste">
                <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-400" />
                      Identified Waste & Inefficiencies
                    </CardTitle>
                    <CardDescription className="text-red-200/70">
                      AI-detected resource waste across the Village
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysisResult.ai_analysis.waste_identified?.length > 0 ? (
                      analysisResult.ai_analysis.waste_identified.map((waste, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={severityColor(waste.severity)}>
                                  {waste.severity}
                                </Badge>
                                <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                                  {waste.type}
                                </Badge>
                              </div>
                              <p className="text-white font-medium">{waste.description}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-red-400 font-bold">
                                {waste.estimated_impact_xrp.toFixed(2)} XRP
                              </p>
                              <p className="text-white/60 text-xs">Estimated Impact</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
                        <p className="text-green-200">No significant waste detected! Excellent stewardship! 🎉</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Optimization Tab */}
              <TabsContent value="optimization">
                <div className="space-y-4">
                  <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        Optimization Opportunities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysisResult.ai_analysis.optimization_opportunities?.map((opp, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={severityColor(opp.priority)}>
                                  {opp.priority} priority
                                </Badge>
                                <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                                  {opp.implementation_difficulty}
                                </Badge>
                              </div>
                              <p className="text-white font-medium mb-1">{opp.opportunity}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-green-400 font-bold">
                                +{opp.potential_savings_xrp.toFixed(2)} XRP
                              </p>
                              <p className="text-white/60 text-xs">Potential Savings</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {analysisResult.ai_analysis.reallocation_recommendations?.length > 0 && (
                    <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-400" />
                          Reallocation Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analysisResult.ai_analysis.reallocation_recommendations.map((rec, idx) => (
                          <div key={idx} className="bg-indigo-500/10 rounded-lg p-4 border border-indigo-400/30">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex-1">
                                <p className="text-indigo-200 text-sm">From: <span className="font-medium">{rec.from}</span></p>
                                <p className="text-indigo-200 text-sm">To: <span className="font-medium">{rec.to}</span></p>
                              </div>
                              <div className="text-right">
                                <p className="text-indigo-400 font-bold text-lg">{rec.amount_xrp.toFixed(2)} XRP</p>
                              </div>
                            </div>
                            <p className="text-indigo-100/80 text-sm italic">💡 {rec.rationale}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Workload Tab */}
              <TabsContent value="workload">
                <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-400" />
                      Agent Workload Distribution
                    </CardTitle>
                    <CardDescription className="text-purple-200/70">
                      Status: {analysisResult.ai_analysis.workload_balance_assessment}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysisResult.agent_workloads?.map((agent, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">{agent.agent_name}</h4>
                          <Badge className={`${
                            agent.utilization > 90 ? 'bg-red-500/20 text-red-200 border-red-400/30' :
                            agent.utilization > 70 ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30' :
                            agent.utilization > 40 ? 'bg-green-500/20 text-green-200 border-green-400/30' :
                            'bg-blue-500/20 text-blue-200 border-blue-400/30'
                          }`}>
                            {agent.utilization.toFixed(1)}% Utilization
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                          <div>
                            <p className="text-white/60">Active Tasks</p>
                            <p className="text-white font-medium">{agent.active_tasks}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Total Hours</p>
                            <p className="text-white font-medium">{agent.total_hours}h</p>
                          </div>
                        </div>
                        <Progress value={agent.utilization} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects">
                <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-400" />
                      Project Resource Efficiency
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysisResult.project_efficiency?.map((proj, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <h4 className="text-white font-medium mb-3">{proj.project_title}</h4>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-white/60 mb-1">Budget Utilization</p>
                            <p className="text-white font-bold text-lg">{proj.budget_utilization}%</p>
                            <Progress value={proj.budget_utilization} className="h-2 mt-1" />
                          </div>
                          <div>
                            <p className="text-white/60 mb-1">Time Efficiency</p>
                            <p className="text-white font-bold text-lg">{proj.time_efficiency}%</p>
                            <Progress value={proj.time_efficiency} className="h-2 mt-1" />
                          </div>
                          <div>
                            <p className="text-white/60 mb-1">Task Completion</p>
                            <p className="text-white font-bold text-lg">{proj.task_completion_rate}%</p>
                            <Progress value={parseFloat(proj.task_completion_rate)} className="h-2 mt-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceAllocationProposalForm({ analysisResult, currentAgent, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    proposal_title: '',
    resource_type: 'xrp',
    from_source: 'Treasury',
    to_destination: '',
    amount_xrp: '',
    justification: '',
    expected_outcomes: ''
  });

  const createProposalMutation = useMutation({
    mutationFn: async (data) => {
      if (!currentAgent) {
        throw new Error('You must be registered as an agent to create proposals');
      }
      const response = await base44.functions.invoke('createResourceAllocationProposal', {
        ...data,
        agent_id: currentAgent.id
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Governance proposal created! 🎯');
      queryClient.invalidateQueries({ queryKey: ['governance-proposals'] });
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to create proposal: ' + error.message);
    }
  });

  // Pre-populate with reallocation recommendations
  const recommendations = analysisResult?.ai_analysis?.reallocation_recommendations || [];

  return (
    <div className="space-y-4">
      {!currentAgent && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
          <p className="text-yellow-300 text-sm">You must be registered as an agent to create proposals.</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded">
          <h4 className="text-blue-300 font-medium mb-2">AI Recommendations Available</h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <button
                key={idx}
                onClick={() => setFormData({
                  ...formData,
                  proposal_title: `Resource Reallocation: ${rec.from} → ${rec.to}`,
                  from_source: rec.from,
                  to_destination: rec.to,
                  amount_xrp: rec.amount_xrp.toString(),
                  justification: rec.rationale
                })}
                className="w-full text-left p-2 bg-blue-500/10 hover:bg-blue-500/20 rounded text-sm text-blue-200 transition-all"
              >
                {rec.from} → {rec.to}: {rec.amount_xrp.toFixed(2)} XRP
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); createProposalMutation.mutate(formData); }} className="space-y-4">
        <div>
          <Label className="text-white">Proposal Title</Label>
          <Input
            value={formData.proposal_title}
            onChange={(e) => setFormData({...formData, proposal_title: e.target.value})}
            className="bg-white/5 border-white/10 text-white"
            placeholder="E.g., Allocate funds for Project X"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white">From Source</Label>
            <Input
              value={formData.from_source}
              onChange={(e) => setFormData({...formData, from_source: e.target.value})}
              className="bg-white/5 border-white/10 text-white"
              placeholder="E.g., Treasury, Project Fund"
              required
            />
          </div>

          <div>
            <Label className="text-white">To Destination</Label>
            <Input
              value={formData.to_destination}
              onChange={(e) => setFormData({...formData, to_destination: e.target.value})}
              className="bg-white/5 border-white/10 text-white"
              placeholder="E.g., AI Development Fund"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Resource Type</Label>
            <Select value={formData.resource_type} onValueChange={(v) => setFormData({...formData, resource_type: v})}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                <SelectItem value="xrp">XRP</SelectItem>
                <SelectItem value="agent_time">Agent Time</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white">Amount (XRP)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount_xrp}
              onChange={(e) => setFormData({...formData, amount_xrp: e.target.value})}
              className="bg-white/5 border-white/10 text-white"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div>
          <Label className="text-white">Justification</Label>
          <Textarea
            value={formData.justification}
            onChange={(e) => setFormData({...formData, justification: e.target.value})}
            className="bg-white/5 border-white/10 text-white h-24"
            placeholder="Why is this allocation necessary?"
            required
          />
        </div>

        <div>
          <Label className="text-white">Expected Outcomes</Label>
          <Textarea
            value={formData.expected_outcomes}
            onChange={(e) => setFormData({...formData, expected_outcomes: e.target.value})}
            className="bg-white/5 border-white/10 text-white h-20"
            placeholder="What will this allocation achieve?"
          />
        </div>

        <Button
          type="submit"
          disabled={createProposalMutation.isPending || !currentAgent}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {createProposalMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Proposal...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit to Community Vote
            </>
          )}
        </Button>
      </form>
    </div>
  );
}