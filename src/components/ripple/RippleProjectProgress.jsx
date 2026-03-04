import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2, Clock, AlertCircle, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  review: { label: 'In Review', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const PRIORITY_CONFIG = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

export default function RippleProjectProgress({ project, tasks }) {
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Target className="w-6 h-6 text-blue-200" />
                <h2 className="text-xl font-bold">{project?.title || 'Ripple Dashboard Development'}</h2>
                <Badge className="bg-white/20 text-white border-white/30 text-xs">{project?.status || 'planning'}</Badge>
              </div>
              <p className="text-blue-100 text-sm mb-4 max-w-2xl">{project?.description}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <p className="text-blue-200 text-xs">Start Date</p>
                  <p className="font-semibold">{project?.start_date ? format(new Date(project.start_date), 'dd MMM yyyy') : '3 Mar 2026'}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Target Completion</p>
                  <p className="font-semibold">{project?.target_completion_date ? format(new Date(project.target_completion_date), 'dd MMM yyyy') : '31 Mar 2026'}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Total Est. Hours</p>
                  <p className="font-semibold">{totalHours}h</p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Priority</p>
                  <p className="font-semibold capitalize">{project?.priority || 'High'}</p>
                </div>
              </div>
            </div>
            <div className="text-center bg-white/10 rounded-2xl p-5 min-w-[110px]">
              <p className="text-4xl font-bold">{progress}%</p>
              <p className="text-blue-200 text-xs mt-1">Complete</p>
              <p className="text-white text-xs mt-1">{completedTasks}/{totalTasks} tasks</p>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2 bg-blue-800" />
        </CardContent>
      </Card>

      {/* Task Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border-gray-200 text-center">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-gray-900">{tasks.filter(t => t.status === 'todo').length}</p>
            <p className="text-xs text-gray-500 mt-1">To Do</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-blue-200 text-center">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
            <p className="text-xs text-gray-500 mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-green-200 text-center">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
            <p className="text-xs text-gray-500 mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card className="bg-white border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            All Project Tasks ({totalTasks})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.map(task => {
              const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
              const StatusIcon = statusConf.icon;
              return (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${task.status === 'completed' ? 'text-green-500' : task.status === 'in_progress' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-xs ${PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium}`}>{task.priority}</Badge>
                        <Badge className={`text-xs ${statusConf.color}`}>{statusConf.label}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {task.estimated_hours && <span>⏱ {task.estimated_hours}h estimated</span>}
                      {task.task_type && <span className="capitalize">📋 {task.task_type}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      {project?.milestones?.length > 0 && (
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.milestones.map((milestone, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${milestone.completed ? 'bg-green-500' : 'bg-gray-200'}`}>
                    {milestone.completed ? <CheckCircle2 className="w-3 h-3 text-white" /> : <span className="text-xs text-gray-500 font-bold">{i + 1}</span>}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${milestone.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{milestone.title}</p>
                    <p className="text-xs text-gray-500">{milestone.description}</p>
                    {milestone.target_date && (
                      <p className="text-xs text-blue-500 mt-0.5">Target: {format(new Date(milestone.target_date), 'dd MMM yyyy')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}