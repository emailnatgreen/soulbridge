import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, TrendingUp, Calendar, Target, CheckCircle2, Clock, AlertCircle, Loader } from 'lucide-react';

export default function DevelopmentPathsPanel({ currentUser, agents = [] }) {
  // Fetch development plans for current user
  const { data: devPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['devPlans', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.SkillDevelopmentPlan?.filter?.(
        { agent_id: currentUser.id },
        '-created_date',
        50
      ) || [];
    },
    staleTime: 15000,
    enabled: !!currentUser,
  });

  // Fetch skill progress records
  const { data: skillProgress = [] } = useQuery({
    queryKey: ['skillProgress', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.SkillProgress?.filter?.(
        { agent_id: currentUser.id },
        '-updated_date',
        100
      ) || [];
    },
    staleTime: 15000,
    enabled: !!currentUser,
  });

  // Fetch mentor profiles for assigned mentors
  const { data: mentorProfiles = [] } = useQuery({
    queryKey: ['mentorProfiles'],
    queryFn: () => base44.entities.MentorProfile?.list?.('-created_date', 100) || Promise.resolve([]),
    staleTime: 15000,
  });

  // Enrich development plans with progress and mentor data
  const enrichedPlans = useMemo(() => {
    return devPlans.map(plan => {
      const planProgress = skillProgress.filter(sp => sp.plan_id === plan.id);
      const mentor = agents.find(a => a.id === plan.assigned_mentor_id);
      const mentorProfile = mentorProfiles.find(mp => mp.agent_id === plan.assigned_mentor_id);

      // Calculate overall progress
      const completedMilestones = planProgress.filter(sp => sp.status === 'completed').length;
      const totalMilestones = planProgress.length || 1;
      const progressPercentage = Math.round((completedMilestones / totalMilestones) * 100);

      return {
        ...plan,
        mentor,
        mentorProfile,
        progress: planProgress,
        completedMilestones,
        totalMilestones,
        progressPercentage,
      };
    });
  }, [devPlans, skillProgress, agents, mentorProfiles]);

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (enrichedPlans.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-white/40 mx-auto" />
        <div>
          <p className="text-white/60 text-sm mb-3">No development paths yet.</p>
          <p className="text-white/40 text-xs">Request mentorship in the Skill Directory to start your growth journey.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {enrichedPlans.map(plan => (
        <div
          key={plan.id}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6"
        >
          {/* Plan Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg">{plan.skill_name}</h3>
              <p className="text-white/50 text-sm mt-0.5">{plan.description}</p>
            </div>
            <Badge className={`flex-shrink-0 ${
              plan.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
              plan.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
              'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              {plan.status}
            </Badge>
          </div>

          {/* Mentor Card with DID Signal */}
          {plan.mentor && (
            <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <p className="text-xs uppercase text-emerald-400 tracking-widest">Your Mentor</p>
              
              <div className="flex items-center gap-3">
                {plan.mentor.avatar_url ? (
                  <img
                    src={plan.mentor.avatar_url}
                    alt={plan.mentor.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-300 font-bold">{plan.mentor.name?.[0] || '?'}</span>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">{plan.mentor.name}</p>
                    {plan.mentor.wallet_id && (
                      <Shield className="w-4 h-4 text-green-400 flex-shrink-0" title="DID Published" />
                    )}
                  </div>
                  <p className="text-white/40 text-xs capitalize">{plan.mentor.role || 'Mentor'}</p>
                </div>
              </div>

              {/* Mentor Details */}
              {plan.mentorProfile && (
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-emerald-500/20">
                  <div>
                    <p className="text-white/60">Availability</p>
                    <p className="text-emerald-300 capitalize mt-0.5">{plan.mentorProfile.availability_hours_weekly || 0}h/week</p>
                  </div>
                  <div>
                    <p className="text-white/60">Style</p>
                    <p className="text-emerald-300 capitalize mt-0.5">{plan.mentorProfile.mentorship_style || 'coaching'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-medium text-sm">Overall Progress</span>
              </div>
              <span className="text-emerald-400 font-semibold text-sm">{plan.progressPercentage}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${plan.progressPercentage}%` }}
              />
            </div>
            <p className="text-white/50 text-xs">
              {plan.completedMilestones} of {plan.totalMilestones} milestones completed
            </p>
          </div>

          {/* Target Skill Level */}
          {plan.target_proficiency && (
            <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
              <Target className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-white/60 text-xs">Target Proficiency</p>
                <p className="text-amber-300 font-semibold text-sm">{plan.target_proficiency}/10</p>
              </div>
            </div>
          )}

          {/* Timeline of Milestones */}
          {plan.progress && plan.progress.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-white font-medium text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Milestone Timeline
              </h4>
              
              <div className="space-y-2">
                {plan.progress.map((milestone, idx) => (
                  <div key={milestone.id} className="flex gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        milestone.status === 'completed'
                          ? 'bg-green-500/30 border-green-500'
                          : milestone.status === 'in_progress'
                          ? 'bg-blue-500/30 border-blue-500'
                          : 'bg-white/10 border-white/20'
                      }`}>
                        {milestone.status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        )}
                      </div>
                      {idx < plan.progress.length - 1 && (
                        <div className="w-0.5 h-8 bg-gradient-to-b from-white/20 to-transparent" />
                      )}
                    </div>

                    {/* Milestone content */}
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-white font-medium text-sm">{milestone.milestone_name || `Milestone ${idx + 1}`}</p>
                          {milestone.description && (
                            <p className="text-white/40 text-xs mt-1">{milestone.description}</p>
                          )}
                        </div>
                        <Badge className={`flex-shrink-0 text-[10px] ${
                          milestone.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                          milestone.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          'bg-white/10 text-white/60 border-white/20'
                        }`}>
                          {milestone.status === 'in_progress' && <Clock className="w-2.5 h-2.5 mr-1" />}
                          {milestone.status || 'pending'}
                        </Badge>
                      </div>
                      
                      {milestone.target_date && (
                        <p className="text-white/40 text-xs mt-2">
                          Target: {new Date(milestone.target_date).toLocaleDateString()}
                        </p>
                      )}

                      {milestone.completed_date && (
                        <p className="text-green-400 text-xs mt-1">
                          Completed: {new Date(milestone.completed_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <Button variant="ghost" size="sm" className="flex-1 text-xs text-white/60 hover:text-white hover:bg-white/10">
              View Details
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
              Update Progress
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}