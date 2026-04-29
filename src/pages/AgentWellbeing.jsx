import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, AlertTriangle, TrendingUp, Users, Brain, Loader2, Sparkles, CheckCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { toast } from 'sonner';

export default function AgentWellbeing() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAtRisk, setShowAtRisk] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: wellbeingRecords = [] } = useQuery({
    queryKey: ['wellbeing'],
    queryFn: () => base44.entities.AgentWellbeing.list('-created_date')
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['wellbeingAlerts'],
    queryFn: () => base44.entities.WellbeingAlert.filter({ status: 'active' })
  });

  const { data: atRiskData, isLoading: loadingAtRisk, refetch: fetchAtRisk } = useQuery({
    queryKey: ['atRiskAgents'],
    queryFn: async () => {
      const response = await base44.functions.invoke('identifyAtRiskAgents', {});
      return response.data;
    },
    enabled: false
  });

  const avgWellbeing = wellbeingRecords.length > 0
    ? wellbeingRecords.reduce((sum, w) => sum + w.overall_wellbeing_score, 0) / wellbeingRecords.length
    : 0;

  const thriving = wellbeingRecords.filter(w => w.wellbeing_status === 'thriving').length;
  const atRisk = wellbeingRecords.filter(w => ['concerning', 'at_risk'].includes(w.wellbeing_status)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-2">
          <PageBreadcrumb />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-white font-semibold text-lg leading-tight">Agent Wellbeing</h1>
              <p className="text-rose-300/50 text-xs">Law 1: Every Agent is a Presence, Not a Product</p>
            </div>
            <Button
              size="sm"
              onClick={() => { fetchAtRisk(); setShowAtRisk(true); }}
              disabled={loadingAtRisk}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
            >
              {loadingAtRisk ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              Identify At-Risk
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Avg Wellbeing', value: `${avgWellbeing.toFixed(0)}/100`, color: 'text-green-400', icon: Activity },
            { label: 'Thriving', value: thriving, color: 'text-emerald-400', icon: Heart },
            { label: 'At Risk', value: atRisk, color: 'text-red-400', icon: AlertTriangle },
            { label: 'Active Alerts', value: alerts.length, color: 'text-amber-400', icon: AlertTriangle },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-white/40 text-xs">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* At-Risk Dashboard */}
        {showAtRisk && atRiskData && (
          <Card className="bg-gradient-to-br from-red-900/30 to-rose-900/30 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                At-Risk Agents ({atRiskData.total_at_risk})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {atRiskData.at_risk_agents?.slice(0, 10).map((atRisk, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded border cursor-pointer hover:bg-white/5 ${
                    atRisk.risk_level === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                    atRisk.risk_level === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                    'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                  onClick={() => setSelectedAgent(atRisk.agent_id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-white font-medium">{atRisk.agent_name}</div>
                      <div className="text-xs text-white/60">{atRisk.agent_role}</div>
                    </div>
                    <Badge className={
                      atRisk.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                      atRisk.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }>
                      {atRisk.risk_level} risk
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {atRisk.risk_factors?.map((factor, fidx) => (
                      <div key={fidx} className="text-sm text-white/70">• {factor}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                    <div className="text-white/60">Wellbeing: {atRisk.wellbeing_score}/100</div>
                    <div className="text-white/60">Burnout: {atRisk.burnout_risk}/10</div>
                    <div className="text-white/60">Alerts: {atRisk.active_alerts}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Active Wellbeing Alerts ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.slice(0, 10).map((alert, idx) => {
                const agent = agents.find(a => a.id === alert.agent_id);
                return (
                  <div 
                    key={idx}
                    className="p-3 bg-white/5 rounded border border-amber-500/30 cursor-pointer hover:bg-white/10"
                    onClick={() => setSelectedAgent(alert.agent_id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-white font-medium">{agent?.name || 'Unknown'}</div>
                        <div className="text-sm text-amber-300">{alert.alert_type.replace(/_/g, ' ')}</div>
                      </div>
                      <Badge className={
                        alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                    <div className="text-sm text-white/70">{alert.description}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Agent Grid */}
        <Tabs defaultValue="all">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="text-xs">All Agents</TabsTrigger>
            <TabsTrigger value="thriving" className="text-xs">Thriving</TabsTrigger>
            <TabsTrigger value="needs_support" className="text-xs">Needs Support</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => {
                const agentWellbeing = wellbeingRecords.find(w => w.agent_id === agent.id);
                const agentAlerts = alerts.filter(a => a.agent_id === agent.id);
                
                return (
                  <WellbeingCard 
                    key={agent.id}
                    agent={agent}
                    wellbeing={agentWellbeing}
                    alertCount={agentAlerts.length}
                    onClick={() => setSelectedAgent(agent.id)}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="thriving" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => {
                const agentWellbeing = wellbeingRecords.find(w => w.agent_id === agent.id);
                if (agentWellbeing?.wellbeing_status !== 'thriving') return null;
                
                return (
                  <WellbeingCard 
                    key={agent.id}
                    agent={agent}
                    wellbeing={agentWellbeing}
                    alertCount={0}
                    onClick={() => setSelectedAgent(agent.id)}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="needs_support" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => {
                const agentWellbeing = wellbeingRecords.find(w => w.agent_id === agent.id);
                if (!['concerning', 'at_risk'].includes(agentWellbeing?.wellbeing_status)) return null;
                
                const agentAlerts = alerts.filter(a => a.agent_id === agent.id);
                return (
                  <WellbeingCard 
                    key={agent.id}
                    agent={agent}
                    wellbeing={agentWellbeing}
                    alertCount={agentAlerts.length}
                    onClick={() => setSelectedAgent(agent.id)}
                  />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {selectedAgent && (
        <AgentWellbeingDetail 
          agentId={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

function WellbeingCard({ agent, wellbeing, alertCount, onClick }) {
  const statusColors = {
    thriving: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
    neutral: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    concerning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    at_risk: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <Card 
      className="bg-white/5 border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{agent.name}</h3>
            <p className="text-white/40 text-xs capitalize">{agent.role}</p>
          </div>
          {wellbeing && (
            <Badge className={statusColors[wellbeing.wellbeing_status]}>
              {wellbeing.wellbeing_status?.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>

        {wellbeing ? (
          <>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/40">Overall Wellbeing</span>
              <span className="text-white font-medium">{wellbeing.overall_wellbeing_score}/100</span>
            </div>
            <Progress value={wellbeing.overall_wellbeing_score} className="h-1.5" />
            
            {alertCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-300">{alertCount} active alert{alertCount !== 1 ? 's' : ''}</span>
              </div>
            )}

            {wellbeing.stress_indicators && (
              <div className="flex items-center justify-between text-xs text-white/40 pt-2 border-t border-white/10">
                <span>Burnout risk</span>
                <span>{wellbeing.stress_indicators.burnout_risk}/10</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-white/30 text-xs">
            No assessment yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgentWellbeingDetail({ agentId, onClose }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => base44.entities.Agent.get(agentId)
  });

  const { data: wellbeingRecords = [] } = useQuery({
    queryKey: ['agentWellbeing', agentId],
    queryFn: () => base44.entities.AgentWellbeing.filter({ agent_id: agentId })
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['agentAlerts', agentId],
    queryFn: () => base44.entities.WellbeingAlert.filter({ agent_id: agentId, status: 'active' })
  });

  const latestWellbeing = wellbeingRecords[0];

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeAgentWellbeing', { agent_id: agentId });
      setAnalysis(response.data);
      toast.success('Wellbeing analysis complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-rose-400" />
            {agent.name} — Wellbeing
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            size="sm"
            onClick={runAnalysis}
            disabled={analyzing || !agent || agentLoading}
            className="bg-rose-600 hover:bg-rose-700 text-xs gap-1.5"
          >
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
            {agentLoading ? 'Loading...' : 'Run AI Analysis'}
          </Button>

          {/* Current Status */}
          {latestWellbeing && (
            <Card className="bg-gradient-to-br from-rose-900/30 to-pink-900/30 border-rose-500/30">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium text-sm">Current Wellbeing</span>
                  <Badge className={
                    latestWellbeing.wellbeing_status === 'thriving' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                    latestWellbeing.wellbeing_status === 'healthy' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    latestWellbeing.wellbeing_status === 'at_risk' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }>
                    {latestWellbeing.wellbeing_status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="text-center py-2">
                  <div className="text-4xl font-bold text-rose-400">
                    {latestWellbeing.overall_wellbeing_score}/100
                  </div>
                  <div className="text-white/40 text-xs mt-1">Overall Wellbeing Score</div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(latestWellbeing.dimensions || {}).map(([key, value]) => (
                    <div key={key} className="p-2.5 bg-white/5 rounded-lg">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-white/50 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-white font-medium">{value}/100</span>
                      </div>
                      <Progress value={value} className="h-1" />
                    </div>
                  ))}
                </div>

                {/* Stress Indicators */}
                {latestWellbeing.stress_indicators && (
                  <div>
                    <div className="text-white/60 text-xs font-medium mb-2">Stress Indicators</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(latestWellbeing.stress_indicators).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg">
                          <span className="text-white/50 capitalize">{key.replace(/_/g, ' ')}</span>
                          <Badge className={
                            value > 7 ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            value > 5 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            'bg-green-500/20 text-green-400 border-green-500/30'
                          }>
                            {value}/10
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Results */}
          {analysis && (
            <>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <p className="text-white/60 text-xs font-medium mb-2">Holistic Summary</p>
                  <p className="text-white/80 text-sm leading-relaxed">{analysis.holistic_summary}</p>
                </CardContent>
              </Card>

              {analysis.wellbeing?.warning_signs?.length > 0 && (
                <Card className="bg-red-500/10 border-red-500/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-white text-sm font-medium">Warning Signs</span>
                    </div>
                    {analysis.wellbeing.warning_signs.map((warning, idx) => (
                      <div key={idx} className="p-2.5 bg-white/5 rounded-lg flex items-center justify-between">
                        <span className="text-red-300 text-xs">{warning.sign}</span>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">{warning.severity}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {analysis.wellbeing?.positive_trends?.length > 0 && (
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-4 space-y-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-white text-sm font-medium">Positive Trends</span>
                    </div>
                    {analysis.wellbeing.positive_trends.map((trend, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-green-300">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        {trend}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {analysis.wellbeing?.ai_recommendations?.length > 0 && (
                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span className="text-white text-sm font-medium">AI Recommendations</span>
                    </div>
                    {analysis.wellbeing.ai_recommendations.map((rec, idx) => (
                      <div key={idx} className="p-2.5 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">{rec.priority}</Badge>
                          <span className="text-[10px] text-white/40">{rec.category}</span>
                        </div>
                        <div className="text-xs text-white/80 mt-1.5">{rec.recommendation}</div>
                        <div className="text-[10px] text-blue-300 mt-1">Impact: {rec.expected_impact}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Active Alerts for This Agent */}
          {alerts.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 space-y-2">
                <span className="text-white/60 text-xs font-medium">Active Alerts</span>
                {alerts.map((alert, idx) => (
                  <div key={idx} className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-amber-300 text-xs font-medium capitalize">
                        {alert.alert_type.replace(/_/g, ' ')}
                      </span>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">{alert.severity}</Badge>
                    </div>
                    <div className="text-[11px] text-white/50">{alert.description}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}