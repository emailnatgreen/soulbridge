import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, ShieldCheck, Activity, Loader2 } from 'lucide-react';
import SkillEndorseCard from '@/components/skills/SkillEndorseCard';
import EndorsementList from '@/components/skills/EndorsementList';
import ReputationTimeline from '@/components/skills/ReputationTimeline';

export default function SkillValidation() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents-all'],
    queryFn: () => base44.entities.Agent.list('-created_date', 500),
  });

  const { data: endorsements = [], isLoading: endorsementsLoading } = useQuery({
    queryKey: ['endorsements'],
    queryFn: () => base44.entities.SkillEndorsement.list('-created_date', 500),
  });

  const { data: reputationEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['reputation-events'],
    queryFn: () => base44.entities.ReputationEvent.list('-created_date', 500),
  });

  const loading = agentsLoading || endorsementsLoading || eventsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-light tracking-tight text-white mb-1">
            Skill <span className="font-semibold">Validation</span>
          </h1>
          <p className="text-sm text-purple-300/60">Endorse agent skills, view endorsements, and track reputation across the Village</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="endorse" className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex gap-1 h-auto w-fit">
              <TabsTrigger value="endorse" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
                <Award className="w-3.5 h-3.5" />Endorse Skills
              </TabsTrigger>
              <TabsTrigger value="endorsements" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg">
                <ShieldCheck className="w-3.5 h-3.5" />Endorsements
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-xs">{endorsements.length}</span>
              </TabsTrigger>
              <TabsTrigger value="reputation" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg">
                <Activity className="w-3.5 h-3.5" />Reputation History
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/20 text-xs">{reputationEvents.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="endorse">
              <SkillEndorseCard agents={agents} currentUser={user} />
            </TabsContent>

            <TabsContent value="endorsements">
              <EndorsementList endorsements={endorsements} agents={agents} />
            </TabsContent>

            <TabsContent value="reputation">
              <ReputationTimeline events={reputationEvents} agents={agents} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}