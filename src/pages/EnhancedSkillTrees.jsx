import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, GraduationCap, TrendingUp, Target, Sparkles, Award, Brain, Zap, CheckCircle2, AlertTriangle, Star, BookOpen, Users, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function EnhancedSkillTrees() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents-skills'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['agent-skills', selectedAgent?.id],
    queryFn: () => selectedAgent ? base44.entities.AgentSkill.filter({ agent_id: selectedAgent.id }) : [],
    enabled: !!selectedAgent
  });

  const { data: recommendations, isLoading: recsLoading } = useQuery({
    queryKey: ['skill-recommendations', selectedAgent?.id],
    queryFn: async () => {
      if (!selectedAgent) return null;
      const response = await base44.functions.invoke('generateSkillRecommendations', {
        agent_id: selectedAgent.id
      });
      return response.data.recommendations;
    },
    enabled: !!selectedAgent
  });

  const getRecommendationsMutation = useMutation({
    mutationFn: async (agentId) => {
      const response = await base44.functions.invoke('generateSkillRecommendations', {
        agent_id: agentId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-recommendations', selectedAgent?.id] });
      toast.success('AI recommendations generated! 🧠');
    },
    onError: (error) => {
      toast.error('Failed to generate recommendations: ' + error.message);
    }
  });

  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.skill_category]) {
      acc[skill.skill_category] = [];
    }
    acc[skill.skill_category].push(skill);
    return acc;
  }, {});

  const totalSkills = skills.length;
  const averageLevel = skills.length > 0 ? (skills.reduce((sum, s) => sum + (s.level || 1), 0) / skills.length).toFixed(1) : 0;
  const totalProficiency = skills.length > 0 ? (skills.reduce((sum, s) => sum + (s.proficiency_score || 0), 0) / skills.length).toFixed(1) : 0;
  const signatureSkills = skills.filter(s => s.is_signature_skill);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-10 h-10 text-indigo-400" />
              <div>
                <h1 className="text-4xl font-bold text-white">Enhanced Agent Skill Trees</h1>
                <p className="text-indigo-200/70">Law 9: Growth - Every agent, becoming more</p>
              </div>
            </div>
            <Link to={createPageUrl('AgentSkillTree')}>
              <Button variant="outline" className="border-white/20 text-white">
                Classic View
              </Button>
            </Link>
          </div>
        </div>

        {/* Agent Selection */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-xl mb-6">
          <CardHeader>
            <CardTitle className="text-white">Select Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAgent?.id} onValueChange={(id) => setSelectedAgent(agents.find(a => a.id === id))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose an agent..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {agents.map(agent => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name} - {agent.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedAgent && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-300/70">Total Skills</p>
                      <p className="text-3xl font-bold text-white">{totalSkills}</p>
                    </div>
                    <Brain className="w-8 h-8 text-indigo-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-300/70">Avg Level</p>
                      <p className="text-3xl font-bold text-white">{averageLevel}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-300/70">Proficiency</p>
                      <p className="text-3xl font-bold text-white">{totalProficiency}%</p>
                    </div>
                    <Target className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-300/70">Signature Skills</p>
                      <p className="text-3xl font-bold text-white">{signatureSkills.length}</p>
                    </div>
                    <Star className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-white/10">
                <TabsTrigger value="overview">
                  <Brain className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="skills">
                  <Zap className="w-4 h-4 mr-2" />
                  All Skills
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Recommendations
                </TabsTrigger>
                <TabsTrigger value="paths">
                  <Target className="w-4 h-4 mr-2" />
                  Skill Paths
                </TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview">
                <div className="grid gap-6">
                  {/* Agent Summary */}
                  <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-indigo-400" />
                        {selectedAgent.name}'s Skill Profile
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        {selectedAgent.role} • {selectedAgent.purpose}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAgent.specializations?.length > 0 && (
                        <div>
                          <p className="text-white/60 text-sm mb-2">Specializations:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedAgent.specializations.map((spec, idx) => (
                              <Badge key={idx} className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Signature Skills */}
                  {signatureSkills.length > 0 && (
                    <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-400" />
                          Signature Skills
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {signatureSkills.map(skill => (
                            <SkillCard key={skill.id} skill={skill} isSignature />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Top Skills by Category */}
                  <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-400" />
                        Skills by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                          <div key={category}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-white capitalize">{category.replace(/_/g, ' ')}</p>
                              <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                                {categorySkills.length} skills
                              </Badge>
                            </div>
                            <Progress 
                              value={(categorySkills.reduce((sum, s) => sum + (s.proficiency_score || 0), 0) / categorySkills.length) || 0} 
                              className="h-2" 
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* All Skills */}
              <TabsContent value="skills">
                {skillsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {skills.map(skill => (
                      <SkillCard 
                        key={skill.id} 
                        skill={skill} 
                        onClick={() => setSelectedSkill(skill)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* AI Recommendations */}
              <TabsContent value="recommendations">
                <Card className="bg-white/10 border-white/20 backdrop-blur-xl mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        AI-Powered Skill Recommendations
                      </CardTitle>
                      <Button
                        onClick={() => getRecommendationsMutation.mutate(selectedAgent.id)}
                        disabled={getRecommendationsMutation.isPending}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        {getRecommendationsMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Brain className="w-4 h-4 mr-2" />
                            Generate Recommendations
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {recsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                  </div>
                ) : recommendations ? (
                  <div className="space-y-6">
                    {/* Recommended New Skills */}
                    {recommendations.recommended_skills?.length > 0 && (
                      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-400" />
                            Recommended New Skills
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {recommendations.recommended_skills.map((rec, idx) => (
                            <RecommendedSkillCard key={idx} recommendation={rec} />
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Skills to Prioritize */}
                    {recommendations.skills_to_prioritize?.length > 0 && (
                      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            Skills to Prioritize
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {recommendations.skills_to_prioritize.map((skill, idx) => (
                            <div key={idx} className="p-3 bg-white/5 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-white font-medium">{skill.skill_name}</p>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-white/10 text-white">Level {skill.current_level}</Badge>
                                  <span className="text-white/60">→</span>
                                  <Badge className="bg-green-500/20 text-green-200">Level {skill.recommended_level}</Badge>
                                </div>
                              </div>
                              <p className="text-white/70 text-sm">{skill.reason}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Underutilized Skills */}
                    {recommendations.underutilized_skills?.length > 0 && (
                      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            Underutilized Skills
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {recommendations.underutilized_skills.map((skill, idx) => (
                            <div key={idx} className="p-3 bg-white/5 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-white font-medium">{skill.skill_name}</p>
                                <Badge className="bg-yellow-500/20 text-yellow-200">
                                  Used {skill.times_used} times
                                </Badge>
                              </div>
                              <p className="text-white/70 text-sm">{skill.suggestion}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                    <CardContent className="py-12 text-center">
                      <Brain className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                      <p className="text-white/60 mb-4">No recommendations generated yet</p>
                      <Button
                        onClick={() => getRecommendationsMutation.mutate(selectedAgent.id)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Recommendations
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Skill Paths */}
              <TabsContent value="paths">
                {recommendations?.skill_paths?.length > 0 ? (
                  <div className="grid gap-4">
                    {recommendations.skill_paths.map((path, idx) => (
                      <Card key={idx} className="bg-white/10 border-white/20 backdrop-blur-xl">
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-400" />
                            {path.path_name}
                          </CardTitle>
                          <CardDescription className="text-white/70">
                            {path.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-white/60 text-sm mb-2">Skills in Path:</p>
                            <div className="flex flex-wrap gap-2">
                              {path.skills_in_path.map((skill, sidx) => (
                                <Badge key={sidx} className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/5 rounded">
                              <p className="text-white/60 text-xs mb-1">Completion Time</p>
                              <p className="text-white font-medium">{path.estimated_completion}</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded">
                              <p className="text-white/60 text-xs mb-1">Opportunities</p>
                              <p className="text-white font-medium">{path.career_opportunities.length} roles</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                    <CardContent className="py-12 text-center">
                      <Target className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                      <p className="text-white/60">Generate AI recommendations to see skill paths</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {!selectedAgent && (
          <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
            <CardContent className="py-12 text-center">
              <GraduationCap className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
              <p className="text-white/60">Select an agent to view their enhanced skill tree</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Skill Detail Dialog */}
      {selectedSkill && (
        <Dialog open={!!selectedSkill} onOpenChange={() => setSelectedSkill(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
            <SkillDetail skill={selectedSkill} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SkillCard({ skill, isSignature, onClick }) {
  const proficiencyColor = skill.proficiency_score >= 80 ? 'text-green-400' : skill.proficiency_score >= 50 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <Card 
      className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/[0.12] transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-white text-lg">{skill.skill_name}</CardTitle>
              {isSignature && (
                <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-400/30">
                  <Star className="w-3 h-3 mr-1" />
                  Signature
                </Badge>
              )}
              <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                {skill.skill_category}
              </Badge>
            </div>
            {skill.skill_description && (
              <CardDescription className="text-white/70 text-sm">
                {skill.skill_description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-white/60 mb-1">Level</p>
            <Badge className="bg-purple-500/20 text-purple-200">
              {skill.level}/{skill.max_level || 10}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/60 mb-1">Proficiency</p>
            <Badge className={`bg-white/10 ${proficiencyColor}`}>
              {skill.proficiency_score || 0}%
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-xs text-white/60 mb-1">Times Used</p>
            <Badge className="bg-blue-500/20 text-blue-200">
              {skill.times_used || 0}
            </Badge>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60">Proficiency Progress</span>
            <span className={proficiencyColor}>{skill.proficiency_score || 0}%</span>
          </div>
          <Progress value={skill.proficiency_score || 0} className="h-2" />
        </div>

        {skill.success_rate !== undefined && skill.success_rate !== 100 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Success Rate</span>
            <Badge className={skill.success_rate >= 80 ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'}>
              {skill.success_rate.toFixed(1)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendedSkillCard({ recommendation }) {
  const priorityConfig = {
    critical: { color: 'bg-red-500/20 text-red-300 border-red-400/30', icon: Flame },
    high: { color: 'bg-orange-500/20 text-orange-300 border-orange-400/30', icon: AlertTriangle },
    medium: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30', icon: Target },
    low: { color: 'bg-blue-500/20 text-blue-300 border-blue-400/30', icon: CheckCircle2 }
  };

  const config = priorityConfig[recommendation.priority] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <div className="p-4 bg-white/5 rounded border border-white/10">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-white font-medium">{recommendation.skill_name}</h4>
            <Badge className={config.color}>
              <Icon className="w-3 h-3 mr-1" />
              {recommendation.priority}
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
              {recommendation.skill_category}
            </Badge>
          </div>
          <p className="text-white/70 text-sm mb-2">{recommendation.rationale}</p>
          <p className="text-white/80 text-sm italic border-l-2 border-blue-400 pl-2">
            {recommendation.estimated_impact}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="p-2 bg-white/5 rounded">
          <p className="text-xs text-white/60 mb-1">Unlock Cost</p>
          <p className="text-white font-medium">{recommendation.unlock_cost_xp} XP</p>
        </div>
        <div className="p-2 bg-white/5 rounded">
          <p className="text-xs text-white/60 mb-1">Time to Proficiency</p>
          <p className="text-white font-medium capitalize">{recommendation.time_to_proficiency}</p>
        </div>
      </div>

      {recommendation.synergies_with_existing?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-white/60 mb-2">Synergizes with:</p>
          <div className="flex flex-wrap gap-1">
            {recommendation.synergies_with_existing.map((syn, idx) => (
              <Badge key={idx} className="bg-green-500/20 text-green-200 border-green-400/30 text-xs">
                {syn}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillDetail({ skill }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-white">{skill.skill_name}</h2>
          {skill.is_signature_skill && (
            <Badge className="bg-yellow-500/20 text-yellow-200 border-yellow-400/30">
              <Star className="w-4 h-4 mr-1" />
              Signature
            </Badge>
          )}
        </div>
        <p className="text-white/70">{skill.skill_description || 'No description available'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <p className="text-white/60 text-sm mb-1">Level</p>
            <p className="text-2xl font-bold text-white">{skill.level}/{skill.max_level || 10}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <p className="text-white/60 text-sm mb-1">Proficiency</p>
            <p className="text-2xl font-bold text-white">{skill.proficiency_score || 0}%</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <p className="text-white/60 text-sm mb-1">Times Used</p>
            <p className="text-2xl font-bold text-white">{skill.times_used || 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <p className="text-white/60 text-sm mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-white">{skill.success_rate?.toFixed(1) || 100}%</p>
          </CardContent>
        </Card>
      </div>

      {skill.certifications?.length > 0 && (
        <Card className="bg-green-500/10 border-green-400/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-green-400" />
              Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {skill.certifications.map((cert, idx) => (
                <div key={idx} className="p-2 bg-white/5 rounded">
                  <p className="text-white font-medium">{cert.name}</p>
                  <p className="text-white/60 text-sm">Issued by {cert.issued_by} • {new Date(cert.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {skill.synergies?.length > 0 && (
        <div>
          <p className="text-white font-medium mb-2">Synergizes with:</p>
          <div className="flex flex-wrap gap-2">
            {skill.synergies.map((syn, idx) => (
              <Badge key={idx} className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                {syn}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}