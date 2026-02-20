import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Target, Users, DollarSign, Clock, Award, BarChart3, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function ProjectAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['project-analytics'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getProjectAnalytics');
      return data.analytics;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  const projectStatusData = [
    { name: 'Active', value: analytics?.project_metrics.active_projects || 0, color: '#10b981' },
    { name: 'Completed', value: analytics?.project_metrics.completed_projects || 0, color: '#8b5cf6' },
    { name: 'Cancelled', value: analytics?.project_metrics.cancelled_projects || 0, color: '#ef4444' }
  ];

  const taskStatusData = [
    { name: 'Completed', value: analytics?.task_metrics.completed_tasks || 0, color: '#10b981' },
    { name: 'In Progress', value: analytics?.task_metrics.in_progress_tasks || 0, color: '#06b6d4' },
    { name: 'To Do', value: analytics?.task_metrics.todo_tasks || 0, color: '#f59e0b' },
    { name: 'Blocked', value: analytics?.task_metrics.blocked_tasks || 0, color: '#ef4444' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-light text-white">Project Analytics</h1>
              <p className="text-sm text-purple-300/60">Data-driven insights for continuous improvement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white/60">Total Projects</CardTitle>
                <Target className="w-4 h-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {analytics?.project_metrics.total_projects || 0}
              </div>
              <div className="text-sm text-green-400 mt-1">
                {analytics?.project_metrics.success_rate.toFixed(1)}% success rate
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white/60">Total Tasks</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {analytics?.task_metrics.total_tasks || 0}
              </div>
              <div className="text-sm text-blue-400 mt-1">
                {analytics?.task_metrics.completed_tasks || 0} completed
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white/60">Budget Usage</CardTitle>
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {analytics?.budget_analysis.utilization_rate.toFixed(1)}%
              </div>
              <div className="text-sm text-white/60 mt-1">
                {analytics?.budget_analysis.total_spent.toFixed(2)} / {analytics?.budget_analysis.total_allocated.toFixed(2)} RLUSD
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-white/60">Avg Completion</CardTitle>
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {analytics?.task_metrics.avg_task_completion_time.toFixed(1)}
              </div>
              <div className="text-sm text-white/60 mt-1">days per task</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-purple-600">
              Agent Performance
            </TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-purple-600">
              Skill Analysis
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-purple-600">
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Status */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Project Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={projectStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {projectStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Task Status */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Task Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={taskStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="name" stroke="#ffffff60" />
                      <YAxis stroke="#ffffff60" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff20' }}
                        labelStyle={{ color: '#ffffff' }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Budget Analysis */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Budget Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Total Allocated</span>
                    <span className="text-white font-medium">{analytics?.budget_analysis.total_allocated.toFixed(2)} RLUSD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Total Spent</span>
                    <span className="text-green-400 font-medium">{analytics?.budget_analysis.total_spent.toFixed(2)} RLUSD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Remaining</span>
                    <span className="text-blue-400 font-medium">{analytics?.budget_analysis.remaining.toFixed(2)} RLUSD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Avg per Project</span>
                    <span className="text-white font-medium">{analytics?.budget_analysis.avg_budget_per_project.toFixed(2)} RLUSD</span>
                  </div>
                  {analytics?.budget_analysis.projects_over_budget > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-300">
                        {analytics?.budget_analysis.projects_over_budget} projects over budget
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">30-Day Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.time_series || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="date" stroke="#ffffff60" />
                      <YAxis stroke="#ffffff60" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff20' }}
                        labelStyle={{ color: '#ffffff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="projects_created" stroke="#8b5cf6" name="Projects Created" />
                      <Line type="monotone" dataKey="tasks_completed" stroke="#10b981" name="Tasks Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Top Agent Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.agent_performance.slice(0, 10).map((agent, idx) => (
                    <div key={agent.agent_id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{agent.agent_name}</span>
                          <span className="text-xs text-white/60">{agent.role}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-blue-400">{agent.tasks_completed} tasks</span>
                          <span className="text-green-400">{agent.completion_rate.toFixed(1)}% rate</span>
                          <span className="text-purple-400">{agent.total_hours.toFixed(1)}h</span>
                          <span className="text-yellow-400">{agent.honor_score} honor</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white/60">Validated Skills</div>
                        <div className="text-lg font-bold text-white">{agent.validated_skills}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Skill Supply vs Demand</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics?.skill_utilization.slice(0, 15) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="skill" stroke="#ffffff60" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#ffffff60" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #ffffff20' }}
                      labelStyle={{ color: '#ffffff' }}
                    />
                    <Legend />
                    <Bar dataKey="demand" fill="#ec4899" name="Demand" />
                    <Bar dataKey="supply" fill="#10b981" name="Supply" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Skill Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.skill_utilization.slice(0, 10).map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-white mb-1">{skill.skill}</div>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <span>Demand: {skill.demand}</span>
                          <span>•</span>
                          <span>Supply: {skill.supply}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        skill.gap > 0 ? 'bg-red-500/20 text-red-400' : 
                        skill.gap < 0 ? 'bg-blue-500/20 text-blue-400' : 
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {skill.gap > 0 ? `+${skill.gap}` : skill.gap} gap
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.project_timeline.map((project) => (
                    <div key={project.project_id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium">{project.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          project.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/60">Progress</span>
                          <span className="text-white">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>Budget: {project.spent.toFixed(2)} / {project.budget.toFixed(2)} RLUSD</span>
                          {project.target_completion && (
                            <span>Target: {new Date(project.target_completion).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}