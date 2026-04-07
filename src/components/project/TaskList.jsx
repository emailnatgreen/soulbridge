import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, CheckCircle2, Clock, AlertCircle, Trash2, Edit, Loader } from 'lucide-react';

const statusColor = {
  todo: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  review: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  blocked: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const priorityColor = {
  low: 'text-gray-400',
  medium: 'text-blue-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export default function TaskList({ projectId, agents = [] }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assigned_agent_id: '', priority: 'medium', due_date: '', reward_drops: '' });

  // Fetch project tasks
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return base44.entities.ProjectTask?.filter?.(
        { project_id: projectId },
        '-created_date',
        100
      ) || [];
    },
    staleTime: 10000,
    enabled: !!projectId,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      const payload = {
        project_id: projectId,
        title: taskData.title,
        description: taskData.description,
        assigned_agent_id: taskData.assigned_agent_id || undefined,
        priority: taskData.priority,
      };
      if (taskData.due_date) payload.due_date = taskData.due_date;
      if (taskData.reward_drops) payload.reward_drops = Number(taskData.reward_drops) * 1000000;
      return base44.entities.ProjectTask.create(payload);
    },
    onSuccess: () => {
      setNewTask({ title: '', description: '', assigned_agent_id: '', priority: 'medium', due_date: '', reward_drops: '' });
      setShowCreateForm(false);
      refetch();
      syncProjectProgress();
    },
  });

  // Update task mutation (for status changes)
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }) => {
      const updates = { status };
      if (status === 'completed') updates.completed_date = new Date().toISOString();
      return base44.entities.ProjectTask.update(taskId, updates);
    },
    onSuccess: () => {
      refetch();
      syncProjectProgress();
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      return base44.entities.ProjectTask.delete(taskId);
    },
    onSuccess: () => {
      refetch();
      syncProjectProgress();
    },
  });

  // Sync progress back to AIProject entity
  const syncProjectProgress = async () => {
    const currentTasks = await base44.entities.ProjectTask.filter({ project_id: projectId }, '-created_date', 500);
    const total = currentTasks.length;
    const completed = currentTasks.filter(t => t.status === 'completed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    await base44.entities.AIProject.update(projectId, { progress_percentage: pct });
  };

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      alert('Task title is required');
      return;
    }
    createTaskMutation.mutate(newTask);
  };

  const handleStatusChange = (taskId, newStatus) => {
    updateTaskMutation.mutate({ taskId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Tasks ({tasks.length})</h3>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white h-7 gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task
        </Button>
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="bg-white/5 border border-blue-500/30 rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
          />
          
          <textarea
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            placeholder="Task description..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50 resize-none h-20"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={newTask.assigned_agent_id}
              onChange={(e) => setNewTask({ ...newTask, assigned_agent_id: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50"
            >
              <option value="">Assign to...</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>

            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Due Date</label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Reward (XRP)</label>
              <input
                type="number"
                value={newTask.reward_drops}
                onChange={(e) => setNewTask({ ...newTask, reward_drops: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.001"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending}
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
            >
              Create Task
            </Button>
            <Button
              onClick={() => setShowCreateForm(false)}
              variant="outline"
              size="sm"
              className="flex-1 border-white/20 text-white text-xs hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 text-center">
          <AlertCircle className="w-5 h-5 text-white/30 mx-auto mb-2" />
          <p className="text-white/50 text-xs">No tasks yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const assignedAgent = agents.find(a => a.id === task.assigned_agent_id);
            return (
              <div
                key={task.id}
                className="bg-white/5 border border-white/10 rounded-lg p-3.5 space-y-2 hover:bg-white/10 transition"
              >
                {/* Task Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm">{task.title}</h4>
                    {task.description && (
                      <p className="text-white/40 text-xs mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  <Badge className={statusColor[task.status] || statusColor.todo}>
                    {task.status}
                  </Badge>
                </div>

                {/* Task Meta */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-white/60">
                  {task.priority && (
                    <span className={`font-semibold ${priorityColor[task.priority] || 'text-white'}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {task.estimated_hours && (
                    <span>{task.estimated_hours}h est.</span>
                  )}
                  {task.reward_drops && (
                    <span className="text-amber-400">{(task.reward_drops / 1000000).toFixed(2)} XRP</span>
                  )}
                </div>

                {/* Assigned Agent with DID Signal */}
                {assignedAgent && (
                  <div className="bg-white/5 rounded-lg p-2.5 flex items-center gap-2">
                    {assignedAgent.avatar_url ? (
                      <img
                        src={assignedAgent.avatar_url}
                        alt={assignedAgent.name}
                        className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-300 text-[9px] font-bold">{assignedAgent.name?.[0] || '?'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-white text-xs font-medium truncate">{assignedAgent.name}</p>
                        {assignedAgent.wallet_id && (
                          <Shield className="w-3 h-3 text-green-400 flex-shrink-0" title="DID Published" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Actions */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                  {task.status !== 'completed' && (
                    <Button
                      onClick={() => handleStatusChange(task.id, task.status === 'in_progress' ? 'review' : 'in_progress')}
                      disabled={updateTaskMutation.isPending}
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-6"
                    >
                      {task.status === 'review' ? 'Mark Done' : 'Start Work'}
                    </Button>
                  )}
                  {task.status !== 'completed' && (
                    <Button
                      onClick={() => handleStatusChange(task.id, 'completed')}
                      disabled={updateTaskMutation.isPending}
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-[10px] text-green-400 hover:text-green-300 hover:bg-green-500/10 h-6"
                    >
                      Complete
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteTaskMutation.mutate(task.id)}
                    disabled={deleteTaskMutation.isPending}
                    size="sm"
                    variant="ghost"
                    className="text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 w-6 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}