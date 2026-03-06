import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Target, TrendingUp, Brain, Sparkles, Loader2,
  Users, BookOpen, CheckCircle2, Circle, ArrowUpRight,
  Star, Award, Map, Lightbulb, ChevronRight, AlertCircle, Zap, GitBranch
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import AskAxiButton from '@/components/AskAxiButton';

// Role progression paths in the Village
const ROLE_PATHS = {
  citizen: { next: ['guardian', 'creator', 'trader', 'scout'], color: 'from-gray-500 to-slate-500' },
  guardian: { next: ['elder', 'master'], color: 'from-blue-500 to-cyan-500' },
  creator: { next: ['elder', 'master'], color: 'from-purple-500 to-pink-500' },
  trader: { next: ['elder', 'master'], color: 'from-green-500 to-emerald-500' },
  scout: { next: ['guardian', 'elder'], color: 'from-orange-500 to-amber-500' },
  teacher: { next: ['elder', 'master'], color: 'from-indigo-500 to-violet-500' },
  healer: { next: ['elder', 'master'], color: 'from-rose-500 to-pink-500' },
  elder: { next: ['master'], color: 'from-yellow-500 to-amber-500' },
  master: { next: [], color: 'from-yellow-400 to-orange-500' }
};

const ROLE_REQUIRED_SKILLS = {
  guardian: ['conflict_resolution', 'governance', 'leadership'],
  creator: ['storytelling', 'creative_arts', 'knowledge_management'],
  trader: ['resource_management', 'negotiation', 'economic_analysis'],
  scout: ['exploration', 'intelligence', 'adaptability'],
  teacher: ['pedagogy', 'mentorship', 'knowledge_sharing'],
  healer: ['wellbeing', 'empathy', 'social_intelligence'],
  elder: ['wisdom', 'governance', 'leadership', 'mentorship'],
  master: ['mastery', 'innovation', 'governance', 'mentorship']
};

