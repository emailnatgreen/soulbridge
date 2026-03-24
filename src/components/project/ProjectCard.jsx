import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield, Users, CheckCircle2, Coins, MoreVertical,
  Eye, Edit, TrendingUp
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

export default function ProjectCard({
  project,
  variant = 'list', // 'list' or 'grid'
  ownerAgent,
  onEdit,
  onClick
}) {
  const navigate = useNavigate();

  const budgetPercentage = project.budget_drops
    ? Math.round((project.spent_drops / project.budget_drops) * 100)
    : 0;

  // List view variant
  if (variant === 'list') {
    return (
      <div
        onClick={onClick}
        className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">{project.title}</h3>
            <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{project.description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge className={statusColor[project.status] || 'bg-gray-500/20'}>
              {project.status}
            </Badge>
            <span className={`text-xs font-semibold ${priorityColor[project.priority] || 'text-white'}`}>
              {project.priority}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Progress</span>
            <span className="text-white/80 font-semibold">{project.progressPercentage}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${project.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Owner with DID Signal */}
        <div className="mb-3 pb-3 border-b border-white/10">
          <p className="text-xs text-white/60 mb-1">Project Owner</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (ownerAgent?.id) navigate(`/AgentProfile?id=${ownerAgent.id}`);
            }}
            className="flex items-center gap-2 hover:opacity-80 transition"
          >
            {ownerAgent?.avatar_url ? (
              <img
                src={ownerAgent.avatar_url}
                alt={ownerAgent.name}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300 text-xs font-bold">{ownerAgent?.name?.[0] || '?'}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="text-white text-xs font-medium">{ownerAgent?.name || 'Unknown'}</span>
            </div>
            {ownerAgent?.wallet_id && (
              <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0" title="DID Published" />
            )}
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {project.taskStats.completed}/{project.taskStats.total} tasks
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {project.teamMembers?.length || 0} members
          </div>
          {project.budget_drops > 0 && (
            <div className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              {budgetPercentage}% budget
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="w-7 h-7 text-white/60 hover:text-white"
              title="View project"
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="w-7 h-7 text-white/60 hover:text-white"
              title="Edit project"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view variant
  return (
    <div
      onClick={onClick}
      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer flex flex-col"
    >
      <div className="mb-3">
        <h3 className="text-white font-semibold text-sm line-clamp-2">{project.title}</h3>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge className={statusColor[project.status] || 'bg-gray-500/20'}>
          {project.status}
        </Badge>
        <span className={`text-xs font-semibold ${priorityColor[project.priority] || 'text-white'}`}>
          {project.priority}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3 space-y-1 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/60">Progress</span>
          <span className="text-white/80 font-semibold">{project.progressPercentage}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
            style={{ width: `${project.progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Owner with DID Signal */}
      <div className="mb-3 pb-3 border-b border-white/10">
        <p className="text-xs text-white/60 mb-1">Owner</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (ownerAgent?.id) navigate(`/AgentProfile?id=${ownerAgent.id}`);
          }}
          className="flex items-center gap-2 hover:opacity-80 transition w-full"
        >
          {ownerAgent?.avatar_url ? (
            <img
              src={ownerAgent.avatar_url}
              alt={ownerAgent.name}
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-200 text-[10px] font-bold">{ownerAgent?.name?.[0] || '?'}</span>
            </div>
          )}
          <span className="text-white text-xs font-medium truncate flex-1">{ownerAgent?.name || 'Unknown'}</span>
          {ownerAgent?.wallet_id && (
            <Shield className="w-3 h-3 text-green-400 flex-shrink-0" title="DID Published" />
          )}
        </button>
      </div>

      {/* Team Avatars with DID Signal */}
      {project.teamMembers && project.teamMembers.length > 0 && (
        <div className="mb-3 pb-3 border-b border-white/10">
          <p className="text-xs text-white/60 mb-1.5">Team ({project.teamMembers.length})</p>
          <div className="flex items-center gap-1 flex-wrap">
            {project.teamMembers.slice(0, 5).map(tm => (
              <div key={tm.agent_id} className="relative group">
                {tm.agent?.avatar_url ? (
                  <img
                    src={tm.agent.avatar_url}
                    alt={tm.agent?.name}
                    className="w-6 h-6 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-400/30 flex items-center justify-center">
                    <span className="text-blue-300 text-[10px] font-bold">{tm.agent?.name?.[0] || '?'}</span>
                  </div>
                )}
                {tm.agent?.wallet_id && (
                  <Shield className="absolute -top-1 -right-1 w-2.5 h-2.5 text-green-400 bg-slate-900 rounded-full p-0.5" />
                )}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 border border-white/20 rounded-lg px-2 py-1 whitespace-nowrap z-10">
                  <p className="text-white text-xs font-medium">{tm.agent?.name || 'Unknown'}</p>
                  {tm.agent?.wallet_id && (
                    <p className="text-green-400 text-[10px]">DID: Published</p>
                  )}
                </div>
              </div>
            ))}
            {project.teamMembers.length > 5 && (
              <div className="text-xs text-white/60">+{project.teamMembers.length - 5}</div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-xs text-white/60 space-y-1 border-t border-white/10 pt-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tasks</span>
          <span className="text-white">{project.taskStats.completed}/{project.taskStats.total}</span>
        </div>
        {project.budget_drops > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Budget</span>
            <span className="text-white">{budgetPercentage}%</span>
          </div>
        )}
        <div className="flex items-center gap-1 pt-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="flex-1 h-6 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
          >
            <Eye className="w-3 h-3 mr-1" /> View
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="flex-1 h-6 text-[10px] text-white/60 hover:text-white hover:bg-white/10"
          >
            <Edit className="w-3 h-3 mr-1" /> Edit
          </Button>
        </div>
      </div>
    </div>
  );
}