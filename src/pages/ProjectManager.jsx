import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ProjectCard from '@/components/project/ProjectCard';
import ProjectFilters from '@/components/project/ProjectFilters';
import ProjectDetailView from '@/components/project/ProjectDetailView';
import CreateProjectModal from '@/components/project/CreateProjectModal';
import { Plus, AlertCircle, Home, FolderKanban, RefreshCw } from 'lucide-react';

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

  const { data: projects = [], isLoading: projectsLoading, refetch } = useQuery({
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
  const completedCount = projects.filter(p => p.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* Header — matches DIDManager style */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-3 sm:px-6 py-2.5 sm:py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-xs sm:text-base truncate">Project Manager</h1>
              <p className="text-purple-400/60 text-[9px] sm:text-xs truncate">
                {projects.length} projects · {activeCount} active · {planningCount} planning
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/home"
              className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs border border-white/20 bg-white/5 text-white hover:bg-white/10 h-7 sm:h-8 px-2 sm:px-3 rounded-md transition-colors">
              <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Home</span>
            </Link>
            <Button size="sm" variant="outline" onClick={() => refetch()}
              className="text-[10px] sm:text-xs border-white/20 bg-white/5 text-white hover:bg-white/10 gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)}
              className="text-[10px] sm:text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">New Project</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Stats — matches DIDManager pattern */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Total Projects', value: projects.length },
            { label: 'Active', value: activeCount },
            { label: 'Planning', value: planningCount },
            { label: 'Completed', value: completedCount },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-base sm:text-xl font-bold text-white">{s.value}</p>
              <p className="text-[9px] sm:text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>

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

        {/* Results */}
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-xs">
            {enrichedProjects.length} of {projects.length} projects
          </span>
        </div>

        {/* Loading */}
        {projectsLoading && (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!projectsLoading && enrichedProjects.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">
            <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
            No projects match your filters. Try adjusting your search or filters.
          </div>
        )}

        {/* List view */}
        {!projectsLoading && viewMode === 'list' && enrichedProjects.length > 0 && (
          <div className="space-y-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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