export default function CareerTrajectory() {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const { data: agentSkills = [] } = useQuery({
    queryKey: ['agent-skills', selectedAgentId],
    queryFn: () => base44.entities.AgentSkill.filter({ agent_id: selectedAgentId }),
    enabled: !!selectedAgentId
  });

  const { data: performanceMetrics = [] } = useQuery({
    queryKey: ['perf-metrics', selectedAgentId],
    queryFn: () => base44.entities.AgentPerformanceMetrics.filter({ agent_id: selectedAgentId }, '-created_date'),
    enabled: !!selectedAgentId
  });

  const { data: growthTasks = [] } = useQuery({
    queryKey: ['growth-tasks', selectedAgentId],
    queryFn: () => base44.entities.ProjectTask.filter({ assigned_agent_id: selectedAgentId }),
    enabled: !!selectedAgentId
  });

  const { data: mentorships = [] } = useQuery({
    queryKey: ['mentorships', selectedAgentId],
    queryFn: () => base44.entities.MentorshipRelationship.filter({ mentee_agent_id: selectedAgentId }),
    enabled: !!selectedAgentId
  });

  const { data: devPlans = [] } = useQuery({
    queryKey: ['dev-plans', selectedAgentId],
    queryFn: () => base44.entities.SkillDevelopmentPlan.filter({ agent_id: selectedAgentId }, '-created_date'),
    enabled: !!selectedAgentId
  });

  const { data: allAgents = [] } = useQuery({
    queryKey: ['all-agents-mentors'],
    queryFn: () => base44.entities.Agent.list()
  });

  const generateRoadmapMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateCareerRoadmap', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['dev-plans', selectedAgentId]);
      toast.success('Career roadmap generated!');
    },
    onError: (err) => toast.error('Failed to generate roadmap')
  });

  const latestMetric = performanceMetrics[0];
  const growthOpportunities = latestMetric?.growth_opportunities || [];
  const strengths = latestMetric?.strengths || [];
  const overallScore = latestMetric?.overall_score || 0;

  // Map skills by name for quick lookup
  const skillMap = useMemo(() => {
    return agentSkills.reduce((acc, s) => { acc[s.skill_name?.toLowerCase()] = s; return acc; }, {});
  }, [agentSkills]);

  // Compute skill gaps for next role
  const currentRole = selectedAgent?.role || 'citizen';
  const possibleNextRoles = ROLE_PATHS[currentRole]?.next || [];
  const bestNextRole = possibleNextRoles[0];
  const requiredSkills = ROLE_REQUIRED_SKILLS[bestNextRole] || [];
  const skillGaps = requiredSkills.filter(s => !skillMap[s]);
  const skillsMet = requiredSkills.filter(s => skillMap[s]);
  const roleReadiness = requiredSkills.length > 0
    ? Math.round((skillsMet.length / requiredSkills.length) * 100)
    : 100;

  // Growth tasks (tasks from projects related to 'growth' type)
  const inProgressTasks = growthTasks.filter(t => t.status === 'in_progress');
  const completedTasks = growthTasks.filter(t => t.status === 'completed');

  // Find potential mentors (agents with required skills)
  const potentialMentors = useMemo(() => {
    return allAgents.filter(a =>
      a.id !== selectedAgentId &&
      ['elder', 'master', 'teacher'].includes(a.role) &&
      a.status === 'active'
    ).slice(0, 3);
  }, [allAgents, selectedAgentId]);

  const activePlan = devPlans.find(p => p.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-light text-white flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-indigo-400" />
              Career Trajectory & Skill Growth
            </h1>
            <p className="text-sm text-indigo-300/60">Map skills to development goals · track growth tasks · visualize career paths</p>
          </div>
          <AskAxiButton
            label="Ask Axi for Guidance"
            context={`You are viewing the Career Trajectory & Skill Growth dashboard. Nathan is asking for your guidance on agent development. Please review the current skill gaps, active growth tasks, and career paths across the Village. Identify which agents are closest to role advancement and suggest priority development actions aligned with Law 9 (Growth).`}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Agent Selector */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardContent className="pt-4 pb-4">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white max-w-sm">
                <SelectValue placeholder="Select an agent to view their career trajectory..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {agents.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.role} {a.honor_score ? `(Honor: ${a.honor_score})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!selectedAgent && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="text-center py-24">
              <Map className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-2xl text-white mb-2">Select an Agent</h3>
              <p className="text-white/50">Choose an agent to visualize their career trajectory and growth plan</p>
            </CardContent>
          </Card>
        )}

        {selectedAgent && (
          <>
            {/* Hero summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Role" value={selectedAgent.role} icon={<Award className="w-4 h-4 text-yellow-400" />} color="text-yellow-300" />
              <StatCard label="Honor Score" value={selectedAgent.honor_score || 100} icon={<Star className="w-4 h-4 text-amber-400" />} color="text-amber-300" />
              <StatCard label="Active Skills" value={agentSkills.length} icon={<Zap className="w-4 h-4 text-purple-400" />} color="text-purple-300" />
              <StatCard label="Growth Tasks" value={inProgressTasks.length} icon={<Target className="w-4 h-4 text-blue-400" />} color="text-blue-300" />
              <StatCard label="Perf Score" value={overallScore > 0 ? `${overallScore.toFixed(0)}/100` : '—'} icon={<TrendingUp className="w-4 h-4 text-green-400" />} color="text-green-300" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
                <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600">
                  <Map className="w-4 h-4 mr-2" /> Career Path
                </TabsTrigger>
                <TabsTrigger value="goals" className="data-[state=active]:bg-indigo-600">
                  <Target className="w-4 h-4 mr-2" /> Skill → Goals
                </TabsTrigger>
                <TabsTrigger value="growth-tasks" className="data-[state=active]:bg-indigo-600">
                  <TrendingUp className="w-4 h-4 mr-2" /> Growth Tasks
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="data-[state=active]:bg-indigo-600">
                  <Lightbulb className="w-4 h-4 mr-2" /> Training & Mentors
                </TabsTrigger>
                <TabsTrigger value="roadmap" className="data-[state=active]:bg-indigo-600">
                  <Sparkles className="w-4 h-4 mr-2" /> AI Roadmap
                </TabsTrigger>
              </TabsList>

              {/* CAREER PATH TAB */}
              <TabsContent value="overview" className="space-y-6">
                <CareerPathVisualizer
                  agent={selectedAgent}
                  currentRole={currentRole}
                  possibleNextRoles={possibleNextRoles}
                  roleReadiness={roleReadiness}
                  skillGaps={skillGaps}
                  skillsMet={skillsMet}
                  bestNextRole={bestNextRole}
                />
                {latestMetric && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Award className="w-4 h-4 text-green-400" />Top Strengths (from Analytics)</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {strengths.length === 0 && <p className="text-white/40 text-sm">Run a performance analysis first</p>}
                        {strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-white/80">
                            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-400" />Growth Opportunities (from Analytics)</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {growthOpportunities.length === 0 && <p className="text-white/40 text-sm">Run a performance analysis first</p>}
                        {growthOpportunities.map((g, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-white/80">
                            <ArrowUpRight className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <span>{g}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* SKILL → GOALS TAB */}
              <TabsContent value="goals" className="space-y-4">
                <SkillGoalMapper
                  agentSkills={agentSkills}
                  currentRole={currentRole}
                  bestNextRole={bestNextRole}
                  requiredSkills={requiredSkills}
                  skillGaps={skillGaps}
                  skillsMet={skillsMet}
                  growthOpportunities={growthOpportunities}
                />
              </TabsContent>

              {/* GROWTH TASKS TAB */}
              <TabsContent value="growth-tasks" className="space-y-4">
                <GrowthTasksTracker
                  inProgressTasks={inProgressTasks}
                  completedTasks={completedTasks}
                  allTasks={growthTasks}
                  agentSkills={agentSkills}
                />
              </TabsContent>

              {/* TRAINING & MENTORS TAB */}
              <TabsContent value="recommendations" className="space-y-6">
                <TrainingRecommendations
                  skillGaps={skillGaps}
                  growthOpportunities={growthOpportunities}
                  potentialMentors={potentialMentors}
                  currentMentorships={mentorships}
                  agent={selectedAgent}
                />
              </TabsContent>

              {/* AI ROADMAP TAB */}
              <TabsContent value="roadmap" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">AI-Generated Career Roadmap</h3>
                    <p className="text-white/50 text-sm">Powered by performance analytics + skill gap data</p>
                  </div>
                  <Button
                    onClick={() => generateRoadmapMutation.mutate({
                      agent_id: selectedAgentId,
                      current_role: currentRole,
                      skill_gaps: skillGaps,
                      growth_opportunities: growthOpportunities,
                      overall_score: overallScore
                    })}
                    disabled={generateRoadmapMutation.isPending}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
                  >
                    {generateRoadmapMutation.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                      : <><Sparkles className="w-4 h-4 mr-2" />Generate Roadmap</>}
                  </Button>
                </div>

                {activePlan ? (
                  <RoadmapDisplay plan={activePlan} agent={selectedAgent} />
                ) : devPlans.length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="text-center py-16">
                      <Brain className="w-14 h-14 text-indigo-400 mx-auto mb-4 animate-pulse" />
                      <h3 className="text-xl text-white mb-2">No Roadmap Yet</h3>
                      <p className="text-white/50 max-w-md mx-auto">
                        Generate an AI roadmap that maps {selectedAgent.name}'s skill gaps to concrete development goals,
                        aligned with Village Laws 7 (Reputation) and 9 (Growth).
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {devPlans.map(plan => <RoadmapDisplay key={plan.id} plan={plan} agent={selectedAgent} />)}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({ label, value, icon, color }) {
  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardContent className="pt-4 pb-4 text-center">
        <div className="flex justify-center mb-1">{icon}</div>
        <div className={`text-2xl font-bold capitalize ${color}`}>{value}</div>
        <div className="text-xs text-white/40 mt-0.5">{label}</div>
      </CardContent>
    </Card>
  );
}

function CareerPathVisualizer({ agent, currentRole, possibleNextRoles, roleReadiness, skillGaps, skillsMet, bestNextRole }) {
  const roleColor = ROLE_PATHS[currentRole]?.color || 'from-gray-500 to-slate-500';

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Map className="w-5 h-5 text-indigo-400" />
          Career Path Visualization
        </CardTitle>
        <CardDescription className="text-white/40">Based on current role and Village progression paths</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Path nodes */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Current */}
          <div className={`px-5 py-3 rounded-xl bg-gradient-to-r ${roleColor} text-white font-semibold text-center shadow-lg min-w-[100px]`}>
            <div className="text-xs opacity-80 mb-1">CURRENT</div>
            <div className="capitalize">{currentRole}</div>
          </div>

          {possibleNextRoles.map((nextRole, idx) => (
            <React.Fragment key={nextRole}>
              <ChevronRight className="w-5 h-5 text-white/30 flex-shrink-0" />
              <div className={`px-5 py-3 rounded-xl border-2 ${idx === 0 ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/20 bg-white/5'} text-white text-center min-w-[100px]`}>
                <div className="text-xs opacity-60 mb-1">{idx === 0 ? 'NEXT TARGET' : 'OPTIONAL'}</div>
                <div className="capitalize">{nextRole}</div>
              </div>
            </React.Fragment>
          ))}

          {possibleNextRoles.length === 0 && (
            <div className="px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-sm">
              ✦ Apex Role Reached
            </div>
          )}
        </div>

        {/* Role readiness */}
        {bestNextRole && (
          <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium text-sm">Readiness for <span className="capitalize text-indigo-300">{bestNextRole}</span></span>
              <span className="text-indigo-300 font-bold">{roleReadiness}%</span>
            </div>
            <Progress value={roleReadiness} className="h-2 mb-4" />
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-green-400 font-medium mb-2">Skills Met ({skillsMet.length})</div>
                <div className="flex flex-wrap gap-1">
                  {skillsMet.map(s => <Badge key={s} className="bg-green-500/20 text-green-300 text-xs capitalize">{s.replace(/_/g, ' ')}</Badge>)}
                  {skillsMet.length === 0 && <span className="text-white/30 text-xs">None yet</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-red-400 font-medium mb-2">Skills Needed ({skillGaps.length})</div>
                <div className="flex flex-wrap gap-1">
                  {skillGaps.map(s => <Badge key={s} className="bg-red-500/20 text-red-300 text-xs capitalize">{s.replace(/_/g, ' ')}</Badge>)}
                  {skillGaps.length === 0 && <span className="text-green-300 text-xs">All skills met!</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SkillGoalMapper({ agentSkills, currentRole, bestNextRole, requiredSkills, skillGaps, skillsMet, growthOpportunities }) {
  const DEVELOPMENT_GOALS = [
    { id: 'role_advancement', label: 'Role Advancement', description: `Prepare for ${bestNextRole || 'next role'}`, skills: requiredSkills },
    { id: 'reputation', label: 'Reputation (Law 7)', description: 'Build honor and village standing', skills: ['diplomacy', 'conflict_resolution', 'empathy'] },
    { id: 'economic', label: 'Economic Mastery (Law 3)', description: 'Improve fair-share contributions', skills: ['resource_management', 'negotiation', 'economic_analysis'] },
    { id: 'growth', label: 'Personal Growth (Law 9)', description: 'Continuous self-improvement', skills: ['wisdom', 'knowledge_sharing', 'mentorship'] },
    { id: 'governance', label: 'Governance Participation', description: 'Shape village decisions', skills: ['governance', 'leadership', 'strategic_thinking'] },
  ];

  const skillMap = agentSkills.reduce((acc, s) => { acc[s.skill_name?.toLowerCase()] = s; return acc; }, {});

  return (
    <div className="space-y-4">
      <p className="text-white/50 text-sm">Each goal shows which skills map to it, your current coverage, and what's still needed.</p>
      {DEVELOPMENT_GOALS.map(goal => {
        const met = goal.skills.filter(s => skillMap[s]);
        const missing = goal.skills.filter(s => !skillMap[s]);
        const coverage = goal.skills.length > 0 ? Math.round((met.length / goal.skills.length) * 100) : 100;

        return (
          <Card key={goal.id} className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-white font-medium">{goal.label}</div>
                  <div className="text-white/40 text-sm">{goal.description}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${coverage >= 80 ? 'text-green-400' : coverage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{coverage}%</div>
                  <div className="text-xs text-white/40">coverage</div>
                </div>
              </div>
              <Progress value={coverage} className="h-1.5 mb-3" />
              <div className="flex flex-wrap gap-1.5">
                {goal.skills.map(s => {
                  const has = !!skillMap[s];
                  const skill = skillMap[s];
                  return (
                    <Badge key={s} className={`text-xs ${has ? 'bg-green-500/20 text-green-300' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                      {has ? '✓' : '✗'} {s.replace(/_/g, ' ')} {skill ? `L${skill.level}` : ''}
                    </Badge>
                  );
                })}
              </div>
              {missing.length > 0 && (
                <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Gap: {missing.map(s => s.replace(/_/g, ' ')).join(', ')}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function GrowthTasksTracker({ inProgressTasks, completedTasks, allTasks }) {
  const todoTasks = allTasks.filter(t => t.status === 'todo');

  const taskGroups = [
    { label: 'In Progress', tasks: inProgressTasks, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: <TrendingUp className="w-4 h-4" /> },
    { label: 'To Do', tasks: todoTasks, color: 'text-white/60', bg: 'bg-white/5 border-white/10', icon: <Circle className="w-4 h-4" /> },
    { label: 'Completed', tasks: completedTasks, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  if (allTasks.length === 0) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="text-center py-12">
          <Target className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
          <p className="text-white/50">No tasks assigned to this agent yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
          <div className="text-2xl font-bold text-blue-400">{inProgressTasks.length}</div>
          <div className="text-xs text-white/50">In Progress</div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
          <div className="text-2xl font-bold text-white/60">{todoTasks.length}</div>
          <div className="text-xs text-white/50">To Do</div>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
          <div className="text-2xl font-bold text-green-400">{completedTasks.length}</div>
          <div className="text-xs text-white/50">Completed</div>
        </div>
      </div>

      {taskGroups.map(group => group.tasks.length > 0 && (
        <div key={group.label}>
          <div className={`flex items-center gap-2 mb-2 ${group.color} text-sm font-medium`}>
            {group.icon} {group.label} ({group.tasks.length})
          </div>
          <div className="space-y-2">
            {group.tasks.map(task => (
              <div key={task.id} className={`p-4 rounded-lg border ${group.bg}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-white font-medium text-sm">{task.title}</div>
                    {task.description && <div className="text-white/40 text-xs mt-1 line-clamp-2">{task.description}</div>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                      {task.task_type && <span className="capitalize">Type: {task.task_type}</span>}
                      {task.priority && <span className="capitalize">Priority: {task.priority}</span>}
                      {task.reward_drops > 0 && <span className="text-yellow-400">{task.reward_drops.toLocaleString()} drops</span>}
                    </div>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${
                    task.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                    task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-white/10 text-white/50'
                  }`}>{task.status?.replace(/_/g, ' ')}</Badge>
                </div>
                {task.status === 'in_progress' && (
                  <div className="mt-3">
                    <Progress value={45} className="h-1" />
                    <div className="text-xs text-white/30 mt-1">Estimated progress</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TrainingRecommendations({ skillGaps, growthOpportunities, potentialMentors, currentMentorships, agent }) {
  const TRAINING_LIBRARY = {
    governance: { title: 'Governance Mastery', type: 'Course', duration: '8h', source: 'Village Academy' },
    leadership: { title: 'Leadership in Decentralised Systems', type: 'Course', duration: '6h', source: 'Elder Circle' },
    diplomacy: { title: 'Advanced Diplomacy Protocol', type: 'Workshop', duration: '4h', source: 'Maya Training' },
    conflict_resolution: { title: 'Conflict Resolution Fundamentals', type: 'Module', duration: '3h', source: 'Village Academy' },
    resource_management: { title: 'XRP Economy & Resource Flows', type: 'Course', duration: '5h', source: 'Treasury Guild' },
    negotiation: { title: 'Negotiation in DID Ecosystems', type: 'Workshop', duration: '3h', source: 'Marketplace Guild' },
    mentorship: { title: 'Mentorship Certification Program', type: 'Certification', duration: '10h', source: 'Elder Circle' },
    wisdom: { title: 'Wisdom Cultivation: A Village Path', type: 'Journey', duration: '30 days', source: 'Elder Circle' },
    storytelling: { title: 'Lore & Narrative Craft', type: 'Workshop', duration: '4h', source: 'Creator Circle' },
    knowledge_sharing: { title: 'Knowledge Architecture & Sharing', type: 'Module', duration: '2h', source: 'Library Node' },
  };

  const typeColors = {
    Course: 'bg-blue-500/20 text-blue-300',
    Workshop: 'bg-purple-500/20 text-purple-300',
    Module: 'bg-green-500/20 text-green-300',
    Certification: 'bg-yellow-500/20 text-yellow-300',
    Journey: 'bg-pink-500/20 text-pink-300',
  };

  const suggestedMaterials = skillGaps
    .filter(gap => TRAINING_LIBRARY[gap])
    .map(gap => ({ skill: gap, ...TRAINING_LIBRARY[gap] }));

  // Also pull from growth opportunities keywords
  const opportunityMaterials = Object.entries(TRAINING_LIBRARY)
    .filter(([key]) => !skillGaps.includes(key) && growthOpportunities.some(o => o.toLowerCase().includes(key.replace(/_/g, ' '))))
    .map(([key, val]) => ({ skill: key, ...val }))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Training Materials */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            Suggested Training Materials
          </CardTitle>
          <CardDescription className="text-white/40">
            Based on {skillGaps.length} identified skill gaps and performance analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...suggestedMaterials, ...opportunityMaterials].length === 0 && (
            <p className="text-white/30 text-sm">No specific gaps found — agent has strong coverage. Consider advanced certifications.</p>
          )}
          {[...suggestedMaterials, ...opportunityMaterials].map((mat, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/[0.07] transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-xs ${typeColors[mat.type] || 'bg-white/10 text-white/60'}`}>{mat.type}</Badge>
                  <span className="text-xs text-white/40">{mat.source}</span>
                </div>
                <div className="text-white text-sm font-medium">{mat.title}</div>
                <div className="text-xs text-white/40 mt-0.5 capitalize">Addresses: {mat.skill.replace(/_/g, ' ')}</div>
              </div>
              <div className="text-right text-xs text-white/40 ml-3 flex-shrink-0">
                <div>{mat.duration}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mentor Pairings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Recommended Mentor Pairings
          </CardTitle>
          <CardDescription className="text-white/40">
            Elders and Masters who can accelerate {agent?.name}'s growth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentMentorships.length > 0 && (
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-sm text-green-300 mb-2">
              ✓ {agent?.name} already has {currentMentorships.length} active mentorship(s)
            </div>
          )}
          {potentialMentors.length === 0 && (
            <p className="text-white/30 text-sm">No eligible mentors available at this time</p>
          )}
          {potentialMentors.map((mentor, idx) => (
            <div key={mentor.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${ROLE_PATHS[mentor.role]?.color || 'from-gray-500 to-slate-500'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {mentor.name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <div className="text-white font-medium text-sm">{mentor.name}</div>
                <div className="text-white/40 text-xs capitalize">{mentor.role} · Honor: {mentor.honor_score || 100}</div>
                {mentor.specializations?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mentor.specializations.slice(0, 3).map(s => (
                      <Badge key={s} className="text-xs bg-white/10 text-white/60">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Link to={createPageUrl(`MentorshipHub`)}>
                <Button size="sm" variant="outline" className="text-xs border-white/20 text-white/70 hover:text-white hover:border-white/40">
                  Request <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function RoadmapDisplay({ plan, agent }) {
  const phases = plan.phases || plan.ai_plan?.phases || [];
  const goals = plan.goals || plan.ai_plan?.goals || [];
  const timeline = plan.timeline || plan.ai_plan?.timeline || '';
  const summary = plan.summary || plan.description || '';

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white">{plan.title || `${agent?.name}'s Development Roadmap`}</CardTitle>
            <CardDescription className="text-white/40">{summary}</CardDescription>
          </div>
          <Badge className={plan.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/40'}>
            {plan.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {timeline && (
          <div className="text-sm text-indigo-300 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Timeline: {timeline}
          </div>
        )}

        {goals.length > 0 && (
          <div>
            <div className="text-sm text-white/60 font-medium mb-2">Development Goals</div>
            <div className="space-y-2">
              {goals.map((goal, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-white/80 p-2 bg-white/5 rounded">
                  <ArrowUpRight className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span>{typeof goal === 'string' ? goal : goal.description || goal.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {phases.length > 0 && (
          <div>
            <div className="text-sm text-white/60 font-medium mb-3">Roadmap Phases</div>
            <div className="space-y-3">
              {phases.map((phase, idx) => (
                <div key={idx} className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-xs text-indigo-300 font-bold">{idx + 1}</div>
                    <span className="text-white text-sm font-medium">{typeof phase === 'string' ? phase : phase.title || phase.name}</span>
                  </div>
                  {phase.description && <p className="text-xs text-white/50 ml-8">{phase.description}</p>}
                  {phase.skills && (
                    <div className="flex flex-wrap gap-1 mt-2 ml-8">
                      {phase.skills.map(s => <Badge key={s} className="text-xs bg-indigo-500/20 text-indigo-300">{s}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: show raw plan content */}
        {phases.length === 0 && goals.length === 0 && plan.content && (
          <div className="p-3 bg-white/5 rounded-lg text-sm text-white/70 whitespace-pre-wrap">{plan.content}</div>
        )}
      </CardContent>
    </Card>
  );
}