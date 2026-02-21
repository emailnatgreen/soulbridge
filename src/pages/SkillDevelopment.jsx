import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Brain, TrendingUp, Target, Users, BookOpen, Award, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function SkillDevelopment() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);
  const [showLearningPath, setShowLearningPath] = useState(false);
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: developmentPlans = [] } = useQuery({
    queryKey: ['developmentPlans'],
    queryFn: () => base44.entities.SkillDevelopmentPlan.list('-created_date')
  });

  const { data: skillProgress = [] } = useQuery({
    queryKey: ['skillProgress'],
    queryFn: () => base44.entities.SkillProgress.list()
  });

  const activePlans = developmentPlans.filter(p => p.status === 'active');
  const completedPlans = developmentPlans.filter(p => p.status === 'completed');
  const avgProgress = activePlans.length > 0 
    ? activePlans.reduce((sum, p) => sum + (p.overall_progress || 0), 0) / activePlans.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
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
                <h1 className="text-2xl font-light text-white">AI Agent Skill Development</h1>
                <p className="text-sm text-indigo-300/60">Law 9: Continuous Growth & Mastery</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Active Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-indigo-400">{activePlans.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Avg Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{avgProgress.toFixed(0)}%</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{completedPlans.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{agents.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="plans">Development Plans</TabsTrigger>
            <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="agents">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => {
                const agentPlans = developmentPlans.filter(p => p.agent_id === agent.id && p.status === 'active');
                const agentProgress = skillProgress.filter(sp => sp.agent_id === agent.id);
                
                return (
                  <Card 
                    key={agent.id}
                    className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-white">{agent.name}</CardTitle>
                        <Badge className="bg-indigo-500/20 text-indigo-300">{agent.role}</Badge>
                      </div>
                      <div className="text-sm text-white/60">
                        Honor: {agent.honor_score} • {agentPlans.length} active plans
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {agent.core_skills?.slice(0, 3).map((skill, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-white/80">{skill.name}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={skill.level * 20} className="w-16 h-2" />
                            <span className="text-white/60 text-xs">{skill.level}/5</span>
                          </div>
                        </div>
                      ))}
                      {agentProgress.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <div className="text-xs text-green-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {agentProgress.length} skills in development
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="plans">
            <div className="space-y-4">
              {developmentPlans.map(plan => {
                const agent = agents.find(a => a.id === plan.agent_id);
                return (
                  <Card key={plan.id} className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white mb-2">{plan.plan_title}</CardTitle>
                          <div className="text-sm text-white/60">Agent: {agent?.name || 'Unknown'}</div>
                        </div>
                        <Badge className={
                          plan.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          plan.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }>
                          {plan.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-white/60">Overall Progress</span>
                          <span className="text-white">{plan.overall_progress || 0}%</span>
                        </div>
                        <Progress value={plan.overall_progress || 0} className="h-2" />
                      </div>

                      {plan.learning_objectives && (
                        <div>
                          <div className="text-white font-medium text-sm mb-2">Learning Objectives:</div>
                          <div className="flex flex-wrap gap-2">
                            {plan.learning_objectives.map((obj, idx) => (
                              <Badge key={idx} variant="outline" className="border-indigo-500/30 text-indigo-300">
                                {obj.skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {plan.progress_milestones && plan.progress_milestones.length > 0 && (
                        <div>
                          <div className="text-white font-medium text-sm mb-2">Milestones:</div>
                          <div className="space-y-2">
                            {plan.progress_milestones.slice(0, 3).map((milestone, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                {milestone.completed ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-white/30" />
                                )}
                                <span className={milestone.completed ? 'text-green-300' : 'text-white/70'}>
                                  {milestone.milestone}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {skillProgress.map((progress, idx) => {
                const agent = agents.find(a => a.id === progress.agent_id);
                const progressPercent = ((progress.current_level - progress.starting_level) / 
                                        (progress.target_level - progress.starting_level)) * 100;
                
                return (
                  <Card key={idx} className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white text-lg">{progress.skill_name}</CardTitle>
                          <div className="text-sm text-white/60">{agent?.name}</div>
                        </div>
                        <Badge className={
                          progress.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          progress.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }>
                          {progress.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-white">{progress.starting_level}</div>
                          <div className="text-xs text-white/60">Start</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-indigo-400">{progress.current_level}</div>
                          <div className="text-xs text-white/60">Current</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-400">{progress.target_level}</div>
                          <div className="text-xs text-white/60">Target</div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-white/60">Progress to Goal</span>
                          <span className="text-white">{Math.min(100, progressPercent).toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(100, progressPercent)} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10 text-sm">
                        <div className="text-white/70">
                          <BookOpen className="w-4 h-4 inline mr-1" />
                          {progress.modules_completed?.length || 0} modules
                        </div>
                        <div className="text-white/70">
                          <Users className="w-4 h-4 inline mr-1" />
                          {progress.mentorship_hours || 0}h mentorship
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Agent Detail Dialog */}
      {selectedAgent && (
        <AgentDevelopmentDialog 
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

function AgentDevelopmentDialog({ agent, onClose }) {
  const [activeTab, setActiveTab] = useState('analysis');
  const [loading, setLoading] = useState(false);
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [tracking, setTracking] = useState(null);

  const runGapAnalysis = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('analyzeSkillGaps', { agent_id: agent.id });
      setGapAnalysis(response.data.skill_gap_analysis);
      setActiveTab('analysis');
    } catch (error) {
      console.error('Gap analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePath = async () => {
    if (!gapAnalysis) return;
    
    setLoading(true);
    try {
      const targetSkills = gapAnalysis.critical_gaps?.map(g => g.skill) || [];
      const response = await base44.functions.invoke('generateLearningPath', {
        agent_id: agent.id,
        target_skills: targetSkills,
        timeline_weeks: 12
      });
      setLearningPath(response.data.learning_path);
      setActiveTab('path');
    } catch (error) {
      console.error('Learning path error:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackProgress = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('trackSkillDevelopment', { agent_id: agent.id });
      setTracking(response.data.development_tracking);
      setActiveTab('tracking');
    } catch (error) {
      console.error('Tracking error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{agent.name} - Skill Development</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={runGapAnalysis} 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Analyze Gaps
            </Button>
            <Button 
              onClick={generatePath} 
              disabled={loading || !gapAnalysis}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Target className="w-4 h-4 mr-2" />}
              Generate Path
            </Button>
            <Button 
              onClick={trackProgress} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
              Track Progress
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/5">
              <TabsTrigger value="analysis">Gap Analysis</TabsTrigger>
              <TabsTrigger value="path">Learning Path</TabsTrigger>
              <TabsTrigger value="tracking">Progress</TabsTrigger>
            </TabsList>

            <TabsContent value="analysis" className="space-y-4">
              {gapAnalysis ? (
                <>
                  <Card className="bg-indigo-500/10 border-indigo-500/30">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        Overall Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-white/60">Skill Diversity</div>
                          <div className="text-2xl font-bold text-white">
                            {gapAnalysis.overall_assessment?.skill_diversity_score}/10
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-white/60">Focus Area</div>
                          <div className="text-lg text-indigo-300">
                            {gapAnalysis.overall_assessment?.primary_focus_area}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {gapAnalysis.critical_gaps?.length > 0 && (
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Critical Skill Gaps</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {gapAnalysis.critical_gaps.map((gap, idx) => (
                          <div key={idx} className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-red-300 font-medium">{gap.skill}</span>
                              <Badge className="bg-red-500/20 text-red-400">{gap.urgency}</Badge>
                            </div>
                            <div className="text-sm text-white/70 mb-2">{gap.rationale}</div>
                            <div className="text-xs text-green-300">
                              Impact: {gap.impact_if_developed}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-white/60">
                  Click "Analyze Gaps" to begin skill assessment
                </div>
              )}
            </TabsContent>

            <TabsContent value="path" className="space-y-4">
              {learningPath ? (
                <>
                  <Card className="bg-purple-500/10 border-purple-500/30">
                    <CardHeader>
                      <CardTitle className="text-white">{learningPath.plan_overview?.title}</CardTitle>
                      <div className="text-sm text-white/60">
                        Duration: {learningPath.plan_overview?.total_duration} • 
                        {learningPath.estimated_time_commitment?.hours_per_week}h/week
                      </div>
                    </CardHeader>
                  </Card>

                  {learningPath.learning_phases?.map((phase, idx) => (
                    <Card key={idx} className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">
                          Phase {phase.phase_number}: {phase.phase_name}
                        </CardTitle>
                        <div className="text-sm text-white/60">{phase.duration_weeks} weeks</div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {phase.activities?.map((activity, aidx) => (
                          <div key={aidx} className="text-sm text-white/70">• {activity}</div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                <div className="text-center py-12 text-white/60">
                  Generate a learning path after analyzing gaps
                </div>
              )}
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4">
              {tracking ? (
                <>
                  <Card className="bg-green-500/10 border-green-500/30">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Development Health: {tracking.overall_development_health?.status}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-white/80">{tracking.overall_development_health?.trajectory}</div>
                    </CardContent>
                  </Card>

                  {tracking.achievements?.length > 0 && (
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Award className="w-5 h-5 text-yellow-400" />
                          Achievements
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {tracking.achievements.map((ach, idx) => (
                          <div key={idx} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                            <div className="text-yellow-300 font-medium">{ach.achievement}</div>
                            <div className="text-xs text-white/60 mt-1">{ach.significance}</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {tracking.next_steps?.length > 0 && (
                    <Card className="bg-white/5 border-white/10">
                      <CardHeader>
                        <CardTitle className="text-white">Next Steps</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {tracking.next_steps.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <Badge className="bg-blue-500/20 text-blue-400 mt-1">{step.priority}</Badge>
                            <div>
                              <div className="text-white">{step.action}</div>
                              <div className="text-xs text-white/60">{step.expected_impact}</div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-white/60">
                  Click "Track Progress" to view development insights
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}