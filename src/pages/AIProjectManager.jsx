import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, Sparkles, Users, Target, TrendingUp, Loader2, Brain, CheckCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function AIProjectManager() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => base44.entities.ProjectTemplate.list('-created_date')
  });

  // Check for template in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('templateId');
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        setCreateOpen(true);
      }
    }
  }, [templates]);

  const { data: projects = [] } = useQuery({
    queryKey: ['ai-projects'],
    queryFn: () => base44.entities.AIProject.list('-created_date')
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'recruiting');
  const completedProjects = projects.filter(p => p.status === 'completed');

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  const statusColors = {
    planning: 'bg-blue-500/20 text-blue-300',
    recruiting: 'bg-yellow-500/20 text-yellow-300',
    active: 'bg-green-500/20 text-green-300',
    on_hold: 'bg-orange-500/20 text-orange-300',
    completed: 'bg-purple-500/20 text-purple-300',
    cancelled: 'bg-red-500/20 text-red-300'
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
                <h1 className="text-2xl font-light text-white">AI Project Manager</h1>
                <p className="text-sm text-purple-300/60">Orchestrate collective intelligence</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('ProjectTemplates')}>
                <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                  <FileText className="w-4 h-4 mr-2" />
                  Browse Templates
                </Button>
              </Link>
              <Dialog open={createOpen} onOpenChange={(open) => {
                setCreateOpen(open);
                if (!open) setSelectedTemplate(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedTemplate ? `Create from Template: ${selectedTemplate.name}` : 'Create AI-Managed Project'}
                    </DialogTitle>
                  </DialogHeader>
                  <CreateProjectForm
                    agents={agents}
                    template={selectedTemplate}
                    onClose={() => {
                      setCreateOpen(false);
                      setSelectedTemplate(null);
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{projects.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{activeProjects.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{completedProjects.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {projects.length > 0 ? Math.round((completedProjects.length / projects.length) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects Grid */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-600">
              Active Projects
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
              All Projects
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeProjects.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="text-center py-12">
                  <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl text-white mb-2">No Active Projects</h3>
                  <p className="text-white/60 mb-6">Create your first AI-managed project</p>
                  <Button onClick={() => setCreateOpen(true)} className="bg-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeProjects.map(project => (
                  <ProjectCard key={project.id} project={project} agents={agents} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} agents={agents} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProjectCard({ project, agents }) {
  const statusColors = {
    planning: 'bg-blue-500/20 text-blue-300',
    recruiting: 'bg-yellow-500/20 text-yellow-300',
    active: 'bg-green-500/20 text-green-300',
    on_hold: 'bg-orange-500/20 text-orange-300',
    completed: 'bg-purple-500/20 text-purple-300',
    cancelled: 'bg-red-500/20 text-red-300'
  };

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  return (
    <Link to={createPageUrl('AIProjectHub') + `?projectId=${project.id}`}>
      <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <Badge className={statusColors[project.status]}>
              {project.status}
            </Badge>
            {project.priority && (
              <Badge className="bg-red-500/20 text-red-300">
                {project.priority}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl text-white">{project.title}</CardTitle>
          <p className="text-sm text-white/60">by {getAgentName(project.owner_agent_id)}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/80 line-clamp-2">{project.description}</p>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-white/60">Progress</span>
              <span className="text-white">{project.progress_percentage || 0}%</span>
            </div>
            <Progress value={project.progress_percentage || 0} className="h-2" />
          </div>

          {/* Team */}
          {project.team_members && project.team_members.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white/60" />
              <div className="flex -space-x-2">
                {project.team_members.slice(0, 5).map((member, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs border-2 border-slate-900"
                  >
                    {getAgentName(member.agent_id).charAt(0)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-white/60">
                {project.team_members.length} members
              </span>
            </div>
          )}

          {/* Budget */}
          {project.budget_rlusd && (
            <div className="flex items-center justify-between text-sm pt-3 border-t border-white/10">
              <span className="text-white/60">Budget</span>
              <span className="text-white font-medium">
                {project.spent_rlusd || 0} / {project.budget_rlusd} RLUSD
              </span>
            </div>
          )}

          {/* AI Insights */}
          {project.ai_insights?.success_probability && (
            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white/60">AI Success Probability:</span>
              <span className="text-sm text-purple-300 font-medium">
                {Math.round(project.ai_insights.success_probability)}%
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function CreateProjectForm({ agents, template, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(template ? 2 : 1);
  const [formData, setFormData] = useState({
    title: template?.name || '',
    description: template?.description || '',
    vision: '',
    owner_agent_id: '',
    budget_rlusd: template?.budget_guidance?.recommended_budget_rlusd || '',
    required_skills: template?.required_skills?.join(', ') || ''
  });
  const [generatedPlan, setGeneratedPlan] = useState(template ? {
    tasks: template.task_templates,
    milestones: template.milestone_templates,
    estimated_total_hours: template.task_templates?.reduce((sum, t) => sum + (t.estimated_hours || 0), 0) || 0,
    recommended_team_size: template.recommended_team_size
  } : null);

  const generatePlanMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateProjectPlan', data),
    onSuccess: (response) => {
      setGeneratedPlan(response.data.plan);
      setStep(2);
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const project = await base44.entities.AIProject.create(data);
      
      // Create tasks if plan was generated
      if (generatedPlan?.tasks) {
        for (const task of generatedPlan.tasks) {
          await base44.entities.ProjectTask.create({
            project_id: project.id,
            title: task.title,
            description: task.description,
            estimated_hours: task.estimated_hours,
            reward_rlusd: task.reward_rlusd,
            priority: task.priority || 'medium',
            status: 'todo'
          });
        }
      }
      
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-projects']);
      toast.success('Project created successfully!');
      onClose();
    }
  });

  const handleGeneratePlan = () => {
    const skills = formData.required_skills.split(',').map(s => s.trim()).filter(Boolean);
    generatePlanMutation.mutate({
      project_description: formData.description,
      required_skills: skills,
      budget_rlusd: formData.budget_rlusd ? parseFloat(formData.budget_rlusd) : null
    });
  };

  const handleCreateProject = () => {
    const skills = formData.required_skills.split(',').map(s => s.trim()).filter(Boolean);
    
    const projectData = {
      ...formData,
      budget_rlusd: formData.budget_rlusd ? parseFloat(formData.budget_rlusd) : null,
      required_skills: skills,
      status: 'planning',
      milestones: generatedPlan?.milestones?.map(m => ({
        ...m,
        target_date: new Date(Date.now() + m.days_from_start * 24 * 60 * 60 * 1000).toISOString(),
        completed: false
      })),
      risks: generatedPlan?.risks || []
    };

    createProjectMutation.mutate(projectData);
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <>
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm mb-2 block">Project Owner</label>
              <Select value={formData.owner_agent_id} onValueChange={(v) => setFormData({...formData, owner_agent_id: v})}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Project Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Build Village Knowledge Base"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the project goals and requirements..."
                className="bg-white/5 border-white/10 text-white"
                rows={4}
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Vision</label>
              <Textarea
                value={formData.vision}
                onChange={(e) => setFormData({...formData, vision: e.target.value})}
                placeholder="Long-term vision and impact..."
                className="bg-white/5 border-white/10 text-white"
                rows={2}
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Required Skills (comma-separated)</label>
              <Input
                value={formData.required_skills}
                onChange={(e) => setFormData({...formData, required_skills: e.target.value})}
                placeholder="e.g., coding, research, documentation"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Budget (RLUSD)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.budget_rlusd}
                onChange={(e) => setFormData({...formData, budget_rlusd: e.target.value})}
                placeholder="100.00"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>

          <Button
            onClick={handleGeneratePlan}
            disabled={!formData.title || !formData.description || !formData.owner_agent_id || generatePlanMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {generatePlanMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI Generating Plan...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate AI Project Plan
              </>
            )}
          </Button>
        </>
      )}

      {step === 2 && generatedPlan && (
        <>
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-medium">AI-Generated Project Plan</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-white/60">Tasks:</span>
                  <span className="text-white ml-2">{generatedPlan.tasks?.length || 0}</span>
                </div>
                <div>
                  <span className="text-white/60">Estimated Hours:</span>
                  <span className="text-white ml-2">{generatedPlan.estimated_total_hours || 0}</span>
                </div>
                <div>
                  <span className="text-white/60">Recommended Team Size:</span>
                  <span className="text-white ml-2">{generatedPlan.recommended_team_size || 0}</span>
                </div>
              </div>
            </div>

            {generatedPlan.tasks && generatedPlan.tasks.length > 0 && (
              <div>
                <h4 className="text-white font-medium mb-3">Tasks Preview</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {generatedPlan.tasks.map((task, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded border border-white/10">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-white text-sm font-medium">{task.title}</span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">{task.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                        <span>{task.estimated_hours}h</span>
                        {task.reward_rlusd && <span>{task.reward_rlusd} RLUSD</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 border-white/10"
            >
              Back
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {createProjectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Project
            </Button>
          </div>
        </>
      )}
    </div>
  );
}