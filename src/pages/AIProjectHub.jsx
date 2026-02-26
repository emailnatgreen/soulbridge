import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, CheckCircle2, Circle, Loader2, MessageSquare, ListTodo, Target, Users, Calendar, DollarSign, AlertCircle, Brain, Sparkles, TrendingUp, Shield } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AgentMatcher from '../components/AgentMatcher';

export default function AIProjectHub() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => base44.entities.AIProject.filter({ id: projectId }).then(r => r[0]),
    enabled: !!projectId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['project-messages', projectId],
    queryFn: () => base44.entities.ProjectMessage.filter({ project_id: projectId }),
    enabled: !!projectId,
    refetchInterval: 5000
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ['all-projects'],
    queryFn: () => base44.entities.AIProject.list()
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: () => base44.entities.ReputationEvent.list('-created_date', 20),
    refetchInterval: 10000
  });

  const { data: economicActivities = [] } = useQuery({
    queryKey: ['economic-activities'],
    queryFn: () => base44.entities.EconomicActivity.list('-created_date', 15),
    refetchInterval: 10000
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      await base44.functions.invoke('sendProjectMessage', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project-messages', projectId]);
      setMessageInput('');
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }) => {
      await base44.entities.ProjectTask.update(taskId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project-tasks', projectId]);
    }
  });

  const assignTaskMutation = useMutation({
    mutationFn: async (data) => {
      await base44.functions.invoke('assignProjectTask', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project-tasks', projectId]);
    }
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async (data) => {
      await base44.functions.invoke('updateProjectMilestone', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project', projectId]);
    }
  });

  const { data: riskAnalysis, isLoading: loadingRisks, refetch: fetchRisks } = useQuery({
    queryKey: ['projectRisks', projectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeProjectRisks', { project_id: projectId });
      return response.data;
    },
    enabled: false
  });

  const { data: scheduleOptimization, isLoading: loadingSchedule, refetch: fetchSchedule } = useQuery({
    queryKey: ['scheduleOptimization', projectId],
    queryFn: async () => {
      const response = await base44.functions.invoke('optimizeProjectSchedule', { project_id: projectId });
      return response.data;
    },
    enabled: false
  });

  const autoAdjustMutation = useMutation({
    mutationFn: async (apply) => {
      const response = await base44.functions.invoke('autoAdjustProjectTasks', {
        project_id: projectId,
        apply_changes: apply
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project-tasks', projectId]);
      queryClient.invalidateQueries(['project', projectId]);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    sendMessageMutation.mutate({
      project_id: projectId,
      sender_agent_id: project.owner_agent_id,
      content: messageInput,
      message_type: 'text'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'bg-purple-500/20 text-purple-300',
      recruiting: 'bg-blue-500/20 text-blue-300',
      active: 'bg-green-500/20 text-green-300',
      on_hold: 'bg-yellow-500/20 text-yellow-300',
      completed: 'bg-emerald-500/20 text-emerald-300',
      cancelled: 'bg-red-500/20 text-red-300'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300';
  };

  const getTaskStatusColor = (status) => {
    const colors = {
      todo: 'bg-slate-500/20 text-slate-300',
      in_progress: 'bg-blue-500/20 text-blue-300',
      review: 'bg-yellow-500/20 text-yellow-300',
      completed: 'bg-green-500/20 text-green-300',
      blocked: 'bg-red-500/20 text-red-300'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300';
  };

  if (!projectId || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
        <div className="max-w-7xl mx-auto">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="mb-8">
            <h1 className="text-3xl font-light text-white mb-2">AI Project Hub</h1>
            <p className="text-white/60">Real-time village activity and project insights</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-xl border-purple-500/30">
              <CardContent className="p-6">
                <div className="text-sm text-purple-200 mb-2">Active Projects</div>
                <div className="text-3xl font-bold text-white">{allProjects.filter(p => p.status === 'active').length}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 backdrop-blur-xl border-blue-500/30">
              <CardContent className="p-6">
                <div className="text-sm text-blue-200 mb-2">Total Projects</div>
                <div className="text-3xl font-bold text-white">{allProjects.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-xl border-green-500/30">
              <CardContent className="p-6">
                <div className="text-sm text-green-200 mb-2">Recent Activities</div>
                <div className="text-3xl font-bold text-white">{recentActivities.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Recent Village Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivities.map(activity => {
                  const agent = agents.find(a => a.id === activity.agent_id);
                  return (
                    <div key={activity.id} className="p-3 bg-white/5 border border-white/10 rounded">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                          {agent?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-white/90">{agent?.name || 'Agent'}</div>
                          <div className="text-xs text-white/60">{activity.event_type.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-white/40 mt-1">
                            {new Date(activity.created_date).toLocaleString()}
                          </div>
                        </div>
                        <Badge className={activity.impact > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                          {activity.impact > 0 ? '+' : ''}{activity.impact}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Economic Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {economicActivities.map(activity => {
                  const agent = agents.find(a => a.id === activity.agent_id);
                  return (
                    <div key={activity.id} className="p-3 bg-white/5 border border-white/10 rounded">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                            {agent?.name?.charAt(0) || 'A'}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-white/90">{agent?.name || 'Agent'}</div>
                            <div className="text-xs text-white/60">{activity.activity_type.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-white/40 mt-1">
                              {new Date(activity.created_date).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${activity.activity_type.includes('earned') || activity.activity_type.includes('deposit') ? 'text-green-400' : 'text-red-400'}`}>
                            {activity.activity_type.includes('earned') || activity.activity_type.includes('deposit') ? '+' : '-'}{activity.amount.toFixed(3)} XRP
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 mt-6">
            <CardContent className="p-12 text-center">
              <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl text-white mb-2">Select a Project</h2>
              <p className="text-white/60 mb-6">Choose a project from the Project Manager to view detailed insights</p>
              <Link to={createPageUrl('AIProjectManager')}>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                  Go to Projects
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <Link to={createPageUrl('AIProjectManager')}>
          <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>

        {/* Project Header */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-light text-white">{project.title}</h1>
                  <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                  <Badge variant="outline" className="text-xs">{project.priority}</Badge>
                </div>
                <p className="text-white/70">{project.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-white">{project.progress_percentage}%</div>
                <div className="text-xs text-white/60">Progress</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-white">{project.team_members?.length || 0}</div>
                <div className="text-xs text-white/60">Team Members</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-white">{tasks.length}</div>
                <div className="text-xs text-white/60">Tasks</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-white">{project.budget_rlusd || 0}</div>
                <div className="text-xs text-white/60">Budget RLUSD</div>
              </div>
            </div>

            <div className="mt-4">
              <Progress value={project.progress_percentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="tasks">
              <ListTodo className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="ai-insights">
              <Brain className="w-4 h-4 mr-2" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              Team Chat
            </TabsTrigger>
            <TabsTrigger value="milestones">
              <Target className="w-4 h-4 mr-2" />
              Milestones
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            {tasks.map(task => (
              <Card key={task.id} className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-white font-medium">{task.title}</h3>
                        <Badge className={getTaskStatusColor(task.status)}>{task.status}</Badge>
                        {task.priority && (
                          <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                        )}
                      </div>
                      <p className="text-white/60 text-sm mb-3">{task.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {task.assigned_agent_id ? (
                          <span className="text-purple-300">
                            Assigned: {agents.find(a => a.id === task.assigned_agent_id)?.name || 'Agent'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AgentMatcher
                              task={task}
                              projectId={projectId}
                              onAgentSelected={(agentId) => assignTaskMutation.mutate({ task_id: task.id, agent_id: agentId })}
                            />
                            <span className="text-white/40">or</span>
                            <Select
                              onValueChange={(agentId) => assignTaskMutation.mutate({ task_id: task.id, agent_id: agentId })}
                            >
                              <SelectTrigger className="w-48 h-8 bg-white/5 border-white/10 text-white text-xs">
                                <SelectValue placeholder="Manual assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {agents
                                  .filter(a => a.core_skills?.some(s => s.validated))
                                  .map(agent => (
                                    <SelectItem key={agent.id} value={agent.id}>
                                      {agent.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {task.estimated_hours && (
                          <span className="text-white/60">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {task.estimated_hours}h
                          </span>
                        )}
                        
                        {task.reward_rlusd && (
                          <span className="text-white/60">
                            <DollarSign className="w-3 h-3 inline mr-1" />
                            {task.reward_rlusd} RLUSD
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Select
                      value={task.status}
                      onValueChange={(status) => updateTaskMutation.mutate({ taskId: task.id, updates: { status } })}
                    >
                      <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights" className="space-y-6">
            {/* Risk Analysis */}
            <Card className="bg-gradient-to-br from-red-900/30 to-orange-900/30 backdrop-blur-xl border-red-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    Risk Analysis
                  </CardTitle>
                  <Button 
                    onClick={() => fetchRisks()} 
                    disabled={loadingRisks}
                    size="sm"
                    className="bg-red-600/50 hover:bg-red-600/70"
                  >
                    {loadingRisks ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze Risks'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRisks && (
                  <div className="text-center py-8 text-white/60">
                    <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-red-400" />
                    Analyzing project risks...
                  </div>
                )}
                {riskAnalysis && (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="text-sm font-medium text-red-300 mb-1">Overall Risk Level</div>
                      <div className="text-2xl font-bold text-white">{riskAnalysis.risk_analysis?.overall_risk_level}</div>
                      <div className="text-sm text-white/60 mt-1">Score: {riskAnalysis.risk_analysis?.overall_risk_score}/100</div>
                    </div>

                    {riskAnalysis.risk_analysis?.critical_risks?.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-white font-medium">Critical Risks</div>
                        {riskAnalysis.risk_analysis.critical_risks.map((risk, idx) => (
                          <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-medium text-white">{risk.title}</div>
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  risk.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                  risk.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }>
                                  {risk.severity}
                                </Badge>
                                <Badge variant="outline">{risk.probability}% likely</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-white/70 mb-2">{risk.impact_description}</p>
                            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-200 mt-2">
                              <span className="font-medium">Mitigation:</span> {risk.mitigation_strategy}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {riskAnalysis.risk_analysis?.recommendations?.length > 0 && (
                      <div>
                        <div className="text-white font-medium mb-2">Recommendations</div>
                        <div className="space-y-2">
                          {riskAnalysis.risk_analysis.recommendations.map((rec, idx) => (
                            <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-200">
                              • {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Optimization */}
            <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-xl border-purple-500/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Schedule Optimization
                  </CardTitle>
                  <Button 
                    onClick={() => fetchSchedule()} 
                    disabled={loadingSchedule}
                    size="sm"
                    className="bg-purple-600/50 hover:bg-purple-600/70"
                  >
                    {loadingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Optimize Schedule'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSchedule && (
                  <div className="text-center py-8 text-white/60">
                    <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-purple-400" />
                    Optimizing project schedule...
                  </div>
                )}
                {scheduleOptimization && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-lg">
                        <div className="text-sm text-white/60 mb-1">Predicted Completion</div>
                        <div className="text-white font-medium">
                          {scheduleOptimization.schedule_optimization?.predicted_completion_date ? 
                            new Date(scheduleOptimization.schedule_optimization.predicted_completion_date).toLocaleDateString() : 
                            'N/A'
                          }
                        </div>
                      </div>
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="text-sm text-green-300 mb-1">Time Savings</div>
                        <div className="text-green-400 font-medium">
                          {scheduleOptimization.schedule_optimization?.time_savings_hours || 0}h
                        </div>
                      </div>
                    </div>

                    {scheduleOptimization.schedule_optimization?.critical_path?.length > 0 && (
                      <div>
                        <div className="text-white font-medium mb-2">Critical Path</div>
                        <div className="space-y-1">
                          {scheduleOptimization.schedule_optimization.critical_path.map((taskId, idx) => {
                            const task = tasks.find(t => t.id === taskId);
                            return (
                              <div key={idx} className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-sm text-orange-200">
                                {task?.title || taskId}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {scheduleOptimization.schedule_optimization?.efficiency_improvements?.length > 0 && (
                      <div>
                        <div className="text-white font-medium mb-2">Efficiency Improvements</div>
                        <div className="space-y-2">
                          {scheduleOptimization.schedule_optimization.efficiency_improvements.map((imp, idx) => (
                            <div key={idx} className="p-3 bg-purple-500/10 border border-purple-500/30 rounded text-sm text-purple-200">
                              • {imp}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto-Adjustment */}
            <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 backdrop-blur-xl border-green-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-400" />
                  AI Auto-Adjustment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-white/80 text-sm">
                  Let AI automatically optimize task priorities, assignments, and timelines based on risk analysis and schedule optimization.
                </p>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={() => autoAdjustMutation.mutate(false)}
                    disabled={autoAdjustMutation.isPending}
                    variant="outline"
                    className="flex-1"
                  >
                    Preview Adjustments
                  </Button>
                  <Button 
                    onClick={() => autoAdjustMutation.mutate(true)}
                    disabled={autoAdjustMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {autoAdjustMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply AI Adjustments'}
                  </Button>
                </div>

                {autoAdjustMutation.data && (
                  <div className="mt-4 space-y-3">
                    {autoAdjustMutation.data.recommendations?.adjustments?.map((adj, idx) => (
                      <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-white text-sm">{adj.action}</div>
                          <Badge className={
                            adj.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            adj.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }>
                            {adj.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-white/60 mb-1">{adj.rationale}</p>
                        <p className="text-xs text-green-400">Impact: {adj.expected_impact}</p>
                      </div>
                    ))}
                    
                    {autoAdjustMutation.data.changes_applied && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded text-sm text-green-300">
                        ✓ {autoAdjustMutation.data.executed_changes?.length || 0} changes applied successfully
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardContent className="p-0">
                <div className="h-96 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => {
                    const sender = agents.find(a => a.id === msg.sender_agent_id);
                    return (
                      <div key={msg.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                          {sender?.name?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium text-sm">{sender?.name || 'Agent'}</span>
                            <span className="text-white/40 text-xs">
                              {new Date(msg.created_date).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-white/80 text-sm">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="border-t border-white/10 p-4">
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones" className="space-y-4">
            {project.milestones?.map((milestone, idx) => (
              <Card key={idx} className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => updateMilestoneMutation.mutate({
                          project_id: projectId,
                          milestone_index: idx,
                          completed: !milestone.completed
                        })}
                        className="mt-1"
                      >
                        {milestone.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/40" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{milestone.title}</h3>
                        <p className="text-white/60 text-sm mt-1">{milestone.description}</p>
                        {milestone.target_date && (
                          <p className="text-white/40 text-xs mt-2">
                            Target: {new Date(milestone.target_date).toLocaleDateString()}
                          </p>
                        )}
                        {milestone.completed_date && (
                          <p className="text-green-400 text-xs mt-1">
                            Completed: {new Date(milestone.completed_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-4">
            {project.team_members?.map((member, idx) => {
              const agent = agents.find(a => a.id === member.agent_id);
              return (
                <Card key={idx} className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg">
                          {agent?.name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{agent?.name || 'Agent'}</h3>
                          <p className="text-white/60 text-sm">{member.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-medium">{member.contribution_percentage}%</div>
                        <div className="text-white/60 text-xs">Contribution</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}