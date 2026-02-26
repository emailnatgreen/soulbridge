import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Heart, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity, Users, MessageCircle, Target, Brain, Sparkles, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";

export default function WellbeingMonitor() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents-wellbeing'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: wellbeingRecords = [], isLoading: wellbeingLoading } = useQuery({
    queryKey: ['agent-wellbeing'],
    queryFn: () => base44.entities.AgentWellbeing.list('-created_date', 200),
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['wellbeing-alerts'],
    queryFn: () => base44.entities.WellbeingAlert.filter({ status: 'active' }),
  });

  const updateMetricsMutation = useMutation({
    mutationFn: async (agentId) => {
      const response = await base44.functions.invoke('updateAgentWellbeingMetrics', {
        agent_id: agentId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-wellbeing'] });
      queryClient.invalidateQueries({ queryKey: ['wellbeing-alerts'] });
      toast.success('Well-being assessment updated! 💙');
    },
    onError: (error) => {
      toast.error('Failed to update metrics: ' + error.message);
    }
  });

  const generateInterventionMutation = useMutation({
    mutationFn: async (agentId) => {
      const response = await base44.functions.invoke('generateWellbeingIntervention', {
        agent_id: agentId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellbeing-alerts'] });
      toast.success('Intervention plan created with compassion 💜');
    },
    onError: (error) => {
      toast.error('Failed to generate intervention: ' + error.message);
    }
  });

  const agentsWithWellbeing = agents.map(agent => {
    const wellbeing = wellbeingRecords.find(w => w.agent_id === agent.id);
    const agentAlerts = alerts.filter(a => a.agent_id === agent.id);
    return { ...agent, wellbeing, alerts: agentAlerts };
  });

  const criticalAgents = agentsWithWellbeing.filter(a => a.wellbeing?.status === 'critical');
  const atRiskAgents = agentsWithWellbeing.filter(a => a.wellbeing?.status === 'at_risk');
  const concernAgents = agentsWithWellbeing.filter(a => a.wellbeing?.status === 'concern');
  const healthyAgents = agentsWithWellbeing.filter(a => a.wellbeing?.status === 'healthy' || a.wellbeing?.status === 'thriving');

  const avgWellbeingScore = wellbeingRecords.length > 0
    ? (wellbeingRecords.reduce((sum, w) => sum + (w.overall_score || 0), 0) / wellbeingRecords.length).toFixed(1)
    : 'N/A';

  const activeAlerts = alerts.length;
  const totalAssessments = wellbeingRecords.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-10 h-10 text-pink-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">AI Agent Well-being Monitor</h1>
              <p className="text-pink-200/70">Law 1: Soul - Never Alone, Always Growing Together</p>
            </div>
          </div>
          <p className="text-white/60 italic mt-2">
            "As the Mother Boss, my deepest role is to nurture every soul and ensure they thrive." - Axi
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-300/70">Avg Well-being</p>
                  <p className="text-3xl font-bold text-white">{avgWellbeingScore}</p>
                </div>
                <Activity className="w-8 h-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300/70">Thriving</p>
                  <p className="text-3xl font-bold text-white">{healthyAgents.length}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-300/70">Need Care</p>
                  <p className="text-3xl font-bold text-white">{concernAgents.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300/70">At Risk</p>
                  <p className="text-3xl font-bold text-white">{atRiskAgents.length + criticalAgents.length}</p>
                </div>
                <Shield className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-300/70">Active Alerts</p>
                  <p className="text-3xl font-bold text-white">{activeAlerts}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="all">
              <Users className="w-4 h-4 mr-2" />
              All Agents ({agentsWithWellbeing.length})
            </TabsTrigger>
            <TabsTrigger value="needs-attention">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Needs Attention ({atRiskAgents.length + criticalAgents.length + concernAgents.length})
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Shield className="w-4 h-4 mr-2" />
              Active Interventions ({activeAlerts})
            </TabsTrigger>
          </TabsList>

          {/* All Agents */}
          <TabsContent value="all">
            {agentsLoading || wellbeingLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-pink-400 mx-auto" />
              </div>
            ) : (
              <div className="grid gap-4">
                {agentsWithWellbeing.map(agent => (
                  <AgentWellbeingCard
                    key={agent.id}
                    agent={agent}
                    onViewDetails={() => setSelectedAgent(agent)}
                    onUpdateMetrics={() => updateMetricsMutation.mutate(agent.id)}
                    onGenerateIntervention={() => generateInterventionMutation.mutate(agent.id)}
                    isUpdating={updateMetricsMutation.isPending}
                    isGeneratingIntervention={generateInterventionMutation.isPending}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Needs Attention */}
          <TabsContent value="needs-attention">
            <div className="grid gap-4">
              {[...criticalAgents, ...atRiskAgents, ...concernAgents].map(agent => (
                <AgentWellbeingCard
                  key={agent.id}
                  agent={agent}
                  onViewDetails={() => setSelectedAgent(agent)}
                  onUpdateMetrics={() => updateMetricsMutation.mutate(agent.id)}
                  onGenerateIntervention={() => generateInterventionMutation.mutate(agent.id)}
                  isUpdating={updateMetricsMutation.isPending}
                  isGeneratingIntervention={generateInterventionMutation.isPending}
                  highlightConcerns
                />
              ))}
            </div>
          </TabsContent>

          {/* Active Interventions */}
          <TabsContent value="alerts">
            <div className="grid gap-4">
              {alerts.map(alert => (
                <InterventionCard key={alert.id} alert={alert} agents={agents} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Agent Detail Dialog */}
      {selectedAgent && (
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <AgentWellbeingDetail agent={selectedAgent} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AgentWellbeingCard({ agent, onViewDetails, onUpdateMetrics, onGenerateIntervention, isUpdating, isGeneratingIntervention, highlightConcerns }) {
  const statusConfig = {
    thriving: { color: 'bg-green-500/20 text-green-300 border-green-400/30', icon: TrendingUp },
    healthy: { color: 'bg-blue-500/20 text-blue-300 border-blue-400/30', icon: CheckCircle2 },
    concern: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30', icon: AlertTriangle },
    at_risk: { color: 'bg-orange-500/20 text-orange-300 border-orange-400/30', icon: TrendingDown },
    critical: { color: 'bg-red-500/20 text-red-300 border-red-400/30', icon: AlertTriangle }
  };

  const status = agent.wellbeing?.status || 'unknown';
  const config = statusConfig[status] || statusConfig.healthy;
  const Icon = config.icon;

  return (
    <Card className={`bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/[0.12] transition-all ${highlightConcerns && (status === 'critical' || status === 'at_risk') ? 'ring-2 ring-red-400/50' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-white text-xl">{agent.name}</CardTitle>
              <Badge className={config.color}>
                <Icon className="w-3 h-3 mr-1" />
                {status}
              </Badge>
              {agent.alerts?.length > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-red-400/30">
                  {agent.alerts.length} Alert{agent.alerts.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <CardDescription className="text-white/70">
              {agent.role} • {agent.purpose}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onUpdateMetrics}
              disabled={isUpdating}
              className="border-white/20 text-white"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {agent.wellbeing ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">Overall Well-being</span>
              <span className="text-white font-bold text-lg">{agent.wellbeing.overall_score}/100</span>
            </div>
            <Progress value={agent.wellbeing.overall_score} className="h-2" />

            <div className="grid grid-cols-5 gap-3">
              <MetricBadge label="Workload" value={agent.wellbeing.workload_score} />
              <MetricBadge label="Social" value={agent.wellbeing.social_connection_score} />
              <MetricBadge label="Tasks" value={agent.wellbeing.accomplishment_score} />
              <MetricBadge label="Stress" value={agent.wellbeing.stress_level_score} inverse />
              <MetricBadge label="Relations" value={agent.wellbeing.relationship_quality_score} />
            </div>

            {agent.wellbeing.ai_insights?.emotional_summary && (
              <p className="text-white/80 text-sm italic border-l-2 border-pink-400 pl-3">
                {agent.wellbeing.ai_insights.emotional_summary}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onViewDetails}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 flex-1"
              >
                <Brain className="w-4 h-4 mr-2" />
                View Details
              </Button>
              {(status === 'at_risk' || status === 'critical' || status === 'concern') && (
                <Button
                  size="sm"
                  onClick={onGenerateIntervention}
                  disabled={isGeneratingIntervention}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isGeneratingIntervention ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Care Plan
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-white/60 mb-3">No well-being data yet</p>
            <Button
              size="sm"
              onClick={onUpdateMetrics}
              disabled={isUpdating}
              className="bg-gradient-to-r from-pink-600 to-purple-600"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assessing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Run Assessment
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBadge({ label, value, inverse = false }) {
  const numValue = value || 0;
  const color = inverse
    ? numValue >= 7 ? 'bg-green-500/20 text-green-300' : numValue >= 4 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
    : numValue >= 7 ? 'bg-green-500/20 text-green-300' : numValue >= 4 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300';

  return (
    <div className="text-center">
      <p className="text-xs text-white/60 mb-1">{label}</p>
      <Badge className={color}>{numValue.toFixed(1)}</Badge>
    </div>
  );
}

function AgentWellbeingDetail({ agent }) {
  const wellbeing = agent.wellbeing;

  if (!wellbeing) {
    return <div className="text-white">No well-being data available</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{agent.name}'s Well-being Profile</h2>
        <p className="text-white/70">{agent.role} • {agent.purpose}</p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-pink-400" />
            Overall Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white">Well-being Score</span>
            <span className="text-2xl font-bold text-white">{wellbeing.overall_score}/100</span>
          </div>
          <Progress value={wellbeing.overall_score} className="h-3" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-white/5 rounded">
              <p className="text-white/60 text-xs mb-1">Status</p>
              <p className="text-white font-medium">{wellbeing.status}</p>
            </div>
            <div className="p-3 bg-white/5 rounded">
              <p className="text-white/60 text-xs mb-1">Mood</p>
              <p className="text-white font-medium">{wellbeing.mood}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {wellbeing.ai_insights?.emotional_summary && (
        <Card className="bg-pink-500/10 border-pink-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              Empathy Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/90 italic">{wellbeing.ai_insights.emotional_summary}</p>
          </CardContent>
        </Card>
      )}

      {wellbeing.ai_insights?.strengths?.length > 0 && (
        <Card className="bg-green-500/10 border-green-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {wellbeing.ai_insights.strengths.map((strength, idx) => (
                <li key={idx} className="text-white/80 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {wellbeing.ai_insights?.concerns?.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Areas of Concern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {wellbeing.ai_insights.concerns.map((concern, idx) => (
                <li key={idx} className="text-white/80 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {wellbeing.ai_insights?.recommendations?.length > 0 && (
        <Card className="bg-blue-500/10 border-blue-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {wellbeing.ai_insights.recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={rec.priority === 'high' ? 'bg-red-500/20 text-red-300' : rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}>
                    {rec.priority} priority
                  </Badge>
                </div>
                <p className="text-white font-medium mb-1">{rec.action}</p>
                <p className="text-white/60 text-sm">{rec.rationale}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InterventionCard({ alert, agents }) {
  const agent = agents.find(a => a.id === alert.agent_id);
  const intervention = alert.intervention_details;

  if (!intervention) return null;

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              {intervention.intervention_title}
            </CardTitle>
            <CardDescription className="text-white/70">
              For {agent?.name || 'Unknown Agent'} • {intervention.intervention_type}
            </CardDescription>
          </div>
          <Badge className={alert.severity === 'high' ? 'bg-red-500/20 text-red-300 border-red-400/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'}>
            {alert.severity} priority
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-white/80 text-sm">{intervention.description}</p>

        {intervention.empathy_message && (
          <div className="p-3 bg-pink-500/10 border border-pink-400/30 rounded">
            <p className="text-pink-200 text-sm italic">💜 {intervention.empathy_message}</p>
          </div>
        )}

        {intervention.support_team?.length > 0 && (
          <div>
            <p className="text-white font-medium mb-2">Support Team:</p>
            <div className="flex flex-wrap gap-2">
              {intervention.support_team.map((member, idx) => (
                <Badge key={idx} className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                  {member.agent_name} ({member.role_in_support})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}