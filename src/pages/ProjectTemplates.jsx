import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Sparkles, Search, TrendingUp, Users, Clock, DollarSign, Target, Lightbulb, AlertTriangle, Loader2, FileText, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function ProjectTemplates() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['project-templates'],
    queryFn: () => base44.entities.ProjectTemplate.list('-created_date')
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: templates.length,
    mostUsed: templates.sort((a, b) => (b.use_count || 0) - (a.use_count || 0))[0],
    avgSuccessRate: templates.length > 0 
      ? templates.reduce((sum, t) => sum + (t.success_rate || 0), 0) / templates.length 
      : 0
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
                <h1 className="text-2xl font-light text-white">AI Project Templates</h1>
                <p className="text-sm text-purple-300/60">Accelerate project creation with proven patterns</p>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Template
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Generate AI Project Template</DialogTitle>
                </DialogHeader>
                <GenerateTemplateForm
                  agents={agents}
                  onClose={() => setCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Most Popular</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg text-white truncate">
                {stats.mostUsed?.name || 'N/A'}
              </div>
              <div className="text-sm text-white/60">
                {stats.mostUsed?.use_count || 0} uses
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Avg Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {Math.round(stats.avgSuccessRate)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="community">Community</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="governance">Governance</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl text-white mb-2">No Templates Yet</h3>
              <p className="text-white/60 mb-6">Generate your first AI project template</p>
              <Button onClick={() => setCreateOpen(true)} className="bg-purple-600">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Detail Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <TemplateDetail template={selectedTemplate} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TemplateCard({ template, onClick }) {
  const categoryColors = {
    development: 'bg-blue-500/20 text-blue-300',
    research: 'bg-purple-500/20 text-purple-300',
    community: 'bg-green-500/20 text-green-300',
    infrastructure: 'bg-orange-500/20 text-orange-300',
    creative: 'bg-pink-500/20 text-pink-300',
    governance: 'bg-indigo-500/20 text-indigo-300',
    education: 'bg-yellow-500/20 text-yellow-300',
    other: 'bg-gray-500/20 text-gray-300'
  };

  const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-300',
    intermediate: 'bg-yellow-500/20 text-yellow-300',
    advanced: 'bg-orange-500/20 text-orange-300',
    expert: 'bg-red-500/20 text-red-300'
  };

  return (
    <Card 
      className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={categoryColors[template.category]}>
              {template.category}
            </Badge>
            <Badge className={difficultyColors[template.difficulty_level]}>
              {template.difficulty_level}
            </Badge>
            {template.is_ai_generated && (
              <Badge className="bg-purple-500/20 text-purple-300">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Generated
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-xl text-white">{template.name}</CardTitle>
        <CardDescription className="text-white/60">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/60" />
            <span className="text-white/80">{template.estimated_duration_days || 0} days</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/60" />
            <span className="text-white/80">{template.recommended_team_size || 0} team</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-white/60" />
            <span className="text-white/80">{template.milestone_templates?.length || 0} milestones</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/60" />
            <span className="text-white/80">{template.use_count || 0} uses</span>
          </div>
        </div>

        {template.success_rate > 0 && (
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Success Rate</span>
              <span className="text-green-400 font-medium">{template.success_rate}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TemplateDetail({ template }) {
  const queryClient = useQueryClient();

  const useTemplateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ProjectTemplate.update(template.id, {
        use_count: (template.use_count || 0) + 1
      });
      
      // Navigate to project creation with template
      window.location.href = createPageUrl('AIProjectManager') + `?templateId=${template.id}`;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['project-templates']);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{template.name}</h2>
        <p className="text-white/70">{template.description}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-white/60">Duration</span>
            </div>
            <div className="text-lg font-bold text-white">{template.estimated_duration_days} days</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-xs text-white/60">Team Size</span>
            </div>
            <div className="text-lg font-bold text-white">{template.recommended_team_size}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-white/60">Milestones</span>
            </div>
            <div className="text-lg font-bold text-white">{template.milestone_templates?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-white/60">Success Rate</span>
            </div>
            <div className="text-lg font-bold text-white">{template.success_rate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="milestones" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="guidance">Guidance</TabsTrigger>
        </TabsList>

        <TabsContent value="milestones" className="space-y-3">
          {template.milestone_templates?.map((milestone, idx) => (
            <Card key={idx} className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white">{milestone.title}</CardTitle>
                <p className="text-xs text-white/60">Day {milestone.days_from_start}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/70 mb-2">{milestone.description}</p>
                {milestone.deliverables && (
                  <div className="flex flex-wrap gap-2">
                    {milestone.deliverables.map((d, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-2">
          {template.task_templates?.map((task, idx) => (
            <Card key={idx} className="bg-white/5 border-white/10">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{task.title}</h4>
                  <Badge className="bg-blue-500/20 text-blue-300">{task.estimated_hours}h</Badge>
                </div>
                <p className="text-xs text-white/60 mb-2">{task.description}</p>
                <div className="flex items-center gap-2 text-xs">
                  <Badge className="bg-purple-500/20 text-purple-300">{task.priority}</Badge>
                  {task.phase && <Badge variant="outline">{task.phase}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="skills">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {template.required_skills?.map((skill, idx) => (
                  <Badge key={idx} className="bg-green-500/20 text-green-300">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guidance" className="space-y-4">
          {template.best_practices && template.best_practices.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <CardTitle className="text-white">Best Practices</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {template.best_practices.map((practice, idx) => (
                    <li key={idx} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      <span>{practice}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {template.common_pitfalls && template.common_pitfalls.length > 0 && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <CardTitle className="text-white">Common Pitfalls</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {template.common_pitfalls.map((pitfall, idx) => (
                    <li key={idx} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="text-orange-400 mt-1">⚠</span>
                      <span>{pitfall}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {template.budget_guidance && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <CardTitle className="text-white">Budget Guidance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>Minimum:</span>
                  <span className="text-white">{template.budget_guidance.min_budget_rlusd} RLUSD</span>
                </div>
                <div className="flex justify-between">
                  <span>Recommended:</span>
                  <span className="text-white font-medium">{template.budget_guidance.recommended_budget_rlusd} RLUSD</span>
                </div>
                <div className="flex justify-between">
                  <span>Maximum:</span>
                  <span className="text-white">{template.budget_guidance.max_budget_rlusd} RLUSD</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Button
        onClick={() => useTemplateMutation.mutate()}
        disabled={useTemplateMutation.isPending}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
      >
        <Rocket className="w-4 h-4 mr-2" />
        Use This Template
      </Button>
    </div>
  );
}

function GenerateTemplateForm({ agents, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    project_type: '',
    category: 'development',
    difficulty_level: 'intermediate',
    team_size: 3,
    duration_days: 30,
    budget_range: ''
  });

  const generateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateProjectTemplate', data),
    onSuccess: async (response) => {
      const template = response.data.template;
      
      // Save to database
      await base44.entities.ProjectTemplate.create(template);
      
      queryClient.invalidateQueries(['project-templates']);
      toast.success('Template generated successfully!');
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-white text-sm mb-2 block">Project Type</label>
        <Input
          value={formData.project_type}
          onChange={(e) => setFormData({...formData, project_type: e.target.value})}
          placeholder="e.g., Mobile App Development, Research Study, Community Event"
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white text-sm mb-2 block">Category</label>
          <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="research">Research</SelectItem>
              <SelectItem value="community">Community</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
              <SelectItem value="governance">Governance</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Difficulty</label>
          <Select value={formData.difficulty_level} onValueChange={(v) => setFormData({...formData, difficulty_level: v})}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10">
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white text-sm mb-2 block">Team Size</label>
          <Input
            type="number"
            value={formData.team_size}
            onChange={(e) => setFormData({...formData, team_size: parseInt(e.target.value)})}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div>
          <label className="text-white text-sm mb-2 block">Duration (days)</label>
          <Input
            type="number"
            value={formData.duration_days}
            onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value)})}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Budget Range (RLUSD) - Optional</label>
        <Input
          value={formData.budget_range}
          onChange={(e) => setFormData({...formData, budget_range: e.target.value})}
          placeholder="e.g., 100-500"
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <Button
        onClick={() => generateMutation.mutate(formData)}
        disabled={!formData.project_type || generateMutation.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI Generating Template...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Template
          </>
        )}
      </Button>
    </div>
  );
}