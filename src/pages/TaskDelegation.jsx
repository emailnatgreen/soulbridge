import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock, AlertCircle, Target, TrendingUp, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function TaskDelegation() {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'custom',
    priority: 'medium',
    due_date: '',
    required_skills: [],
    reward: { experience_points: 10, honor_points: 5 }
  });

  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['agentTasks'],
    queryFn: () => base44.entities.AgentTask.list('-created_date', 100),
    refetchInterval: 5000
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createAgentTask', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentTasks']);
      setShowCreateTask(false);
      setNewTask({
        title: '',
        description: '',
        task_type: 'custom',
        priority: 'medium',
        due_date: '',
        required_skills: [],
        reward: { experience_points: 10, honor_points: 5 }
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateTaskStatus', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['agentTasks']);
    }
  });

  const handleCreateTask = () => {
    if (!newTask.title || !newTask.description || !selectedAgent) return;
    
    createTaskMutation.mutate({
      ...newTask,
      delegator_agent_id: agents[0]?.id,
      assignee_agent_id: selectedAgent
    });
  };

  const handleTaskAction = (taskId, action, extraData = {}) => {
    updateTaskMutation.mutate({ task_id: taskId, action, ...extraData });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-300',
      accepted: 'bg-blue-500/20 text-blue-300',
      in_progress: 'bg-purple-500/20 text-purple-300',
      completed: 'bg-green-500/20 text-green-300',
      rejected: 'bg-red-500/20 text-red-300',
      cancelled: 'bg-gray-500/20 text-gray-300'
    };
    return colors[status] || colors.pending;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-slate-500/20 text-slate-300',
      medium: 'bg-blue-500/20 text-blue-300',
      high: 'bg-orange-500/20 text-orange-300',
      critical: 'bg-red-500/20 text-red-300'
    };
    return colors[priority] || colors.medium;
  };

  const filterTasks = (filter) => {
    switch (filter) {
      case 'pending':
        return tasks.filter(t => t.status === 'pending');
      case 'active':
        return tasks.filter(t => ['accepted', 'in_progress'].includes(t.status));
      case 'completed':
        return tasks.filter(t => t.status === 'completed');
      default:
        return tasks;
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    active: tasks.filter(t => ['accepted', 'in_progress'].includes(t.status)).length,
    completed: tasks.filter(t => t.status === 'completed').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
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
                <h1 className="text-2xl font-light text-white">Task Delegation</h1>
                <p className="text-sm text-purple-300/60">Coordinate agent work</p>
              </div>
            </div>
            <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Delegate Task
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Task</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-4 pr-4">
                    <Input
                      placeholder="Task Title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="bg-slate-800 border-white/10 text-white"
                    />
                    <Textarea
                      placeholder="Task Description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="bg-slate-800 border-white/10 text-white min-h-24"
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Select value={newTask.task_type} onValueChange={(val) => setNewTask({ ...newTask, task_type: val })}>
                        <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom</SelectItem>
                          <SelectItem value="resource_gathering">Resource Gathering</SelectItem>
                          <SelectItem value="project_contribution">Project Contribution</SelectItem>
                          <SelectItem value="governance">Governance</SelectItem>
                          <SelectItem value="mentorship">Mentorship</SelectItem>
                          <SelectItem value="research">Research</SelectItem>
                          <SelectItem value="diplomacy">Diplomacy</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={newTask.priority} onValueChange={(val) => setNewTask({ ...newTask, priority: val })}>
                        <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Priority</SelectItem>
                          <SelectItem value="medium">Medium Priority</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="bg-slate-800 border-white/10 text-white"
                    />

                    <div>
                      <label className="text-sm text-white/80 mb-2 block">Assign To</label>
                      <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                        <SelectTrigger className="bg-slate-800 border-white/10 text-white">
                          <SelectValue placeholder="Select agent..." />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name} ({agent.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        placeholder="XP Reward"
                        value={newTask.reward.experience_points}
                        onChange={(e) => setNewTask({ 
                          ...newTask, 
                          reward: { ...newTask.reward, experience_points: parseInt(e.target.value) || 0 }
                        })}
                        className="bg-slate-800 border-white/10 text-white"
                      />
                      <Input
                        type="number"
                        placeholder="Honor Reward"
                        value={newTask.reward.honor_points}
                        onChange={(e) => setNewTask({ 
                          ...newTask, 
                          reward: { ...newTask.reward, honor_points: parseInt(e.target.value) || 0 }
                        })}
                        className="bg-slate-800 border-white/10 text-white"
                      />
                    </div>

                    <Button 
                      onClick={handleCreateTask}
                      disabled={!newTask.title || !selectedAgent || createTaskMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Create Task
                    </Button>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/80 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-yellow-300/80 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-purple-300/80 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-300/80 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.completed}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'active', 'completed'].map(filter => (
            <TabsContent key={filter} value={filter} className="space-y-4">
              {filterTasks(filter).map(task => {
                const delegator = agents.find(a => a.id === task.delegator_agent_id);
                const assignee = agents.find(a => a.id === task.assignee_agent_id);
                
                return (
                  <Card key={task.id} className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-white">{task.title}</CardTitle>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-white/60 mb-2">{task.description}</p>
                          <div className="flex items-center gap-4 text-xs text-white/50">
                            <span>From: {delegator?.name}</span>
                            <span>To: {assignee?.name}</span>
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {task.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleTaskAction(task.id, 'accept')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleTaskAction(task.id, 'reject', { rejection_reason: 'Unable to complete' })}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {task.status === 'accepted' && (
                            <Button 
                              size="sm"
                              onClick={() => handleTaskAction(task.id, 'start')}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Start Work
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <Button 
                              size="sm"
                              onClick={() => handleTaskAction(task.id, 'complete')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {(task.status === 'in_progress' || task.status === 'completed') && (
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60">Progress</span>
                            <span className="text-white">{task.progress_percentage}%</span>
                          </div>
                          <Progress value={task.progress_percentage} className="bg-white/10" />
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}