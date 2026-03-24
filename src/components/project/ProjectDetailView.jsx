import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TaskList from './TaskList';
import {
  Shield, Users, CheckCircle2, Coins, Calendar, Target, 
  TrendingUp, AlertCircle, X, FileText, Lightbulb
} from 'lucide-react';

const statusColor = {
  planning: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  recruiting: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  on_hold: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const priorityColor = {
  low: 'text-gray-400',
  medium: 'text-blue-400',
  high: 'text-orange-400',
  critical: 'text-red-400',
};

export default function ProjectDetailView({
  project,
  ownerAgent,
  onClose,
  onEdit,
  taskStats = null,
  teamMembers = [],
}) {
  const budgetPercentage = project.budget_drops
    ? Math.round((project.spent_drops / project.budget_drops) * 100)
    : 0;

  const daysRemaining = project.target_completion_date
    ? Math.ceil((new Date(project.target_completion_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            title="Close"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>

          {/* Header Section */}
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-b border-white/10 p-6 space-y-4">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">{project.title}</h2>
                <p className="text-white/50 text-sm leading-relaxed">{project.description}</p>
              </div>
            </div>

            {/* Status & Priority Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColor[project.status] || 'bg-gray-500/20'}>
                {project.status}
              </Badge>
              <span className={`text-xs font-semibold ${priorityColor[project.priority] || 'text-white'}`}>
                {project.priority.toUpperCase()}
              </span>
              {daysRemaining !== null && (
                <Badge className={`${
                  daysRemaining < 0 ? 'bg-red-500/20 text-red-300' :
                  daysRemaining < 7 ? 'bg-orange-500/20 text-orange-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {daysRemaining < 0 ? `Overdue by ${Math.abs(daysRemaining)} days` : `${daysRemaining} days left`}
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">

            {/* Owner Card with DID Signal */}
            {ownerAgent && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-xs uppercase text-white/60 tracking-widest">Project Owner</p>
                <div className="flex items-center gap-3">
                  {ownerAgent.avatar_url ? (
                    <img
                      src={ownerAgent.avatar_url}
                      alt={ownerAgent.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-300 font-bold text-sm">{ownerAgent.name?.[0] || '?'}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{ownerAgent.name}</p>
                      {ownerAgent.wallet_id && (
                        <Shield className="w-4 h-4 text-green-400 flex-shrink-0" title="DID Published" />
                      )}
                    </div>
                    <p className="text-white/40 text-xs capitalize">{ownerAgent.role || 'Creator'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Vision Section */}
            {project.vision && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <p className="text-xs uppercase text-white/60 tracking-widest">Vision</p>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{project.vision}</p>
              </div>
            )}

            {/* Progress & Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Overall Progress */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs uppercase text-white/60">Progress</span>
                  </div>
                  <span className="text-green-400 font-semibold text-sm">{project.progressPercentage}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${project.progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Budget Usage */}
              {project.budget_drops > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span className="text-xs uppercase text-white/60">Budget</span>
                    </div>
                    <span className="text-amber-400 font-semibold text-sm">{budgetPercentage}%</span>
                  </div>
                  <div className="space-y-1 text-xs text-white/60">
                    <div className="flex justify-between">
                      <span>Spent:</span>
                      <span className="text-white">{(project.spent_drops / 1000000).toFixed(2)} XRP</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Budget:</span>
                      <span className="text-white">{(project.budget_drops / 1000000).toFixed(2)} XRP</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Summary */}
              {taskStats && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span className="text-xs uppercase text-white/60">Tasks</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-white/60">
                    <div>
                      <p className="text-white font-semibold">{taskStats.completed}/{taskStats.total}</p>
                      <p className="text-[10px]">Completed</p>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{taskStats.inProgress}</p>
                      <p className="text-[10px]">In Progress</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Size */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs uppercase text-white/60">Team</span>
                </div>
                <p className="text-white font-semibold text-lg">{teamMembers.length} members</p>
                {teamMembers.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {teamMembers.slice(0, 5).map((tm) => (
                      <div key={tm.agent_id} className="relative group">
                        {tm.agent?.avatar_url ? (
                          <img
                            src={tm.agent.avatar_url}
                            alt={tm.agent?.name}
                            className="w-6 h-6 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-400/30 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                            {tm.agent?.name?.[0] || '?'}
                          </div>
                        )}
                        {tm.agent?.wallet_id && (
                          <Shield className="absolute -top-1 -right-1 w-2.5 h-2.5 text-green-400 bg-slate-950 rounded-full p-0.5" />
                        )}
                      </div>
                    ))}
                    {teamMembers.length > 5 && (
                      <span className="text-xs text-white/60 ml-1">+{teamMembers.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span className="text-xs uppercase text-white/60 tracking-widest">Timeline</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {project.start_date && (
                  <div className="space-y-1">
                    <p className="text-white/60 text-xs">Started</p>
                    <p className="text-white font-medium">{new Date(project.start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {project.target_completion_date && (
                  <div className="space-y-1">
                    <p className="text-white/60 text-xs">Target</p>
                    <p className="text-white font-medium">{new Date(project.target_completion_date).toLocaleDateString()}</p>
                  </div>
                )}
                {project.actual_completion_date && (
                  <div className="space-y-1">
                    <p className="text-white/60 text-xs">Completed</p>
                    <p className="text-green-300 font-medium">{new Date(project.actual_completion_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Required */}
            {project.required_skills && project.required_skills.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-xs uppercase text-white/60 tracking-widest">Required Skills</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {project.required_skills.map((skill) => (
                    <Badge key={skill} className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Task Management */}
            <TaskList projectId={project.id} agents={teamMembers.map(tm => tm.agent).filter(Boolean)} />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t border-white/10">
              <Button
                onClick={onEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Edit Project
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}