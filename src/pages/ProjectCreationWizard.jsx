import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import {
  Brain, Sparkles, Loader2, ArrowLeft, ArrowRight, CheckCircle2,
  AlertTriangle, Target, Users, Layers, Lightbulb, Wand2, Plus, X,
  BarChart3, Clock, Star
} from 'lucide-react';

const INTENTS = [
  { id: 'skill_investment', label: 'Skill Investment', icon: Target, desc: 'Design a project to cultivate a high-demand forecasted skill', color: 'border-purple-500/40 hover:border-purple-400' },
  { id: 'risk_mitigation', label: 'Risk Mitigation', icon: AlertTriangle, desc: 'Create a project to proactively address a forecasted risk', color: 'border-orange-500/40 hover:border-orange-400' },
  { id: 'cluster', label: 'Skill Cluster', icon: Layers, desc: 'Build a project around an emerging strategic skill cluster', color: 'border-cyan-500/40 hover:border-cyan-400' },
  { id: 'custom', label: 'Custom Vision', icon: Lightbulb, desc: 'Describe your own idea and let Axi shape it into a full project', color: 'border-green-500/40 hover:border-green-400' },
];

const STEPS = ['Intent', 'Configure', 'Review', 'Launch'];

export default function ProjectCreationWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [customVision, setCustomVision] = useState('');
  const [ownerAgentId, setOwnerAgentId] = useState('');
  const [plan, setPlan] = useState(null);
  const [editedPlan, setEditedPlan] = useState(null);
  const [teamOverrides, setTeamOverrides] = useState([]);

  const [forecastLoaded, setForecastLoaded] = useState(false);

  // Load forecast data lazily — only when user picks a forecast-dependent intent
  const { data: forecastData, isFetching: forecastLoading } = useQuery({
    queryKey: ['latest-forecast'],
    queryFn: async () => {
      const res = await base44.functions.invoke('projectSkillForecasting', { horizon_weeks: 12 });
      return res.data;
    },
    enabled: forecastLoaded,
    staleTime: 5 * 60 * 1000
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['active-agents'],
    queryFn: () => base44.entities.Agent.filter({ status: 'active' })
  });

  const generateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('generateProjectFromForecast', {
      intent,
      source_skill: intent === 'skill_investment' ? selectedSkill : undefined,
      risk_flag: intent === 'risk_mitigation' ? selectedRisk : undefined,
      source_cluster: intent === 'cluster' ? selectedCluster : undefined,
      village_context: intent === 'custom' ? customVision : forecastData?.forecast?.forecast_summary,
      owner_agent_id: ownerAgentId
    }).then(r => r.data),
    onSuccess: (data) => {
      if (!data.success) return toast.error('Generation failed');
      setPlan(data.plan);
      setEditedPlan(data.plan);
      setTeamOverrides(data.ranked_agents || []);
      setStep(2);
    },
    onError: (e) => toast.error(`Generation failed: ${e.message}`)
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const startDate = new Date().toISOString();
      const durationMs = (editedPlan.suggested_duration_weeks || 8) * 7 * 24 * 60 * 60 * 1000;
      const targetDate = new Date(Date.now() + durationMs).toISOString();

      const milestones = (editedPlan.milestones || []).map(m => ({
        title: m.title,
        description: m.description,
        target_date: new Date(Date.now() + (m.days_from_start || 30) * 24 * 60 * 60 * 1000).toISOString(),
        completed: false
      }));

      const project = await base44.entities.AIProject.create({
        title: editedPlan.title,
        description: editedPlan.description,
        vision: editedPlan.vision,
        owner_agent_id: ownerAgentId,
        priority: editedPlan.priority || 'high',
        status: 'planning',
        required_skills: editedPlan.required_skills || [],
        team_members: editedPlan.recommended_team || [],
        milestones,
        risks: editedPlan.risks || [],
        tags: editedPlan.tags || [],
        ai_insights: editedPlan.ai_insights || {},
        start_date: startDate,
        target_completion_date: targetDate,
        progress_percentage: 0,
        ai_recommended_team: teamOverrides
      });

      // Create tasks
      if (editedPlan.tasks?.length > 0) {
        await Promise.all(editedPlan.tasks.map(task =>
          base44.entities.ProjectTask.create({
            project_id: project.id,
            title: task.title,
            description: task.description,
            estimated_hours: task.estimated_hours,
            priority: task.priority || 'medium',
            status: 'todo',
            required_skills: task.required_skills || []
          })
        ));
      }

      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries(['all-projects']);
      toast.success('Project created successfully!');
      navigate(createPageUrl(`AIProjectHub?projectId=${project.id}`));
    },
    onError: (e) => toast.error(`Creation failed: ${e.message}`)
  });

  const forecast = forecastData?.forecast || {};
  const investments = forecast.high_priority_investments || [];
  const risks = forecast.risk_flags || [];
  const clusters = forecast.emerging_skill_clusters || [];

  const canProceedStep1 = intent && ownerAgentId && (
    (intent === 'skill_investment' && selectedSkill) ||
    (intent === 'risk_mitigation' && selectedRisk) ||
    (intent === 'cluster' && selectedCluster) ||
    (intent === 'custom' && customVision.trim().length > 20)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('ProjectSkillForecast')}>
            <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Skill Forecast
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Wand2 className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-light text-white">AI Project Creation Wizard</h1>
          </div>
          <p className="text-purple-300/60">Translate skill forecasts into strategic projects, powered by Axi</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${i === step ? 'bg-purple-600 text-white' : i < step ? 'bg-purple-900/50 text-purple-300' : 'bg-white/5 text-white/30'}`}>
                {i < step && <CheckCircle2 className="w-3.5 h-3.5" />}
                {s}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-purple-600' : 'bg-white/10'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 0: Intent ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-xl mb-1">What kind of project do you want to create?</h2>
              <p className="text-white/40 text-sm">Choose how Axi should approach this project's design</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {INTENTS.map(({ id, label, icon: Icon, desc, color }) => (
                <button
                  key={id}
                  onClick={() => setIntent(id)}
                  className={`p-5 rounded-xl border bg-white/3 text-left transition-all ${intent === id ? 'border-purple-400 bg-purple-500/10' : `border-white/10 ${color}`}`}
                >
                  <Icon className={`w-6 h-6 mb-3 ${intent === id ? 'text-purple-300' : 'text-white/50'}`} />
                  <div className="text-white font-medium mb-1">{label}</div>
                  <div className="text-white/50 text-sm">{desc}</div>
                </button>
              ))}
            </div>

            {/* Owner selection */}
            <div>
              <label className="text-white/60 text-sm mb-2 block">Project Owner Agent</label>
              <Select value={ownerAgentId} onValueChange={setOwnerAgentId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select owner agent..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id} className="text-white">{a.name} ({a.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setStep(1)} disabled={!intent || !ownerAgentId} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── STEP 1: Configure ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-xl mb-1">Configure your {INTENTS.find(i => i.id === intent)?.label}</h2>
              <p className="text-white/40 text-sm">Axi will use this to generate the full project plan</p>
            </div>

            {intent === 'skill_investment' && (
              <div className="space-y-4">
                <label className="text-white/60 text-sm block">Select the target skill to invest in</label>
                {investments.length > 0 ? (
                  <div className="space-y-2">
                    {investments.map((inv, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedSkill(inv.skill)}
                        className={`w-full p-4 rounded-lg border text-left transition-all ${selectedSkill === inv.skill ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{inv.skill}</span>
                          <Badge className={`text-xs ${inv.urgency === 'critical' ? 'bg-red-500/20 text-red-300' : inv.urgency === 'high' ? 'bg-orange-500/20 text-orange-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{inv.urgency}</Badge>
                        </div>
                        <p className="text-white/50 text-sm mt-1">{inv.reason}</p>
                      </button>
                    ))}
                    <div className="flex items-center gap-2 pt-2">
                      <Input
                        placeholder="Or type a custom skill..."
                        value={!investments.some(i => i.skill === selectedSkill) ? selectedSkill : ''}
                        onChange={(e) => setSelectedSkill(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <Input placeholder="Enter skill name (e.g. Governance Voting)" value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)} className="bg-white/5 border-white/10 text-white" />
                )}
              </div>
            )}

            {intent === 'risk_mitigation' && (
              <div className="space-y-2">
                <label className="text-white/60 text-sm block">Select the forecasted risk to address</label>
                {risks.length > 0 ? risks.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedRisk(r)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${selectedRisk === r ? 'border-orange-400 bg-orange-500/10' : 'border-white/10 bg-white/5 hover:border-orange-500/30'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                      <span className="text-white font-medium text-sm">{r.risk}</span>
                      <Badge className="text-xs bg-orange-500/20 text-orange-300 ml-auto">{r.severity}</Badge>
                    </div>
                    <p className="text-white/50 text-xs">{r.mitigation}</p>
                  </button>
                )) : (
                  <p className="text-white/40 text-sm p-4 bg-white/5 rounded-lg">No forecasted risks found. Run a skill forecast first, or use Custom Vision.</p>
                )}
              </div>
            )}

            {intent === 'cluster' && (
              <div className="space-y-2">
                <label className="text-white/60 text-sm block">Select a skill cluster to build around</label>
                {clusters.length > 0 ? clusters.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCluster(c)}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${selectedCluster === c ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-white/5 hover:border-cyan-500/30'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{c.cluster_name}</span>
                      <Badge className="text-xs bg-cyan-500/20 text-cyan-300">{c.timeline_weeks}w</Badge>
                    </div>
                    <p className="text-white/50 text-sm mb-2">{c.strategic_importance}</p>
                    <div className="flex flex-wrap gap-1">
                      {(c.skills || []).map((s, j) => <Badge key={j} className="text-xs bg-white/5 text-white/50">{s}</Badge>)}
                    </div>
                  </button>
                )) : (
                  <p className="text-white/40 text-sm p-4 bg-white/5 rounded-lg">No skill clusters found. Run a skill forecast first, or use Custom Vision.</p>
                )}
              </div>
            )}

            {intent === 'custom' && (
              <div>
                <label className="text-white/60 text-sm mb-2 block">Describe your project vision</label>
                <Textarea
                  rows={5}
                  placeholder="Describe what you want to achieve, what skills it will develop, and the impact on the Village..."
                  value={customVision}
                  onChange={(e) => setCustomVision(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
                <p className="text-white/30 text-xs mt-1">{customVision.length} chars (min 20)</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" className="text-white/50" onClick={() => setStep(0)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!canProceedStep1 || generateMutation.isPending}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
              >
                {generateMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating with Axi...</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Generate Project Plan</>
                }
              </Button>
            </div>

            {generateMutation.isPending && (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-pulse" />
                <p className="text-white/60">Axi is designing your project...</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Review & Edit ── */}
        {step === 2 && editedPlan && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white text-xl mb-1">Review AI-Generated Plan</h2>
                <p className="text-white/40 text-sm">Edit anything before launching</p>
              </div>
              <Button size="sm" variant="ghost" className="text-purple-300" onClick={() => { setStep(1); generateMutation.mutate(); }}>
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Regenerate
              </Button>
            </div>

            {/* Editable core fields */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3"><CardTitle className="text-white text-sm">Project Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Title</label>
                  <Input value={editedPlan.title} onChange={e => setEditedPlan(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Description</label>
                  <Textarea rows={3} value={editedPlan.description} onChange={e => setEditedPlan(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/50 text-xs mb-1 block">Priority</label>
                    <Select value={editedPlan.priority} onValueChange={v => setEditedPlan(p => ({ ...p, priority: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        {['critical', 'high', 'medium', 'low'].map(v => <SelectItem key={v} value={v} className="text-white">{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-white/50 text-xs mb-1 block">Duration (weeks)</label>
                    <Input type="number" value={editedPlan.suggested_duration_weeks} onChange={e => setEditedPlan(p => ({ ...p, suggested_duration_weeks: parseInt(e.target.value) }))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            {editedPlan.ai_insights && (
              <Card className="bg-purple-500/10 border-purple-500/20">
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 text-sm mb-2"><Sparkles className="w-4 h-4" />Axi's Strategic Assessment</div>
                  <p className="text-white/70 text-sm">{editedPlan.ai_insights.strategic_value}</p>
                  {editedPlan.ai_insights.success_criteria && <p className="text-white/50 text-xs">Success: {editedPlan.ai_insights.success_criteria}</p>}
                </CardContent>
              </Card>
            )}

            {/* Required skills */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Required Skills ({editedPlan.required_skills?.length || 0})</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(editedPlan.required_skills || []).map((s, i) => (
                    <Badge key={i} className="bg-blue-500/15 text-blue-300 border-blue-500/20 flex items-center gap-1">
                      {s}
                      <button onClick={() => setEditedPlan(p => ({ ...p, required_skills: p.required_skills.filter((_, j) => j !== i) }))} className="hover:text-red-300"><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Tasks ({editedPlan.tasks?.length || 0})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(editedPlan.tasks || []).map((task, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{task.title}</p>
                        <p className="text-white/50 text-xs mt-0.5">{task.description}</p>
                        {task.skill_development_outcome && (
                          <p className="text-green-400/70 text-xs mt-1">↑ {task.skill_development_outcome}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-white/40 text-xs"><Clock className="w-3 h-3 inline mr-0.5" />{task.estimated_hours}h</span>
                        <Badge className="text-xs bg-white/5 text-white/50">{task.priority}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-white/30 text-xs">Total: ~{editedPlan.estimated_total_hours || 0}h</p>
              </CardContent>
            </Card>

            {/* Recommended team */}
            {teamOverrides.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2"><CardTitle className="text-white text-sm flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" />Recommended Team (by skill match)</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {teamOverrides.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded">
                      <div>
                        <span className="text-white text-sm">{a.name}</span>
                        <span className="text-white/40 text-xs ml-2">({a.role})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-xs bg-green-500/15 text-green-300">{a.matchCount} skill{a.matchCount !== 1 ? 's' : ''} matched</Badge>
                        <span className="text-white/40 text-xs">{a.avgProficiency}% avg</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Milestones */}
            {editedPlan.milestones?.length > 0 && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Milestones</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {editedPlan.milestones.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs flex-shrink-0">d{m.days_from_start}</div>
                      <div>
                        <p className="text-white text-sm">{m.title}</p>
                        <p className="text-white/40 text-xs">{m.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" className="text-white/50" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
                Continue to Launch <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Launch ── */}
        {step === 3 && editedPlan && (
          <div className="space-y-6">
            <div>
              <h2 className="text-white text-xl mb-1">Ready to Launch</h2>
              <p className="text-white/40 text-sm">Confirm and create the project in the Village</p>
            </div>

            <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-purple-500/30">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Wand2 className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-white text-xl font-light">{editedPlan.title}</h3>
                    <p className="text-white/70 mt-1">{editedPlan.description}</p>
                    {editedPlan.vision && <p className="text-purple-300/70 text-sm italic mt-2">"{editedPlan.vision}"</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/5 rounded p-3 text-center">
                    <div className="text-white text-lg font-light">{editedPlan.tasks?.length || 0}</div>
                    <div className="text-white/40 text-xs">tasks</div>
                  </div>
                  <div className="bg-white/5 rounded p-3 text-center">
                    <div className="text-white text-lg font-light">{editedPlan.milestones?.length || 0}</div>
                    <div className="text-white/40 text-xs">milestones</div>
                  </div>
                  <div className="bg-white/5 rounded p-3 text-center">
                    <div className="text-white text-lg font-light">{editedPlan.suggested_duration_weeks || '—'}w</div>
                    <div className="text-white/40 text-xs">duration</div>
                  </div>
                  <div className="bg-white/5 rounded p-3 text-center">
                    <div className="text-purple-300 text-lg font-light capitalize">{editedPlan.priority}</div>
                    <div className="text-white/40 text-xs">priority</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(editedPlan.required_skills || []).map((s, i) => (
                    <Badge key={i} className="text-xs bg-blue-500/15 text-blue-300 border-blue-500/20">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="ghost" className="text-white/50" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:opacity-90 flex-1"
              >
                {createMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Project...</>
                  : <><CheckCircle2 className="w-4 h-4 mr-2" />Launch Project</>
                }
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}