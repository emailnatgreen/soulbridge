import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ProjectCard from '@/components/project/ProjectCard';
import ProjectFilters from '@/components/project/ProjectFilters';
import ProjectDetailView from '@/components/project/ProjectDetailView';
import CreateProjectModal from '@/components/project/CreateProjectModal';
import { Plus, AlertCircle } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ProjectFilters Component */}
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
              enrichedProjects.map(project => {
                const ownerAgent = agents.find(a => a.id === project.owner_agent_id);
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    variant="list"
                    ownerAgent={ownerAgent}
                    onClick={() => setSelectedProjectId(project.id)}
                    onEdit={() => navigate(`/AIProjectHub?projectId=${project.id}`)}
                  />
                );
              })
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
              enrichedProjects.map(project => {
                const ownerAgent = agents.find(a => a.id === project.owner_agent_id);
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    variant="grid"
                    ownerAgent={ownerAgent}
                    onClick={() => setSelectedProjectId(project.id)}
                    onEdit={() => navigate(`/AIProjectHub?projectId=${project.id}`)}
                  />
                );
              })
            )}
          </div>
        )}

      </div>

      {/* Project Detail Modal */}
      {selectedProjectId && (
        <ProjectDetailView
          project={enrichedProjects.find(p => p.id === selectedProjectId)}
          ownerAgent={agents.find(a => a.id === enrichedProjects.find(p => p.id === selectedProjectId)?.owner_agent_id)}
          taskStats={enrichedProjects.find(p => p.id === selectedProjectId)?.taskStats}
          teamMembers={enrichedProjects.find(p => p.id === selectedProjectId)?.teamMembers || []}
          onClose={() => setSelectedProjectId(null)}
          onEdit={() => {
            navigate(`/AIProjectHub?projectId=${selectedProjectId}`);
            setSelectedProjectId(null);
          }}
        />
      )}

      {/* Create Project Modal */}
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