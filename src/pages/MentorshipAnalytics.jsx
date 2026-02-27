import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Loader2 } from 'lucide-react';

import AnalyticsOverviewCards from '@/components/mentorship/AnalyticsOverviewCards';
import StyleEffectivenessChart from '@/components/mentorship/StyleEffectivenessChart';
import SkillProgressPanel from '@/components/mentorship/SkillProgressPanel';
import RelationshipStatusChart from '@/components/mentorship/RelationshipStatusChart';
import TopMentorsTable from '@/components/mentorship/TopMentorsTable';

export default function MentorshipAnalytics() {
  const { data: relationships = [], isLoading: loadingRel } = useQuery({
    queryKey: ['allRelationships'],
    queryFn: () => base44.entities.MentorshipRelationship.list()
  });

  const { data: mentorProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['allMentorProfiles'],
    queryFn: () => base44.entities.MentorProfile.list()
  });

  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['allSessions'],
    queryFn: () => base44.entities.MentorshipSession.list()
  });

  const isLoading = loadingRel || loadingProfiles || loadingAgents || loadingSessions;

  // Compute overview stats
  const activeRelationships = relationships.filter(r => r.status === 'active');
  const completedRelationships = relationships.filter(r => r.status === 'completed');
  const totalSessions = relationships.reduce((sum, r) => sum + (r.sessions_completed || 0), 0);
  const totalHours = relationships.reduce((sum, r) => sum + (r.total_hours || 0), 0);
  const satisfactions = relationships
    .map(r => r.mentee_satisfaction)
    .filter(s => s != null && s > 0);
  const avgSatisfaction = satisfactions.length > 0
    ? satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length
    : 0;
  const completionRate = relationships.length > 0
    ? (completedRelationships.length / relationships.length) * 100
    : 0;
  const activeMentors = new Set(activeRelationships.map(r => r.mentor_agent_id)).size;

  const stats = {
    activeCount: activeRelationships.length,
    totalSessions,
    totalHours,
    avgSatisfaction,
    completionRate,
    activeMentors
  };

  // Session booking stats
  const requestedSessions = sessions.filter(s => s.status === 'requested').length;
  const confirmedSessions = sessions.filter(s => s.status === 'confirmed').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('MentorshipHub')}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-light text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                Mentorship Analytics
              </h1>
              <p className="text-sm text-purple-300/60">Law 9: Measure, Learn, and Grow Together</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <AnalyticsOverviewCards stats={stats} />

            {/* Session Booking Funnel */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Sessions Requested', value: requestedSessions, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                { label: 'Sessions Confirmed', value: confirmedSessions, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                { label: 'Sessions Completed', value: completedSessions, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' }
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                  <div className="text-xs text-white/50 mb-1">{label}</div>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StyleEffectivenessChart
                relationships={relationships}
                mentorProfiles={mentorProfiles}
              />
              <RelationshipStatusChart relationships={relationships} />
            </div>

            {/* Skill Progress + Top Mentors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkillProgressPanel relationships={relationships} />
              <TopMentorsTable
                relationships={relationships}
                agents={agents}
                mentorProfiles={mentorProfiles}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}