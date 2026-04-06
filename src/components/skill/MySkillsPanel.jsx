import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Zap, TrendingUp, Award, Star, AlertCircle, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MySkillsPanel({ myAgent, agents = [] }) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const navigate = useNavigate();

  // Fetch skills for the current user's agent only
  const { data: mySkills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['myAgentSkills', myAgent?.id],
    queryFn: () => base44.entities.AgentSkill.filter({ agent_id: myAgent.id }, '-level', 100),
    staleTime: 10000,
    enabled: !!myAgent?.id,
  });

  // Fetch MentorshipRelationship to find skill validators
  const { data: mentorships = [] } = useQuery({
    queryKey: ['mentorships'],
    queryFn: () => base44.entities.MentorshipRelationship?.list?.('-created_date', 200) || Promise.resolve([]),
    staleTime: 15000,
  });

  if (!myAgent) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <p className="text-white/60">No agent linked to your account. Create an agent to start tracking skills.</p>
        <Button onClick={() => navigate('/AgentGenesis')} className="mx-auto bg-emerald-600 hover:bg-emerald-700 text-white">
          Create Agent
        </Button>
      </div>
    );
  }

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
        <p className="text-white/60">No skills recorded for <span className="text-white font-semibold">{myAgent.name}</span> yet.</p>
        <Button onClick={() => navigate('/training')} className="mx-auto bg-emerald-600 hover:bg-emerald-700 text-white">
          Start Training
        </Button>
      </div>
    );
  }

  // Compute estimated proficiency from level if proficiency_score is 0
  const estimateProficiency = (skill) => {
    if (skill.proficiency_score && skill.proficiency_score > 0) return skill.proficiency_score;
    // Derive from level: level 1 = 10%, level 10 = 100%
    return Math.round((skill.level / (skill.max_level || 10)) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Agent Identity Bar */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
        {myAgent.avatar_url ? (
          <img src={myAgent.avatar_url} alt={myAgent.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-400/30 flex items-center justify-center">
            <span className="text-emerald-300 font-bold text-xs">{myAgent.name?.[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{myAgent.name}'s Skills</p>
          <p className="text-white/40 text-xs capitalize">{myAgent.role} · {mySkills.length} skills</p>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mySkills.map(skill => {
          const proficiency = estimateProficiency(skill);
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
                  <p className="text-white/40 text-xs mt-0.5 capitalize">{skill.skill_category}</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  Lv. {skill.level}/{skill.max_level || 10}
                </Badge>
              </div>

              {/* Proficiency Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Proficiency</span>
                  <span className="text-emerald-300 font-semibold">{proficiency}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                    style={{ width: `${proficiency}%` }}
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
                {skill.skill_growth_trajectory && skill.skill_growth_trajectory !== 'stable' && (
                  <Badge className={`text-[10px] ${
                    skill.skill_growth_trajectory === 'accelerating' ? 'bg-green-500/20 text-green-300' :
                    skill.skill_growth_trajectory === 'growing' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {skill.skill_growth_trajectory}
                  </Badge>
                )}
                {skill.is_signature_skill && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3" />
                    Signature
                  </div>
                )}
              </div>

              {/* Validator */}
              {validatorAgent && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-white/50 uppercase tracking-wide">Validated by</p>
                  <div className="flex items-center gap-2">
                    {validatorAgent.avatar_url ? (
                      <img src={validatorAgent.avatar_url} alt={validatorAgent.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-400/30 flex-shrink-0" />
                    )}
                    <span className="text-white text-xs font-medium flex-1">{validatorAgent.name}</span>
                    {validatorAgent.wallet_id && <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                  </div>
                </div>
              )}

              {/* Action Buttons — now functional */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => setSelectedSkill(selectedSkill?.id === skill.id ? null : skill)}
                >
                  <Eye className="w-3 h-3 mr-1" /> {selectedSkill?.id === skill.id ? 'Hide' : 'Details'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => navigate('/SkillValidation')}
                >
                  <Award className="w-3 h-3 mr-1" /> Endorse
                </Button>
              </div>

              {/* Expanded Details */}
              {selectedSkill?.id === skill.id && (
                <div className="border-t border-white/10 pt-3 space-y-2 text-xs">
                  {skill.skill_description && <p className="text-white/60">{skill.skill_description}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-white/40">XP Invested:</span> <span className="text-white">{skill.experience_invested || 0}</span></div>
                    <div><span className="text-white/40">Path:</span> <span className="text-white">{skill.skill_path || 'General'}</span></div>
                    {skill.unlocked_at && <div><span className="text-white/40">Unlocked:</span> <span className="text-white">{new Date(skill.unlocked_at).toLocaleDateString()}</span></div>}
                    {skill.last_upgraded && <div><span className="text-white/40">Last Upgrade:</span> <span className="text-white">{new Date(skill.last_upgraded).toLocaleDateString()}</span></div>}
                  </div>
                  {skill.certifications?.length > 0 && (
                    <div>
                      <p className="text-white/40 mb-1">Certifications:</p>
                      {skill.certifications.map((cert, i) => (
                        <Badge key={i} className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px] mr-1">{cert.name}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}