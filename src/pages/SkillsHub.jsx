import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MySkillsPanel from '@/components/skill/MySkillsPanel';
import SkillDirectoryPanel from '@/components/skill/SkillDirectoryPanel';
import DevelopmentPathsPanel from '@/components/skill/DevelopmentPathsPanel';
import { BookOpen, Users, Map, Loader, AlertCircle } from 'lucide-react';
import BackToHomeButton from '../components/BackToHomeButton';
import { useMyAgent } from '@/hooks/useMyAgent';

export default function SkillsHub() {
  const [activeTab, setActiveTab] = useState('my-skills');

  // Resolve current user to their Agent entity
  const { user: currentUser, myAgent, allAgents: agents, isLoading: identityLoading } = useMyAgent();

  // Fetch mentor profiles
  const { data: mentorProfiles = [] } = useQuery({
    queryKey: ['mentorProfiles'],
    queryFn: () => base44.entities.MentorProfile?.list?.('-created_date', 100) || Promise.resolve([]),
    staleTime: 15000,
  });

  // Fetch agent skills for statistics
  const { data: allAgentSkills = [] } = useQuery({
    queryKey: ['allAgentSkills'],
    queryFn: () => base44.entities.AgentSkill?.list?.('-created_date', 500) || Promise.resolve([]),
    staleTime: 15000,
  });

  const isLoading = identityLoading;

  // Calculate statistics
  const totalMentors = mentorProfiles.length;
  const totalSkillsInVillage = new Set(allAgentSkills.map(s => s.skill_id)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <BackToHomeButton />
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                Skills Management Hub
              </h1>
              <p className="text-white/40 text-sm mt-0.5">Develop expertise, discover mentors, and grow your talents</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Statistics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Village Skills</p>
                <p className="text-2xl font-bold text-white">{totalSkillsInVillage}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-teal-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Active Mentors</p>
                <p className="text-2xl font-bold text-white">{totalMentors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Map className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide">Learning Paths</p>
                <p className="text-2xl font-bold text-white">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10 rounded-xl p-1">
              <TabsTrigger value="my-skills" className="data-[state=active]:bg-emerald-500/30 data-[state=active]:text-emerald-300">
                My Skills
              </TabsTrigger>
              <TabsTrigger value="skill-directory" className="data-[state=active]:bg-teal-500/30 data-[state=active]:text-teal-300">
                Skill Directory
              </TabsTrigger>
              <TabsTrigger value="development-paths" className="data-[state=active]:bg-cyan-500/30 data-[state=active]:text-cyan-300">
                Development Paths
              </TabsTrigger>
            </TabsList>

            {/* Agent identity notice */}
            {!myAgent && !isLoading && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-300 font-medium text-sm">No agent linked to your account</p>
                  <p className="text-white/50 text-xs mt-1">Your skills and development paths are tied to your Agent identity. Create an agent or ask an admin to link one to your account.</p>
                </div>
              </div>
            )}

            {/* Tab 1: My Skills */}
            <TabsContent value="my-skills" className="space-y-4 mt-6">
              <MySkillsPanel myAgent={myAgent} agents={agents} />
            </TabsContent>

            {/* Tab 2: Skill Directory */}
            <TabsContent value="skill-directory" className="space-y-4 mt-6">
              <SkillDirectoryPanel myAgent={myAgent} agents={agents} />
            </TabsContent>

            {/* Tab 3: Development Paths */}
            <TabsContent value="development-paths" className="space-y-4 mt-6">
              <DevelopmentPathsPanel myAgent={myAgent} agents={agents} />
            </TabsContent>
          </Tabs>
        )}

      </div>
    </div>
  );
}