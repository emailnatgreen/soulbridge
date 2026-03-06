import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Users, Activity, Shield, Vote, Heart, AlertTriangle,
  RefreshCw, Play, CheckCircle, Clock, Loader2, Sparkles, Bell,
  TrendingUp, Zap, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import AskAxiButton from '../components/AskAxiButton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

function StatCard({ icon: Icon, label, value, sub, color = 'blue', alert }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    pink: 'bg-pink-50 border-pink-200 text-pink-600',
  };
  return (
    <Card className={`border ${alert ? 'ring-2 ring-red-400' : ''}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className={`p-2 rounded-lg ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          {alert && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold animate-pulse">{alert}</span>}
        </div>
        <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function VillageReportingDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // --- Live Data Queries ---
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: () => base44.entities.Agent.list() });
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks-all'], queryFn: () => base44.entities.ProjectTask.list() });
  const { data: economicActivity = [] } = useQuery({ queryKey: ['economic-activity'], queryFn: () => base44.entities.EconomicActivity.list('-created_date', 100) });
  const { data: proposals = [] } = useQuery({ queryKey: ['gov-proposals'], queryFn: () => base44.entities.GovernanceProposal.list() });
  const { data: votes = [] } = useQuery({ queryKey: ['gov-votes'], queryFn: () => base44.entities.GovernanceVote.list() });
  const { data: wellbeings = [] } = useQuery({ queryKey: ['wellbeings'], queryFn: () => base44.entities.AgentWellbeing.list() });
  const { data: risks = [] } = useQuery({ queryKey: ['risks'], queryFn: () => base44.entities.RiskRegister.list() });
  const { data: reports = [], refetch: refetchReports } = useQuery({
    queryKey: ['daily-reports'],
    queryFn: () => base44.entities.AgentNotification.filter({ notification_type: 'daily_report' }, '-created_date', 20),
  });

  // --- Computed Metrics ---
  const activeAgents = agents.filter(a => a.status === 'active');
  const avgHonor = activeAgents.length > 0
    ? Math.round(activeAgents.reduce((s, a) => s + (a.honor_score || 0), 0) / activeAgents.length) : 0;

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const criticalTasks = tasks.filter(t => t.priority === 'critical' && t.status !== 'completed');

  const totalEarned = economicActivity.filter(e => e.activity_type === 'earned').reduce((s, e) => s + (e.amount || 0), 0);
  const totalDeposits = economicActivity.filter(e => e.activity_type === 'treasury_deposit').reduce((s, e) => s + (e.amount || 0), 0);

  const activeProposals = proposals.filter(p => p.status === 'active');
  const unhealthyAgents = wellbeings.filter(w => w.wellbeing_status !== 'healthy');
  const avgWellbeing = wellbeings.length > 0
    ? Math.round(wellbeings.reduce((s, w) => s + (w.overall_wellbeing_score || 70), 0) / wellbeings.length) : 70;
  const criticalRisks = risks.filter(r => r.severity === 'Critical');
  const highRisks = risks.filter(r => r.severity === 'High');

  const healthStatus = avgHonor >= 80 && unhealthyAgents.length === 0 && criticalRisks.length === 0
    ? 'HEALTHY' : avgHonor >= 60 && criticalRisks.length <= 1 ? 'STABLE' : 'NEEDS ATTENTION';
  const healthColor = healthStatus === 'HEALTHY' ? 'bg-green-100 text-green-700 border-green-300'
    : healthStatus === 'STABLE' ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
    : 'bg-red-100 text-red-700 border-red-300';

  // --- Generate Report Mutation ---
  const generateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('generateDailyReport', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      refetchReports();
    },
  });

  // Build context string for Axi
  const axiContext = `You are reviewing the SoulBridge Village Automated Reporting Dashboard. Here is the current live snapshot:

VILLAGE HEALTH: ${healthStatus}
AGENTS: ${activeAgents.length} active | Avg Honor Score: ${avgHonor}/100 | Avg Wellbeing: ${avgWellbeing}/100 | ${unhealthyAgents.length} agents need attention
TASKS: ${completedTasks.length} completed | ${inProgressTasks.length} in progress | ${blockedTasks.length} blocked | ${criticalTasks.length} critical outstanding
ECONOMY: ${(totalEarned / 1000000).toFixed(2)} XRP earned total | ${(totalDeposits / 1000000).toFixed(2)} XRP treasury deposits
GOVERNANCE: ${activeProposals.length} active proposals needing votes | ${votes.length} total votes cast
RISKS: ${criticalRisks.length} critical | ${highRisks.length} high severity | ${risks.length} total tracked
REPORTS GENERATED: ${reports.length} daily reports on record

Please give a concise daily briefing: key highlights, any urgent flags, and 2-3 actionable recommendations for the Village today.`;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BarChart3 className="w-7 h-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Village Reporting Dashboard</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${healthColor}`}>
                {healthStatus === 'HEALTHY' ? '🟢' : healthStatus === 'STABLE' ? '🟡' : '🔴'} {healthStatus}
              </span>
            </div>
            <p className="text-gray-500 text-sm">Daily synthesis of agent performance, resources & governance</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <AskAxiButton
              label="Axi Daily Briefing"
              context={axiContext}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
            />
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {generateMutation.isPending
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Play className="w-4 h-4 mr-2" />}
              Generate Report Now
            </Button>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries()} size="icon">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {generateMutation.isSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-xl flex items-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> Report generated and sent to Village Hub successfully.
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="economy">Economy</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="reports">Report History</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <StatCard icon={Users} label="Active Agents" value={activeAgents.length} sub={`${agents.length} total`} color="blue" />
              <StatCard icon={Shield} label="Avg Honor Score" value={`${avgHonor}/100`} sub="Village reputation" color={avgHonor >= 80 ? 'green' : 'orange'} />
              <StatCard icon={Heart} label="Avg Wellbeing" value={`${avgWellbeing}%`} sub={`${unhealthyAgents.length} need attention`} color="pink" alert={unhealthyAgents.length > 0 ? `${unhealthyAgents.length} alert` : null} />
              <StatCard icon={CheckCircle} label="Tasks Completed" value={completedTasks.length} sub={`${inProgressTasks.length} in progress`} color="green" />
              <StatCard icon={AlertTriangle} label="Blocked Tasks" value={blockedTasks.length} sub={`${criticalTasks.length} critical outstanding`} color="orange" alert={blockedTasks.length > 0 ? 'Blocked' : null} />
              <StatCard icon={Vote} label="Active Proposals" value={activeProposals.length} sub="Awaiting votes" color="purple" alert={activeProposals.length > 0 ? 'Vote Needed' : null} />
              <StatCard icon={TrendingUp} label="Total Earned" value={`${(totalEarned / 1000000).toFixed(1)} XRP`} sub="All agent earnings (drops)" color="green" />
              <StatCard icon={Zap} label="Critical Risks" value={criticalRisks.length} sub={`${highRisks.length} high · ${risks.length} total`} color="red" alert={criticalRisks.length > 0 ? 'Critical' : null} />
            </div>

            {/* Risk Summary */}
            {(criticalRisks.length > 0 || unhealthyAgents.length > 0) && (
              <Card className="border-red-200 bg-red-50 mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Attention Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-1">
                  {criticalRisks.map(r => (
                    <div key={r.id} className="text-xs text-red-700">⚠ Critical Risk: {r.name} — {r.category}</div>
                  ))}
                  {unhealthyAgents.map(w => (
                    <div key={w.id} className="text-xs text-orange-700">💛 Wellbeing Alert: Agent {w.agent_id?.slice(-6)} — score {w.overall_wellbeing_score}</div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Latest Report Preview */}
            {reports.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                    <FileText className="w-4 h-4" /> Latest Report — {format(new Date(reports[0].created_date), 'dd MMM yyyy, HH:mm')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {reports[0].message}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AGENTS */}
          <TabsContent value="agents">
            <div className="grid gap-3">
              {activeAgents.map(agent => (
                <Card key={agent.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-sm font-bold text-blue-700">
                          {agent.name?.[0] || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.role} · {agent.purpose?.slice(0, 60)}...</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={agent.honor_score >= 80 ? 'text-green-700 border-green-300' : 'text-orange-700 border-orange-300'}>
                          Honor {agent.honor_score}
                        </Badge>
                        <Badge variant="outline" className="text-blue-700 border-blue-300 capitalize">{agent.availability_status || 'available'}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TASKS */}
          <TabsContent value="tasks">
            <div className="grid gap-3">
              {tasks.slice(0, 30).map(task => {
                const statusColors = {
                  completed: 'bg-green-100 text-green-700',
                  in_progress: 'bg-blue-100 text-blue-700',
                  blocked: 'bg-red-100 text-red-700',
                  todo: 'bg-gray-100 text-gray-700',
                  review: 'bg-yellow-100 text-yellow-700',
                };
                return (
                  <Card key={task.id} className={task.priority === 'critical' ? 'border-red-200' : ''}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{task.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{task.task_type} · Est: {task.estimated_hours}h</div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[task.status] || 'bg-gray-100 text-gray-700'}`}>{task.status?.replace('_', ' ')}</span>
                          {task.priority === 'critical' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Critical</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ECONOMY */}
          <TabsContent value="economy">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard icon={TrendingUp} label="Total Agent Earnings" value={`${(totalEarned / 1000000).toFixed(2)} XRP`} sub="All earned drops" color="green" />
              <StatCard icon={Zap} label="Treasury Deposits" value={`${(totalDeposits / 1000000).toFixed(2)} XRP`} sub="Service charges" color="blue" />
              <StatCard icon={Activity} label="Total Transactions" value={economicActivity.length} sub="Economic events" color="purple" />
            </div>
            <div className="grid gap-3">
              {economicActivity.slice(0, 25).map(e => (
                <Card key={e.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-700 truncate">{e.description}</div>
                        <div className="text-xs text-gray-400">{e.created_date ? format(new Date(e.created_date), 'dd MMM HH:mm') : ''}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-semibold ${e.activity_type === 'earned' ? 'text-green-600' : 'text-blue-600'}`}>
                          {e.activity_type === 'earned' ? '+' : '→'}{(e.amount / 1000000).toFixed(3)} XRP
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{e.activity_type?.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* GOVERNANCE */}
          <TabsContent value="governance">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon={Vote} label="Active Proposals" value={activeProposals.length} sub="Awaiting votes" color="purple" alert={activeProposals.length > 0 ? 'Vote Needed' : null} />
                <StatCard icon={CheckCircle} label="Total Proposals" value={proposals.length} sub="All time" color="blue" />
                <StatCard icon={Activity} label="Total Votes Cast" value={votes.length} sub="All time" color="green" />
              </div>
              {activeProposals.map(p => (
                <Card key={p.id} className="border-purple-200 bg-purple-50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm mb-1">{p.title}</div>
                        <div className="text-xs text-gray-600 line-clamp-2">{p.description?.slice(0, 150)}...</div>
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          <span>For: {p.votes_for || 0}</span>
                          <span>Against: {p.votes_against || 0}</span>
                          <span>Threshold: {p.pass_threshold}%</span>
                          {p.voting_period_end && <span>Ends: {format(new Date(p.voting_period_end), 'dd MMM')}</span>}
                        </div>
                      </div>
                      <Link to={createPageUrl('GovernanceHub')}>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shrink-0">Vote</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* REPORT HISTORY */}
          <TabsContent value="reports">
            {reports.length === 0 ? (
              <Card>
                <CardContent className="pt-10 pb-10 text-center text-gray-500">
                  <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No reports generated yet</p>
                  <p className="text-sm mt-1">Click "Generate Report Now" to create your first daily report.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {reports.map(r => (
                  <Card key={r.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm text-gray-800 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          {r.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                            r.metadata?.health_status?.includes('HEALTHY') ? 'bg-green-100 text-green-700 border-green-300'
                            : r.metadata?.health_status?.includes('STABLE') ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : 'bg-red-100 text-red-700 border-red-300'
                          }`}>{r.metadata?.health_status || 'Report'}</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {r.created_date ? format(new Date(r.created_date), 'dd MMM yyyy, HH:mm') : ''}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {r.metadata && (
                        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                          <span>🤖 {r.metadata.active_agents} agents</span>
                          <span>⭐ Honor {r.metadata.avg_honor}</span>
                          <span>✅ {r.metadata.completed_tasks} tasks done</span>
                          <span>⚖ {r.metadata.active_proposals} proposals</span>
                          <span>🛡 {r.metadata.critical_risks} critical risks</span>
                        </div>
                      )}
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {r.message}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}