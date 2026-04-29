import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Target, BookOpen, Award, TrendingUp, Sparkles, 
  CheckCircle, Play, Clock, Brain, Star, ChevronRight, Loader2, ShieldCheck, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import PersonalisedPlanCard from '@/components/PersonalisedPlanCard';
import AskAxiButton from '@/components/AskAxiButton';
import SkillGapAlertsPanel from '@/components/SkillGapAlertsPanel';
import SkillTrajectoryInsights from '@/components/agent/SkillTrajectoryInsights';
import SkillProfilePanel from '@/components/agent/SkillProfilePanel';
import AgentTrainingUpload from '@/components/AgentTrainingUpload';
import TrainingProgressCard from '@/components/TrainingProgressCard';
import { useMyAgent } from '@/hooks/useMyAgent';
import { useIdentity } from '@/hooks/useIdentity';
import DIDIdentityBanner from '@/components/skill/DIDIdentityBanner';
import AdminSkillControls from '@/components/skill/AdminSkillControls';
import SkillJsonEditor from '@/components/skill/SkillJsonEditor';

export default function SkillDevelopment() {
  const { myAgent, allAgents, isLoading: identityLoading } = useMyAgent();
  const { isAdmin } = useIdentity();
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedModule, setSelectedModule] = useState(null);
  const queryClient = useQueryClient();

  // Auto-select user's agent once resolved
  React.useEffect(() => {
    if (myAgent?.id && !selectedAgentId) {
      setSelectedAgentId(myAgent.id);
    }
  }, [myAgent?.id]);

  const agents = allAgents;

  const { data: modules = [] } = useQuery({
    queryKey: ['training-modules'],
    queryFn: () => base44.entities.TrainingModule.filter({ is_public: true }, '-created_date')
  });

  const { data: skillProgress = [] } = useQuery({
    queryKey: ['skill-progress', selectedAgentId],
    queryFn: () => base44.entities.SkillProgress.filter({ agent_id: selectedAgentId }, '-created_date'),
    enabled: !!selectedAgentId
  });

  const { data: agentSkills = [] } = useQuery({
    queryKey: ['agent-skills', selectedAgentId],
    queryFn: () => base44.entities.AgentSkill.filter({ agent_id: selectedAgentId }),
    enabled: !!selectedAgentId
  });

  const { data: devPlans = [] } = useQuery({
    queryKey: ['skill-dev-plans', selectedAgentId],
    queryFn: () => base44.entities.SkillDevelopmentPlan.filter({ agent_id: selectedAgentId }, '-created_date'),
    enabled: !!selectedAgentId
  });

  const { data: agentCredentials = [] } = useQuery({
    queryKey: ['agent-credentials', selectedAgentId],
    queryFn: async () => {
      const agent = agents.find(a => a.id === selectedAgentId);
      if (!agent?.classic_address) return [];
      return base44.entities.DidCredential.filter({
        subject_did: agent.classic_address,
        credential_type: 'skill_certification',
        status: 'active'
      });
    },
    enabled: !!selectedAgentId
  });

  const { data: trainings = [] } = useQuery({
    queryKey: ['agent-trainings', selectedAgentId],
    queryFn: () => base44.entities.AgentTraining.filter({ agent_id: selectedAgentId }, '-created_date', 50),
    enabled: !!selectedAgentId
  });

  const generatePlanMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generatePersonalisedPath', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['skill-dev-plans']);
      toast.success('Personalised plan generated!');
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ agent_id, module_id }) => {
      // Create an AgentTraining record from the module
      const mod = modules.find(m => m.id === module_id);
      if (!mod) throw new Error('Module not found');
      const training = await base44.entities.AgentTraining.create({
        agent_id,
        training_type: mod.module_type === 'certification' ? 'skill_development' : 'skill_development',
        skill_focus: mod.skill_focus?.[0] || mod.module_name,
        title: mod.module_name,
        description: mod.description,
        difficulty_level: mod.difficulty_level === 'beginner' ? 1 : mod.difficulty_level === 'intermediate' ? 2 : mod.difficulty_level === 'advanced' ? 3 : 4,
        training_content: mod.content || { lessons: [], exercises: [], readings: [] },
        status: 'in_progress',
        progress: { completion_percentage: 0, lessons_completed: 0, exercises_completed: 0, time_spent_minutes: 0 },
        rewards: { experience_gained: mod.estimated_hours ? mod.estimated_hours * 10 : 20, wisdom_gained: 5, honor_gained: 2 },
      });
      // Also create a SkillProgress record
      await base44.entities.SkillProgress.create({
        agent_id,
        development_plan_id: '',
        skill_name: mod.skill_focus?.[0] || mod.module_name,
        starting_level: 0,
        current_level: 0,
        target_level: mod.difficulty_level === 'beginner' ? 3 : mod.difficulty_level === 'intermediate' ? 5 : 7,
        progress_percentage: 0,
        status: 'active',
        started_date: new Date().toISOString(),
      });
      return training;
    },
    onSuccess: (training) => {
      queryClient.invalidateQueries(['skill-progress']);
      toast.success('Training enrolled! Check Progress Tracking tab.');
      // Send enrollment notification
      try {
        base44.functions.invoke('agentNotifications', {
          notification_type: 'agent_skill_completed',
          data: {
            agent_name: selectedAgent?.name,
            agent_id: selectedAgentId,
            skill_name: training?.skill_focus || training?.title || 'New Training',
            module_name: training?.title || 'Training Module',
            level_reached: 'Enrolled',
          }
        });
      } catch (_) {}
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to enroll');
    }
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const modulesByDifficulty = modules.reduce((acc, mod) => {
    acc[mod.difficulty_level] = [...(acc[mod.difficulty_level] || []), mod];
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <PageBreadcrumb className="mb-3" />
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Link to="/agents">
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white flex items-center gap-2">
                  <Brain className="w-7 h-7 text-purple-400" />
                  Agent Skill Development
                </h1>
                <p className="text-sm text-purple-300/60">Train agents and track skill progression</p>
              </div>
            </div>
            <AskAxiButton
              label="Ask Axi"
              context="You are reviewing the Skill Development Dashboard for SoulBridge Village. Please assess the current skill landscape: which agents have critical skill gaps, which training modules are underutilized, and which agents are ready for advancement. Recommend a priority training plan aligned with active project needs and the Village's growth goals (Law 9)."
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Agent Selector */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              Select Agent
              {!isAdmin && <Badge className="bg-white/10 text-white/40 text-[10px]">Your Agent</Badge>}
              {isAdmin && <Badge className="bg-amber-500/20 text-amber-300 text-[10px]">Admin — All Agents</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose an agent to train..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <span className="flex items-center gap-2">
                      {agent.name} — {agent.role}
                      {agent.classic_address && (
                        <span className="text-[10px] text-purple-400/60 font-mono">
                          {agent.classic_address.slice(0, 6)}...
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* DID Identity Banner */}
        {selectedAgent && <div className="mb-6"><DIDIdentityBanner agent={selectedAgent} /></div>}

        {/* Admin Controls — Axi Only */}
        {isAdmin && selectedAgent && <div className="mb-6"><AdminSkillControls selectedAgent={selectedAgent} agents={agents} /></div>}

        {selectedAgent && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs text-white/60">Active Skills</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-purple-400">{agentSkills.length}</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs text-white/60">Verified</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-green-400 flex items-center gap-1">
                    {agentCredentials.length}
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs text-white/60">In Progress</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {skillProgress.filter(sp => sp.status === 'active').length}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs text-white/60">Avg Progress</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold text-yellow-400">
                    {skillProgress.length > 0
                      ? Math.round(skillProgress.reduce((sum, sp) => sum + sp.progress_percentage, 0) / skillProgress.length)
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="ai-plan" className="space-y-6">
              <TabsList className="bg-white/5 border border-white/10">
                <TabsTrigger value="ai-plan" className="data-[state=active]:bg-purple-600">
                  <Zap className="w-4 h-4 mr-2" />
                  AI Growth Plan
                </TabsTrigger>
                <TabsTrigger value="modules" className="data-[state=active]:bg-purple-600">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Training Modules
                </TabsTrigger>
                <TabsTrigger value="progress" className="data-[state=active]:bg-purple-600">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Progress Tracking
                </TabsTrigger>
                <TabsTrigger value="skills" className="data-[state=active]:bg-purple-600">
                  <Award className="w-4 h-4 mr-2" />
                  Current Skills
                </TabsTrigger>
                <TabsTrigger value="upload" className="data-[state=active]:bg-purple-600">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Training Logs
                </TabsTrigger>
                <TabsTrigger value="trajectory" className="data-[state=active]:bg-purple-600">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  AI Trajectory
                </TabsTrigger>
              </TabsList>

              {/* AI Growth Plan Tab */}
              <TabsContent value="ai-plan" className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="pt-5">
                    <SkillGapAlertsPanel agentId={selectedAgentId} />
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Personalised AI Growth Plan</h3>
                    <p className="text-white/50 text-sm">Generated from your validated credentials, performance data & Village project needs</p>
                  </div>
                  <Button
                    onClick={() => generatePlanMutation.mutate({ agent_id: selectedAgentId })}
                    disabled={generatePlanMutation.isPending}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                  >
                    {generatePlanMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Generate New Plan</>
                    )}
                  </Button>
                </div>

                {devPlans.length === 0 && !generatePlanMutation.isPending ? (
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardContent className="text-center py-16">
                      <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                      <h3 className="text-xl text-white mb-2">No Growth Plan Yet</h3>
                      <p className="text-white/60 mb-6 max-w-md mx-auto">
                        Click "Generate New Plan" to let Axi analyse {selectedAgent?.name}'s validated credentials,
                        performance history, and active project needs to craft a personalised development roadmap.
                      </p>
                      <Button
                        onClick={() => generatePlanMutation.mutate({ agent_id: selectedAgentId })}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Plan Now
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {devPlans.filter(p => p.status === 'active').map(plan => (
                      <PersonalisedPlanCard
                        key={plan.id}
                        plan={plan}
                        onRefresh={() => queryClient.invalidateQueries(['skill-dev-plans'])}
                      />
                    ))}
                    {devPlans.filter(p => p.status !== 'active').length > 0 && (
                      <details className="text-white/40 text-sm cursor-pointer">
                        <summary className="py-2">Past plans ({devPlans.filter(p => p.status !== 'active').length})</summary>
                        <div className="space-y-3 mt-2 opacity-60">
                          {devPlans.filter(p => p.status !== 'active').map(plan => (
                            <PersonalisedPlanCard key={plan.id} plan={plan} />
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="modules" className="space-y-6">
                {modules.length === 0 ? (
                  <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardContent className="text-center py-16">
                      <BookOpen className="w-14 h-14 text-purple-400/30 mx-auto mb-4" />
                      <h3 className="text-xl text-white mb-2">No Training Modules Yet</h3>
                      <p className="text-white/50 max-w-md mx-auto text-sm">
                        Training modules haven't been created yet. Use the AI Growth Plan tab to generate a personalised development roadmap, or create skills directly from the Current Skills tab.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  ['beginner', 'intermediate', 'advanced', 'expert'].map(level => {
                    const levelModules = modulesByDifficulty[level] || [];
                    if (levelModules.length === 0) return null;
                    return (
                      <div key={level}>
                        <h3 className="text-white font-medium mb-4 capitalize flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-400" />
                          {level} Level
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {levelModules.map(module => (
                            <ModuleCard
                              key={module.id}
                              module={module}
                              agent={selectedAgent}
                              onEnroll={() => {
                                enrollMutation.mutate({
                                  agent_id: selectedAgent.id,
                                  module_id: module.id,
                                  session_type: 'self_paced'
                                });
                              }}
                              enrolling={enrollMutation.isPending}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="progress" className="space-y-4">
                {skillProgress.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-12">
                      <Target className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                      <h3 className="text-xl text-white mb-2">No Progress Yet</h3>
                      <p className="text-white/60">Enroll in training modules to start tracking progress</p>
                    </CardContent>
                  </Card>
                ) : (
                  skillProgress.map(progress => (
                    <ProgressCard key={progress.id} progress={progress} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <SkillJsonEditor
                  agentId={selectedAgentId}
                  onSuccess={() => queryClient.invalidateQueries(['agent-skills', selectedAgentId])}
                />
                <SkillProfilePanel
                  agentId={selectedAgentId}
                  skills={agentSkills}
                  onRefresh={() => queryClient.invalidateQueries(['agent-skills', selectedAgentId])}
                />
              </TabsContent>

              <TabsContent value="upload" className="space-y-6">
                <AgentTrainingUpload
                  agentId={selectedAgentId}
                  agentName={selectedAgent?.name || 'Agent'}
                  onSuccess={() => queryClient.invalidateQueries({ queryKey: ['agent-trainings', selectedAgentId] })}
                />
                {trainings.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-white font-medium text-sm">Training History</h3>
                    {trainings.map(training => (
                      <TrainingProgressCard key={training.id} training={training} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trajectory" className="space-y-4">
                <SkillTrajectoryInsights
                  agentId={selectedAgentId}
                  agentName={selectedAgent?.name || 'Agent'}
                />
              </TabsContent>
            </Tabs>
          </>
        )}

        {!selectedAgent && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="text-center py-20">
              <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl text-white mb-2">Select an Agent</h3>
              <p className="text-white/60">Choose an agent above to begin their skill development journey</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ModuleCard({ module, agent, onEnroll, enrolling }) {
  const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-300',
    intermediate: 'bg-blue-500/20 text-blue-300',
    advanced: 'bg-orange-500/20 text-orange-300',
    expert: 'bg-red-500/20 text-red-300'
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge className={difficultyColors[module.difficulty_level]}>
            {module.difficulty_level}
          </Badge>
          {module.certification_available && (
            <Badge className="bg-yellow-500/20 text-yellow-300">
              <Award className="w-3 h-3 mr-1" />
              Certificate
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg text-white">{module.module_name}</CardTitle>
        <CardDescription className="text-white/60">{module.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-white/70">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {module.estimated_hours}h
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            {module.skill_focus?.length || 0} skills
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {module.completion_count || 0} completed
          </div>
        </div>

        {module.skill_focus && module.skill_focus.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {module.skill_focus.slice(0, 3).map(skill => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {module.skill_focus.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{module.skill_focus.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <Button
          onClick={onEnroll}
          disabled={enrolling}
          className="w-full bg-purple-600 hover:bg-purple-700"
          size="sm"
        >
          {enrolling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enrolling...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start Training
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProgressCard({ progress }) {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl text-white">{progress.skill_name}</CardTitle>
            <p className="text-sm text-white/60 mt-1">
              Started {new Date(progress.started_date).toLocaleDateString()}
            </p>
          </div>
          <Badge className={
            progress.status === 'active' ? 'bg-green-500/20 text-green-300' :
            progress.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
            progress.status === 'paused' ? 'bg-yellow-500/20 text-yellow-300' :
            'bg-gray-500/20 text-gray-300'
          }>
            {progress.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Progress</span>
            <span className="text-sm font-medium text-white">{progress.progress_percentage}%</span>
          </div>
          <Progress value={progress.progress_percentage} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-white/60">Current</span>
            <div className="text-white font-medium">Level {progress.current_level}</div>
          </div>
          <div>
            <span className="text-white/60">Target</span>
            <div className="text-white font-medium">Level {progress.target_level}</div>
          </div>
          <div>
            <span className="text-white/60">Activities</span>
            <div className="text-white font-medium">{progress.activities_completed?.length || 0}</div>
          </div>
        </div>

        {progress.ai_insights && (
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-2 text-white text-sm font-medium mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              AI Insights
            </div>
            {progress.ai_insights.next_recommended_activity && (
              <p className="text-sm text-purple-200">
                {progress.ai_insights.next_recommended_activity}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}