import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ProjectCard from '@/components/project/ProjectCard';
import ProjectFilters from '@/components/project/ProjectFilters';
import ProjectDetailView from '@/components/project/ProjectDetailView';
import CreateProjectModal from '@/components/project/CreateProjectModal';
import { Plus, AlertCircle, ArrowLeft, FolderKanban, Loader2 } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const activeCount = projects.filter(p => p.status === 'active').length;
  const planningCount = projects.filter(p => p.status === 'planning').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                to="/home"
                className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <div className="w-px h-6 bg-white/10 hidden sm:block" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-purple-400 shrink-0" />
                  <h1 className="text-lg sm:text-xl font-semibold text-white truncate">Project Manager</h1>
                </div>
                <p className="text-white/40 text-xs mt-0.5 hidden sm:block">
                  {projects.length} projects · {activeCount} active · {planningCount} planning
                </p>
              </div>
            </div>

            {/* Right: Stats badges + Create button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden md:flex items-center gap-1.5">
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]">
                  {activeCount} Active
                </Badge>
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 text-[10px]">
                  {planningCount} Planning
                </Badge>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Project</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Filters */}
        <ProjectFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          ownerFilter={ownerFilter}
          onOwnerChange={setOwnerFilter}
          agents={agents}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-xs sm:text-sm">
            Showing <span className="text-white font-medium">{enrichedProjects.length}</span> of {projects.length} projects
          </p>
        </div>

        {/* Loading */}
        {projectsLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!projectsLoading && enrichedProjects.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-white/40 text-sm mb-1">No projects match your filters</p>
            <p className="text-white/25 text-xs">Try adjusting your search or filters</p>
          </div>
        )}

        {/* List view */}
        {!projectsLoading && viewMode === 'list' && enrichedProjects.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            {enrichedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                variant="list"
                ownerAgent={agents.find(a => a.id === project.owner_agent_id)}
                onClick={() => setSelectedProjectId(project.id)}
                onEdit={() => navigate(`/AIProjectHub?projectId=${project.id}`)}
              />
            ))}
          </div>
        )}

        {/* Grid view */}
        {!projectsLoading && viewMode === 'grid' && enrichedProjects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {enrichedProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                variant="grid"
                ownerAgent={agents.find(a => a.id === project.owner_agent_id)}
                onClick={() => setSelectedProjectId(project.id)}
                onEdit={() => navigate(`/AIProjectHub?projectId=${project.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedProjectId && (() => {
        const selected = enrichedProjects.find(p => p.id === selectedProjectId);
        return selected ? (
          <ProjectDetailView
            project={selected}
            ownerAgent={agents.find(a => a.id === selected.owner_agent_id)}
            taskStats={selected.taskStats}
            teamMembers={selected.teamMembers || []}
            onClose={() => setSelectedProjectId(null)}
            onEdit={() => {
              navigate(`/AIProjectHub?projectId=${selectedProjectId}`);
              setSelectedProjectId(null);
            }}
          />
        ) : null;
      })()}

      {/* Create modal */}
      {showCreateModal && (
        <CreateProjectModal
          agents={agents}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}