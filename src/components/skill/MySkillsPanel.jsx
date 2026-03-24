import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, TrendingUp, Award, Star, AlertCircle } from 'lucide-react';

export default function MySkillsPanel({ currentUser, agents = [] }) {
  // Fetch skills for current agent
  const { data: mySkills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['mySkills', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      // Fetch skills and filter by user's agent if they have one
      const allSkills = await base44.entities.AgentSkill?.list?.('-updated_date', 500) || [];
      // This would need the agent_id association — for now, show all AgentSkill records
      return allSkills;
    },
    staleTime: 10000,
    enabled: !!currentUser,
  });

  // Fetch MentorshipRelationship to find skill validators
  const { data: mentorships = [] } = useQuery({
    queryKey: ['mentorships'],
    queryFn: () => base44.entities.MentorshipRelationship?.list?.('-created_date', 200) || Promise.resolve([]),
    staleTime: 15000,
  });

  if (skillsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (mySkills.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-white/40 mx-auto" />
        <p className="text-white/60">No skills recorded yet. Begin your learning journey!</p>
        <Button className="mx-auto bg-emerald-600 hover:bg-emerald-700 text-white">
          Start Learning
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mySkills.map(skill => {
          // Find mentor who validated this skill (if any)
          const validatorMentorshipId = skill.certifications?.[0]?.issued_by;
          const validatorMentor = validatorMentorshipId
            ? mentorships.find(m => m.id === validatorMentorshipId)
            : null;
          const validatorAgent = validatorMentor
            ? agents.find(a => a.id === validatorMentor.mentor_agent_id)
            : null;

          return (
            <div
              key={skill.id}
              className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4 hover:bg-white/10 transition"
            >
              {/* Skill Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-sm">{skill.skill_name}</h3>
                  <p className="text-white/40 text-xs mt-0.5">{skill.skill_category}</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  Lv. {skill.level}/10
                </Badge>
              </div>

              {/* Proficiency Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Proficiency</span>
                  <span className="text-emerald-300 font-semibold">{skill.proficiency_score || 0}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                    style={{ width: `${skill.proficiency_score || 0}%` }}
                  />
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {skill.times_used || 0} uses
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {skill.success_rate || 100}% success
                </div>
                {skill.is_signature_skill && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3" />
                    Signature
                  </div>
                )}
              </div>

              {/* Validator/Certifier with DID Signal */}
              {validatorAgent && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-white/50 uppercase tracking-wide">Validated by</p>
                  <div className="flex items-center gap-2">
                    {validatorAgent.avatar_url ? (
                      <img
                        src={validatorAgent.avatar_url}
                        alt={validatorAgent.name}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-400/30 flex-shrink-0" />
                    )}
                    <span className="text-white text-xs font-medium flex-1">{validatorAgent.name}</span>
                    {validatorAgent.wallet_id && (
                      <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0" title="DID Published" />
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="flex-1 text-xs text-white/60 hover:text-white hover:bg-white/10">
                  View Details
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                  <Award className="w-3 h-3 mr-1" /> Endorse
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}