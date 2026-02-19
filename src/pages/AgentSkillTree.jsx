import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Zap, Target, Users, Wrench, Brain, Shield, Award } from 'lucide-react';
import SkillTreeVisualizer from '../components/SkillTreeVisualizer';

const CATEGORY_ICONS = {
  governance: Shield,
  resource_management: Target,
  diplomacy: Users,
  technical: Wrench,
  wisdom: Brain,
  combat: Award
};

export default function AgentSkillTree() {
  const [selectedAgent, setSelectedAgent] = useState('');
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: agentSkills = [] } = useQuery({
    queryKey: ['agentSkills', selectedAgent],
    queryFn: () => selectedAgent ? base44.entities.AgentSkill.filter({ agent_id: selectedAgent }) : [],
    enabled: !!selectedAgent
  });

  const { data: agentState } = useQuery({
    queryKey: ['agentState', selectedAgent],
    queryFn: async () => {
      const states = await base44.entities.AgentState.filter({ agent_id: selectedAgent });
      return states[0] || { experience: 0 };
    },
    enabled: !!selectedAgent
  });

  const unlockMutation = useMutation({
    mutationFn: async (skillId) => {
      const response = await base44.functions.invoke('unlockSkill', {
        agent_id: selectedAgent,
        skill_id: skillId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agentSkills', selectedAgent]);
      queryClient.invalidateQueries(['agentState', selectedAgent]);
    }
  });

  const upgradeMutation = useMutation({
    mutationFn: async (skillId) => {
      const response = await base44.functions.invoke('upgradeSkill', {
        agent_id: selectedAgent,
        skill_id: skillId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agentSkills', selectedAgent]);
      queryClient.invalidateQueries(['agentState', selectedAgent]);
    }
  });

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  const skillsByCategory = {
    governance: agentSkills.filter(s => s.skill_category === 'governance'),
    resource_management: agentSkills.filter(s => s.skill_category === 'resource_management'),
    diplomacy: agentSkills.filter(s => s.skill_category === 'diplomacy'),
    technical: agentSkills.filter(s => s.skill_category === 'technical'),
    wisdom: agentSkills.filter(s => s.skill_category === 'wisdom'),
    combat: agentSkills.filter(s => s.skill_category === 'combat')
  };

  const totalSkills = agentSkills.length;
  const masteredSkills = agentSkills.filter(s => s.level === 5).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
                  <Zap className="w-8 h-8 text-yellow-400" />
                  Agent Skill Trees
                </h1>
                <p className="text-sm text-purple-300/60">Unlock and upgrade abilities with experience points</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Agent Selection */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Select Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose an agent to view their skill tree..." />
              </SelectTrigger>
              <SelectContent>
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
            {/* Stats Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Available XP</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-light text-yellow-400">
                    {agentState?.experience || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Total Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-light text-white">{totalSkills}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Mastered</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-light text-green-400">{masteredSkills}</p>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white/60">Wisdom</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-light text-blue-400">
                    {agentState?.wisdom || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Skill Trees */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  {selectedAgentData?.name}'s Skill Trees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="governance" className="w-full">
                  <TabsList className="grid grid-cols-6 bg-white/5">
                    {Object.keys(skillsByCategory).map(category => {
                      const Icon = CATEGORY_ICONS[category];
                      const count = skillsByCategory[category].length;
                      return (
                        <TabsTrigger 
                          key={category} 
                          value={category}
                          className="data-[state=active]:bg-white/10"
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {category.replace(/_/g, ' ')}
                          {count > 0 && (
                            <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30">
                              {count}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {Object.keys(skillsByCategory).map(category => (
                    <TabsContent key={category} value={category} className="mt-6">
                      <SkillTreeVisualizer 
                        category={category}
                        agentSkills={agentSkills}
                        agentExperience={agentState?.experience || 0}
                        onUnlock={(skillId) => unlockMutation.mutate(skillId)}
                        onUpgrade={(skillId) => upgradeMutation.mutate(skillId)}
                        isLoading={unlockMutation.isPending || upgradeMutation.isPending}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}

        {!selectedAgent && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="py-12 text-center">
              <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <p className="text-white/60">Select an agent above to view and manage their skill trees</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}