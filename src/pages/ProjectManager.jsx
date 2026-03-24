import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Search, Filter, Grid3x3, List, ChevronDown,
  TrendingUp, Users, Clock, AlertCircle, CheckCircle2
} from 'lucide-react';

// Helper: Enrich projects with aggregated task and collaboration data
const enrichProjects = (projects, tasks, collaborations, agents) => {
  return projects.map(project => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const collaborationQuality = collaborations.find(c => c.project_id === project.id);
    
    const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
    const totalTasks = projectTasks.length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const teamMembers = project.team_members?.map(tm => {
      const agent = agents.find(a => a.id === tm.agent_id);
      return { ...tm, agent };
    }) || [];

    return {
      ...project,
      taskStats: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: projectTasks.filter(t => t.status === 'in_progress').length,
        blocked: projectTasks.filter(t => t.status === 'blocked').length,
      },
      progressPercentage,
      collaborationQuality,
      teamMembers,
    };
  });
};

export default function ProjectManager() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, planning, completed, cancelled
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, low, medium, high, critical
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all required data
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['aiProjects'],
    queryFn: () => base44.entities.AIProject.list('-created_date', 100),
    staleTime: 10000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['projectTasks'],
    queryFn: () => base44.entities.ProjectTask.list('-created_date', 500),
    staleTime: 10000,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
    staleTime: 15000,
  });

  const { data: collaborations = [] } = useQuery({
    queryKey: ['collaborationQuality'],
    queryFn: () => base44.entities.CollaborationQuality?.list?.('-created_date', 100) || Promise.resolve([]),
    staleTime: 15000,
  });

  // Enrich and filter projects
  const enrichedProjects = useMemo(() => {
    const enriched = enrichProjects(projects, tasks, collaborations, agents);
    
    return enriched.filter(p => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || p.priority === priorityFilter;
      const matchesOwner = ownerFilter === 'all' || p.owner_agent_id === ownerFilter;
      const matchesSearch = searchQuery === '' || 
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesPriority && matchesOwner && matchesSearch;
    });
  }, [projects, tasks, collaborations, agents, statusFilter, priorityFilter, ownerFilter, searchQuery]);

  const uniqueOwners = useMemo(() => {
    return [...new Set(projects.map(p => p.owner_agent_id))].map(id => 
      agents.find(a => a.id === id)
    ).filter(Boolean);
  }, [projects, agents]);

  const statusOptions = ['all', 'planning', 'recruiting', 'active', 'on_hold', 'completed', 'cancelled'];
  const priorityOptions = ['all', 'low', 'medium', 'high', 'critical'];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Project Manager</h1>
            <p className="text-white/40 text-sm mt-0.5">Manage active projects, tasks, and team collaboration</p>
          </div>
          <Button
            onClick={() => navigate('/AIProjectHub')}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* FilterBar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-xs relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects by title or description..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
            >
              {statusOptions.map(s => (
                <option key={s} value={s} className="bg-slate-900">{s === 'all' ? 'All Status' : s}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
            >
              {priorityOptions.map(p => (
                <option key={p} value={p} className="bg-slate-900">{p === 'all' ? 'All Priority' : p}</option>
              ))}
            </select>

            {/* Owner Filter */}
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400/50 appearance-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Owners</option>
              {uniqueOwners.map(owner => (
                <option key={owner.id} value={owner.id} className="bg-slate-900">{owner.name}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition ${viewMode === 'list' ? 'bg-blue-500/30 text-blue-300' : 'text-white/40 hover:text-white'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition ${viewMode === 'grid' ? 'bg-blue-500/30 text-blue-300' : 'text-white/40 hover:text-white'}`}
                title="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active filters summary */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-white/60">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
            {statusFilter !== 'all' && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{statusFilter}</Badge>}
            {priorityFilter !== 'all' && <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">{priorityFilter}</Badge>}
            {ownerFilter !== 'all' && <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{agents.find(a => a.id === ownerFilter)?.name || 'Unknown'}</Badge>}
            {searchQuery && <Badge className="bg-green-500/20 text-green-300 border-green-500/30">"{searchQuery}"</Badge>}
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-white/60 text-sm">
            Showing <span className="font-semibold text-white">{enrichedProjects.length}</span> of <span className="font-semibold text-white">{projects.length}</span> projects
          </p>
        </div>

        {/* ProjectListView - List Mode */}
        {viewMode === 'list' && (
          <div className="space-y-3">
            {projectsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />)}</div>
            ) : enrichedProjects.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 text-white/30 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No projects match your filters.</p>
              </div>
            ) : (
              enrichedProjects.map(project => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/AIProjectHub?id=${project.id}`)}
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

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-xs text-white/60">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {project.teamMembers?.length || 0} members
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {project.taskStats.completed}/{project.taskStats.total} tasks
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {project.budget_drops ? (project.spent_drops / project.budget_drops * 100).toFixed(0) : 0}% spent
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ProjectListView - Grid Mode */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsLoading ? (
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : enrichedProjects.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <AlertCircle className="w-8 h-8 text-white/30 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No projects match your filters.</p>
              </div>
            ) : (
              enrichedProjects.map(project => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/AIProjectHub?id=${project.id}`)}
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

                  {/* Stats */}
                  <div className="text-xs text-white/60 space-y-1 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Team</span>
                      <span className="text-white">{project.teamMembers?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tasks</span>
                      <span className="text-white">{project.taskStats.completed}/{project.taskStats.total}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}