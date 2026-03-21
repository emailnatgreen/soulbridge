import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Zap, Users, TrendingUp, AlertCircle, CheckCircle2, Clock, Target, Network, Activity, Sparkles, Brain, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AgentOrchestration() {
  const [selectedProject, setSelectedProject] = useState('');
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState(null);

  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-orchestration'],
    queryFn: () => base44.entities.AIProject.list('-created_date', 50),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-orchestration'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks-orchestration'],
    queryFn: () => base44.entities.ProjectTask.list('-created_date', 200),
  });

  const orchestrateMutation = useMutation({
    mutationFn: async (projectId) => {
      const response = await base44.functions.invoke('orchestrateAgents', {
        project_id: projectId,
        orchestration_mode: 'auto'
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-tasks-orchestration'] });
      setOrchestrationResult(data);
      toast.success(`Successfully orchestrated ${data.tasks_created} tasks! 🎯`);
    },
    onError: (error) => {
      toast.error('Orchestration failed: ' + error.message);
    }
  });

  const handleOrchestrate = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    setOrchestrating(true);
    try {
      await orchestrateMutation.mutateAsync(selectedProject);
    } finally {
      setOrchestrating(false);
    }
  };

  // Agent performance metrics
  const agentMetrics = agents.map(agent => {
    const agentTasks = allTasks.filter(t => t.assigned_agent_id === agent.id);
    const completed = agentTasks.filter(t => t.status === 'completed').length;
    const inProgress = agentTasks.filter(t => t.status === 'in_progress').length;
    const todo = agentTasks.filter(t => t.status === 'todo').length;
    const blocked = agentTasks.filter(t => t.status === 'blocked').length;

    return {
      agent,
      totalTasks: agentTasks.length,
      completed,
      inProgress,
      todo,
      blocked,
      completionRate: agentTasks.length > 0 ? (completed / agentTasks.length * 100).toFixed(1) : 0,
      workload: inProgress + todo
    };
  }).sort((a, b) => b.totalTasks - a.totalTasks);

  // Project progress overview
  const projectProgress = projects.map(project => {
    const projectTasks = allTasks.filter(t => t.project_id === project.id);
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    const total = projectTasks.length;
    const progress = total > 0 ? (completed / total * 100) : 0;

    return {
      project,
      totalTasks: total,
      completed,
      progress: progress.toFixed(1)
    };
  }).filter(p => p.totalTasks > 0);

  // Overall system stats
  const systemStats = {
    totalAgents: agents.filter(a => a.status === 'active').length,
    totalProjects: projects.filter(p => p.status === 'active').length,
    totalTasks: allTasks.length,
    completedTasks: allTasks.filter(t => t.status === 'completed').length,
    activeTasks: allTasks.filter(t => t.status === 'in_progress').length,
    blockedTasks: allTasks.filter(t => t.status === 'blocked').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="text-indigo-300 hover:text-indigo-200 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Network className="w-10 h-10 text-indigo-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">AI Agent Orchestration</h1>
              <p className="text-indigo-200/70">Coordinate, manage, and optimize your agent workforce</p>
            </div>
          </div>
        </div>

        {/* System Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-300/70">Active Agents</p>
                  <p className="text-3xl font-bold text-white">{systemStats.totalAgents}</p>
                </div>
                <Users className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300/70">Active Projects</p>
                  <p className="text-3xl font-bold text-white">{systemStats.totalProjects}</p>
                </div>
                <Target className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300/70">Completed Tasks</p>
                  <p className="text-3xl font-bold text-white">{systemStats.completedTasks}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-300/70">In Progress</p>
                  <p className="text-3xl font-bold text-white">{systemStats.activeTasks}</p>
                </div>
                <Activity className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orchestrate" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex gap-1 h-auto w-fit">
            {[
              { value: 'orchestrate', label: 'Orchestrate', icon: Zap, gradient: 'from-indigo-600 to-purple-600' },
              { value: 'agents', label: 'Agent Performance', icon: Users, gradient: 'from-blue-500 to-cyan-500', count: agentMetrics.length },
              { value: 'projects', label: 'Project Progress', icon: Target, gradient: 'from-emerald-500 to-teal-600', count: projectProgress.length },
            ].map(({ value, label, icon: Icon, gradient, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  text-white/50 hover:text-white/80
                  data-[state=active]:bg-gradient-to-r data-[state=active]:${gradient}
                  data-[state=active]:text-white data-[state=active]:shadow-lg`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {count !== undefined && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-xs">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Orchestrate Tab */}
          <TabsContent value="orchestrate">
            <div className="grid gap-6">
              <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-2xl text-white flex items-center gap-2">
                    <Brain className="w-6 h-6 text-indigo-400" />
                    AI-Powered Task Orchestration
                  </CardTitle>
                  <CardDescription className="text-indigo-200/70">
                    Automatically assign tasks to optimal agents based on skills, workload, and project requirements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Select Project</label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue placeholder="Choose a project to orchestrate" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/20">
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id} className="text-white">
                            {project.title} ({project.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleOrchestrate}
                    disabled={orchestrating || !selectedProject}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    size="lg"
                  >
                    {orchestrating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Orchestrating Agents...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Orchestrate with AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Orchestration Result */}
              {orchestrationResult && (
                <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-400/30 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Orchestration Complete
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <h3 className="text-white font-semibold mb-2">Strategy</h3>
                      <p className="text-indigo-200/80 text-sm">{orchestrationResult.orchestration_plan?.strategy}</p>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-white font-semibold">Task Assignments ({orchestrationResult.tasks_created})</h3>
                      {orchestrationResult.assignments?.map((assignment, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{assignment.title}</h4>
                              <p className="text-indigo-200/70 text-sm mt-1">{assignment.description}</p>
                            </div>
                            <Badge className={`ml-2 ${
                              assignment.priority === 'critical' ? 'bg-red-500/20 text-red-200 border-red-400/30' :
                              assignment.priority === 'high' ? 'bg-orange-500/20 text-orange-200 border-orange-400/30' :
                              assignment.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30' :
                              'bg-green-500/20 text-green-200 border-green-400/30'
                            }`}>
                              {assignment.priority}
                            </Badge>
                          </div>
                          {assignment.rationale && (
                            <p className="text-indigo-300/60 text-xs mt-2 italic">💡 {assignment.rationale}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {orchestrationResult.orchestration_plan?.recommendations?.length > 0 && (
                      <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-400/30">
                        <h3 className="text-blue-200 font-semibold mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Recommendations
                        </h3>
                        <ul className="space-y-1">
                          {orchestrationResult.orchestration_plan.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-blue-200/80 text-sm">• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {orchestrationResult.orchestration_plan?.potential_bottlenecks?.length > 0 && (
                      <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-400/30">
                        <h3 className="text-orange-200 font-semibold mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Potential Bottlenecks
                        </h3>
                        <ul className="space-y-1">
                          {orchestrationResult.orchestration_plan.potential_bottlenecks.map((bottleneck, idx) => (
                            <li key={idx} className="text-orange-200/80 text-sm">• {bottleneck}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Agent Performance Tab */}
          <TabsContent value="agents">
            <div className="space-y-4">
              {agentMetrics.map(metric => (
                <Card key={metric.agent.id} className="bg-white/10 border-white/20 backdrop-blur-xl">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{metric.agent.name}</h3>
                        <p className="text-indigo-200/60 text-sm">{metric.agent.role} • {metric.agent.purpose}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
                          {metric.completionRate}% Complete
                        </Badge>
                        <span className="text-white/60 text-xs">Workload: {metric.workload}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{metric.totalTasks}</p>
                        <p className="text-xs text-white/60">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">{metric.completed}</p>
                        <p className="text-xs text-white/60">Done</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-400">{metric.inProgress}</p>
                        <p className="text-xs text-white/60">Active</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-400">{metric.blocked}</p>
                        <p className="text-xs text-white/60">Blocked</p>
                      </div>
                    </div>

                    <Progress value={parseFloat(metric.completionRate)} className="h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Project Progress Tab */}
          <TabsContent value="projects">
            <div className="space-y-4">
              {projectProgress.map(proj => (
                <Card key={proj.project.id} className="bg-white/10 border-white/20 backdrop-blur-xl">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg">{proj.project.title}</h3>
                        <p className="text-indigo-200/60 text-sm mt-1">{proj.project.description}</p>
                      </div>
                      <Badge className={`ml-2 ${
                        proj.project.status === 'active' ? 'bg-green-500/20 text-green-200 border-green-400/30' :
                        proj.project.status === 'completed' ? 'bg-blue-500/20 text-blue-200 border-blue-400/30' :
                        'bg-yellow-500/20 text-yellow-200 border-yellow-400/30'
                      }`}>
                        {proj.project.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/70">Progress</span>
                          <span className="text-white font-medium">{proj.completed}/{proj.totalTasks} tasks</span>
                        </div>
                        <Progress value={parseFloat(proj.progress)} className="h-2" />
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-indigo-400">{proj.progress}%</p>
                      </div>
                    </div>

                    {proj.project.priority && (
                      <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                        Priority: {proj.project.priority}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}