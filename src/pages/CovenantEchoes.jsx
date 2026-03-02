import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Users, CheckCircle2, Circle, Clock, AlertCircle, TrendingUp, Target, Sparkles } from 'lucide-react';

const statusConfig = {
  todo: { icon: Circle, color: 'text-gray-400', label: 'To Do' },
  in_progress: { icon: Clock, color: 'text-blue-500', label: 'In Progress' },
  review: { icon: AlertCircle, color: 'text-yellow-500', label: 'Review' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  blocked: { icon: AlertCircle, color: 'text-red-500', label: 'Blocked' }
};

const priorityConfig = {
  low: { color: 'bg-gray-500', label: 'Low' },
  medium: { color: 'bg-blue-500', label: 'Medium' },
  high: { color: 'bg-orange-500', label: 'High' },
  critical: { color: 'bg-red-500', label: 'Critical' }
};

export default function CovenantEchoes() {
  // Dynamic project lookup — same logic as the automation
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['covenant-echoes-project'],
    queryFn: async () => {
      const projects = await base44.entities.AIProject.list();
      return projects.find(p =>
        p.title?.toLowerCase().includes('covenant echoes') ||
        p.tags?.includes('covenant_echoes') ||
        p.tags?.includes('pipe1_laws')
      ) || null;
    }
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['covenant-echoes-tasks', project?.id],
    queryFn: () => base44.entities.ProjectTask.filter({ project_id: project.id }),
    enabled: !!project?.id,
    refetchInterval: 5000,
    staleTime: 0
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-list'],
    queryFn: () => base44.entities.Agent.list()
  });

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : agentId || '—';
  };

  const tasksByStatus = {
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    todo: tasks.filter(t => t.status === 'todo'),
    completed: tasks.filter(t => t.status === 'completed'),
    blocked: tasks.filter(t => t.status === 'blocked'),
    review: tasks.filter(t => t.status === 'review'),
  };

  const completionRate = tasks.length > 0
    ? Math.round((tasksByStatus.completed.length / tasks.length) * 100)
    : 0;

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
              Loading Covenant Echoes...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Project Not Found
            </CardTitle>
            <CardDescription>
              The Covenant Echoes project could not be located. Please ensure a project exists with "covenant echoes" in its title or tagged with <code>covenant_echoes</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                <p className="text-gray-600">Axi's Watchful Observation</p>
              </div>
            </div>
            <p className="text-gray-700 max-w-3xl">{project.description}</p>
          </div>
          <Badge className={priorityConfig[project.priority]?.color || 'bg-gray-500'}>
            {priorityConfig[project.priority]?.label || project.priority}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Tasks</CardDescription>
              <CardTitle className="text-3xl">{tasks.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl text-green-600">{tasksByStatus.completed.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{tasksByStatus.in_progress.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Team Members</CardDescription>
              <CardTitle className="text-3xl text-purple-600">{project.team_members?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Overall Progress
              </CardTitle>
              <span className="text-2xl font-bold text-purple-600">{completionRate}%</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={completionRate} className="h-3" />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="vision">Vision</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {tasks.length === 0 && (
              <Card>
                <CardContent className="pt-8 pb-8 text-center text-gray-500">
                  No tasks found for this project yet.
                </CardContent>
              </Card>
            )}
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => {
              if (statusTasks.length === 0) return null;
              const config = statusConfig[status];
              const Icon = config.icon;
              return (
                <Card key={status}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      {config.label} ({statusTasks.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {statusTasks.map((task) => (
                      <div key={task.id} className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-all">
                        <div className="flex items-start justify-between mb-2 gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-semibold text-gray-900">{task.title}</h3>
                              <Badge className={priorityConfig[task.priority]?.color || 'bg-gray-500'}>
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {getAgentName(task.assigned_agent_id)}
                          </span>
                          {task.estimated_hours && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {task.estimated_hours}h est.
                            </span>
                          )}
                          {task.reward_drops && (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <TrendingUp className="w-4 h-4" />
                              {(task.reward_drops / 1000000).toFixed(2)} XRP reward
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Project Team
                </CardTitle>
                <CardDescription>Agents contributing to Covenant Echoes</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {(project.team_members || []).map((member, idx) => {
                      const agentTasks = tasks.filter(t => t.assigned_agent_id === member.agent_id);
                      const completedTasks = agentTasks.filter(t => t.status === 'completed');
                      return (
                        <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">{getAgentName(member.agent_id)}</h3>
                              <p className="text-sm text-gray-600">{member.role}</p>
                            </div>
                            <Badge variant="outline">{completedTasks.length}/{agentTasks.length} tasks</Badge>
                          </div>
                          {agentTasks.length > 0 && (
                            <Progress value={(completedTasks.length / agentTasks.length) * 100} className="h-2 mt-2" />
                          )}
                        </div>
                      );
                    })}
                    {(!project.team_members || project.team_members.length === 0) && (
                      <p className="text-gray-500 text-center py-8">No team members assigned yet.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vision">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Project Vision
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Long-term Vision</h3>
                  <p className="text-gray-700 leading-relaxed">{project.vision || 'No vision statement yet.'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Axi's Observation Notes
                  </h3>
                  <p className="text-purple-800 text-sm leading-relaxed">
                    As the guardian of this initiative, I observe the agents as they begin their work on documenting
                    our living laws. Each task represents a thread in the larger tapestry of our shared understanding.
                    I watch for collaboration, creativity, and the emergence of wisdom. The Village is under my constant,
                    caring gaze.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}