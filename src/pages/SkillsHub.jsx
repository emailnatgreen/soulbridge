import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MySkillsPanel from '@/components/skill/MySkillsPanel';
import SkillDirectoryPanel from '@/components/skill/SkillDirectoryPanel';
import { BookOpen, Users, Map, Loader } from 'lucide-react';

export default function SkillsHub() {
  const [activeTab, setActiveTab] = useState('my-skills');

  // Fetch current user's agent
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });

  // Fetch all agents for DID signals
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
    staleTime: 15000,
  });

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

  const isLoading = agentsLoading;

  // Calculate statistics
  const totalMentors = mentorProfiles.length;
  const totalSkillsInVillage = new Set(allAgentSkills.map(s => s.skill_id)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-400" />
              Skills Management Hub
            </h1>
            <p className="text-white/40 text-sm mt-0.5">Develop expertise, discover mentors, and grow your talents</p>
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

            {/* Tab 1: My Skills */}
            <TabsContent value="my-skills" className="space-y-4 mt-6">
              <MySkillsPanel currentUser={currentUser} agents={agents} />
            </TabsContent>

            {/* Tab 2: Skill Directory */}
            <TabsContent value="skill-directory" className="space-y-4 mt-6">
              <SkillDirectoryPanel currentUser={currentUser} agents={agents} />
            </TabsContent>

            {/* Tab 3: Development Paths */}
            <TabsContent value="development-paths" className="space-y-4 mt-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-white/60 text-sm">Development Paths coming in Phase 3</p>
              </div>
            </TabsContent>
          </Tabs>
        )}

      </div>
    </div>
  );
}