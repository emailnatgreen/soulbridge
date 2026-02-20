import React, { useState } from 'react';
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
import { ArrowLeft, Award, Plus, Search, Star, TrendingUp, Users, CheckCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function SkillEndorsements() {
  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: endorsements = [] } = useQuery({
    queryKey: ['skill-endorsements'],
    queryFn: () => base44.entities.SkillEndorsement.list('-created_date')
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: validations = [] } = useQuery({
    queryKey: ['skill-validations'],
    queryFn: () => base44.entities.SkillValidation.list()
  });

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || 'Unknown';
  };

  // Calculate stats
  const totalEndorsements = endorsements.length;
  const uniqueSkills = [...new Set(endorsements.map(e => e.skill_name))].length;
  const endorsedAgents = [...new Set(endorsements.map(e => e.endorsed_agent_id))].length;

  // Group endorsements by endorsed agent
  const endorsementsByAgent = endorsements.reduce((acc, endorsement) => {
    if (!acc[endorsement.endorsed_agent_id]) {
      acc[endorsement.endorsed_agent_id] = [];
    }
    acc[endorsement.endorsed_agent_id].push(endorsement);
    return acc;
  }, {});

  // Get top endorsed agents
  const topEndorsedAgents = Object.entries(endorsementsByAgent)
    .map(([agentId, endorsements]) => ({
      agentId,
      count: endorsements.length,
      avgStrength: endorsements.reduce((sum, e) => sum + (e.strength || 7), 0) / endorsements.length
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Filter endorsements
  const filteredEndorsements = endorsements.filter(e => {
    const agentName = getAgentName(e.endorsed_agent_id).toLowerCase();
    const endorserName = getAgentName(e.endorser_agent_id).toLowerCase();
    const skillName = e.skill_name.toLowerCase();
    const search = searchTerm.toLowerCase();
    return agentName.includes(search) || endorserName.includes(search) || skillName.includes(search);
  });

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
                <h1 className="text-2xl font-light text-white">Skill Endorsements</h1>
                <p className="text-sm text-purple-300/60">Peer validation and recognition</p>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Endorse Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Skill Endorsement</DialogTitle>
                </DialogHeader>
                <EndorsementForm
                  agents={agents}
                  validations={validations}
                  onClose={() => setCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Endorsements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalEndorsements}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Unique Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{uniqueSkills}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Endorsed Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{endorsedAgents}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Avg per Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {endorsedAgents > 0 ? (totalEndorsements / endorsedAgents).toFixed(1) : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search by agent, endorser, or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
              All Endorsements
            </TabsTrigger>
            <TabsTrigger value="top" className="data-[state=active]:bg-purple-600">
              Top Endorsed
            </TabsTrigger>
            <TabsTrigger value="by-skill" className="data-[state=active]:bg-purple-600">
              By Skill
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {filteredEndorsements.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="text-center py-12">
                  <Award className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl text-white mb-2">No Endorsements Yet</h3>
                  <p className="text-white/60 mb-6">Start building trust by endorsing your peers</p>
                  <Button onClick={() => setCreateOpen(true)} className="bg-purple-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Endorsement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredEndorsements.map(endorsement => (
                  <EndorsementCard
                    key={endorsement.id}
                    endorsement={endorsement}
                    agents={agents}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="top" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topEndorsedAgents.map((item, idx) => {
                const agent = agents.find(a => a.id === item.agentId);
                const agentEndorsements = endorsementsByAgent[item.agentId];
                const skills = [...new Set(agentEndorsements.map(e => e.skill_name))];
                
                return (
                  <Card key={item.agentId} className="bg-white/5 backdrop-blur-xl border-white/10">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold">
                            #{idx + 1}
                          </div>
                          <div>
                            <CardTitle className="text-xl text-white">{agent?.name || 'Unknown'}</CardTitle>
                            <p className="text-sm text-white/60">{item.count} endorsements</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-5 h-5 fill-current" />
                          <span className="font-medium">{item.avgStrength.toFixed(1)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {skills.slice(0, 5).map(skill => (
                          <Badge key={skill} className="bg-purple-500/20 text-purple-300">
                            {skill}
                          </Badge>
                        ))}
                        {skills.length > 5 && (
                          <Badge className="bg-white/10 text-white/60">
                            +{skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="by-skill" className="space-y-4">
            <SkillBreakdown endorsements={endorsements} agents={agents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EndorsementCard({ endorsement, agents }) {
  const endorserName = agents.find(a => a.id === endorsement.endorser_agent_id)?.name || 'Unknown';
  const endorsedName = agents.find(a => a.id === endorsement.endorsed_agent_id)?.name || 'Unknown';
  
  const levelColors = {
    1: 'bg-gray-500/20 text-gray-300',
    2: 'bg-blue-500/20 text-blue-300',
    3: 'bg-green-500/20 text-green-300',
    4: 'bg-yellow-500/20 text-yellow-300',
    5: 'bg-purple-500/20 text-purple-300'
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white/60 text-sm">
                <span className="text-blue-300 font-medium">{endorserName}</span>
                {' '}endorsed{' '}
                <span className="text-purple-300 font-medium">{endorsedName}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl text-white font-medium">{endorsement.skill_name}</h3>
              <Badge className={levelColors[endorsement.proficiency_level]}>
                Level {endorsement.proficiency_level}
              </Badge>
              {endorsement.verified_by_ai && (
                <Badge className="bg-green-500/20 text-green-300">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  AI Verified
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-yellow-400">
            <Star className="w-5 h-5 fill-current" />
            <span className="font-medium">{endorsement.strength || 7}</span>
          </div>
        </div>
        
        {endorsement.context && (
          <p className="text-white/70 text-sm mb-3 italic">"{endorsement.context}"</p>
        )}
        
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{new Date(endorsement.created_date).toLocaleDateString()}</span>
          {endorsement.skill_category && (
            <Badge variant="outline" className="border-white/20 text-white/60">
              {endorsement.skill_category}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EndorsementForm({ agents, validations, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    endorsed_agent_id: '',
    skill_name: '',
    skill_category: '',
    proficiency_level: 3,
    strength: 7,
    context: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Check if skill is AI validated
      const validation = validations.find(
        v => v.agent_id === data.endorsed_agent_id && 
             v.skill_name === data.skill_name && 
             v.status === 'completed'
      );
      
      return base44.entities.SkillEndorsement.create({
        ...data,
        verified_by_ai: !!validation
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['skill-endorsements']);
      toast.success('Endorsement created successfully!');
      onClose();
    }
  });

  const selectedAgent = agents.find(a => a.id === formData.endorsed_agent_id);
  const agentSkills = selectedAgent?.core_skills || [];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-white text-sm mb-2 block">Agent to Endorse</label>
        <Select value={formData.endorsed_agent_id} onValueChange={(v) => setFormData({...formData, endorsed_agent_id: v})}>
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
        <label className="text-white text-sm mb-2 block">Skill Name</label>
        <Input
          value={formData.skill_name}
          onChange={(e) => setFormData({...formData, skill_name: e.target.value})}
          placeholder="e.g., JavaScript, Project Management, Research"
          className="bg-white/5 border-white/10 text-white"
        />
        {agentSkills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-xs text-white/60">Quick select:</span>
            {agentSkills.map(skill => (
              <Button
                key={skill.name}
                variant="ghost"
                size="sm"
                onClick={() => setFormData({...formData, skill_name: skill.name})}
                className="h-6 text-xs bg-white/5 hover:bg-white/10 text-white/80"
              >
                {skill.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Skill Category</label>
        <Input
          value={formData.skill_category}
          onChange={(e) => setFormData({...formData, skill_category: e.target.value})}
          placeholder="e.g., technical, creative, leadership"
          className="bg-white/5 border-white/10 text-white"
        />
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Proficiency Level (1-5)</label>
        <Select value={formData.proficiency_level.toString()} onValueChange={(v) => setFormData({...formData, proficiency_level: parseInt(v)})}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="1">1 - Beginner</SelectItem>
            <SelectItem value="2">2 - Basic</SelectItem>
            <SelectItem value="3">3 - Intermediate</SelectItem>
            <SelectItem value="4">4 - Advanced</SelectItem>
            <SelectItem value="5">5 - Expert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Endorsement Strength (1-10)</label>
        <Select value={formData.strength.toString()} onValueChange={(v) => setFormData({...formData, strength: parseInt(v)})}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            {[...Array(10)].map((_, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>
                {i + 1} {i + 1 >= 8 ? '⭐' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-white text-sm mb-2 block">Context & Evidence</label>
        <Textarea
          value={formData.context}
          onChange={(e) => setFormData({...formData, context: e.target.value})}
          placeholder="Describe how you witnessed this skill in action..."
          className="bg-white/5 border-white/10 text-white"
          rows={4}
        />
      </div>

      <Button
        onClick={() => createMutation.mutate(formData)}
        disabled={!formData.endorsed_agent_id || !formData.skill_name || createMutation.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        <Award className="w-4 h-4 mr-2" />
        Create Endorsement
      </Button>
    </div>
  );
}

function SkillBreakdown({ endorsements, agents }) {
  const skillGroups = endorsements.reduce((acc, endorsement) => {
    if (!acc[endorsement.skill_name]) {
      acc[endorsement.skill_name] = [];
    }
    acc[endorsement.skill_name].push(endorsement);
    return acc;
  }, {});

  const skillStats = Object.entries(skillGroups)
    .map(([skill, endorsements]) => ({
      skill,
      count: endorsements.length,
      avgLevel: endorsements.reduce((sum, e) => sum + e.proficiency_level, 0) / endorsements.length,
      avgStrength: endorsements.reduce((sum, e) => sum + (e.strength || 7), 0) / endorsements.length,
      uniqueAgents: [...new Set(endorsements.map(e => e.endorsed_agent_id))].length
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {skillStats.map(stat => (
        <Card key={stat.skill} className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg text-white">{stat.skill}</CardTitle>
              <Badge className="bg-purple-500/20 text-purple-300">
                {stat.count} endorsements
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Unique Agents</span>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-white">{stat.uniqueAgents}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Avg Level</span>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-white">{stat.avgLevel.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Avg Strength</span>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-white">{stat.avgStrength.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}