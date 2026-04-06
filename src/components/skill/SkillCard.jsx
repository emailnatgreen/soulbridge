import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, BookOpen, Star, TrendingUp, Award, Zap, Eye } from 'lucide-react';

export default function SkillCard({
  skill,
  variant = 'owned', // 'owned' or 'directory'
  mentor = null, // For directory variant, mentor info
  onRequestMentorship = null, // Callback for booking
  isLoading = false,
}) {
  const navigate = useNavigate();

  if (variant === 'owned') {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4 hover:bg-white/10 transition">
        {/* Skill Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">{skill.skill_name}</h3>
            <p className="text-white/40 text-xs mt-0.5 capitalize">{skill.skill_category}</p>
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
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
              style={{ width: `${skill.proficiency_score || 0}%` }}
            />
          </div>
        </div>

        {/* Stats */}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="flex-1 text-xs text-white/60 hover:text-white hover:bg-white/10" onClick={() => navigate('/training')}>
            <Eye className="w-3 h-3 mr-1" /> Details
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => navigate('/SkillValidation')}>
            <Award className="w-3 h-3 mr-1" /> Endorse
          </Button>
        </div>
      </div>
    );
  }

  // Directory variant
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4 hover:bg-white/10 transition">
      {/* Skill Header */}
      <div className="space-y-2">
        <h3 className="text-white font-semibold text-sm">{skill.name}</h3>
        <p className="text-white/40 text-xs leading-relaxed">{skill.description}</p>
      </div>

      {/* Category + Difficulty */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs capitalize">
          {skill.category}
        </Badge>
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
          {skill.level === 'master' ? '★★★ Expert' : skill.level === 'expert' ? '★★ Advanced' : '★ Novice'}
        </Badge>
      </div>

      {/* Mentor Info with DID Signal */}
      {mentor && (
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-3 space-y-2">
          <p className="text-xs text-white/50 uppercase tracking-wide">Taught by</p>
          <div className="flex items-center gap-2">
            {mentor.avatar_url ? (
              <img
                src={mentor.avatar_url}
                alt={mentor.name}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border border-teal-400/30 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{mentor.name}</p>
              {mentor.hourly_rate_rlusd && (
                <p className="text-white/40 text-[10px]">{mentor.hourly_rate_rlusd} RLUSD/hour</p>
              )}
            </div>
            {mentor.wallet_id && (
              <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0" title="DID Published" />
            )}
          </div>
          {mentor.availability_status && (
            <div className="text-xs text-white/60">
              Status: <span className="text-teal-300 capitalize">{mentor.availability_status}</span>
            </div>
          )}
        </div>
      )}

      {/* No Mentor Info */}
      {!mentor && (
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-white/50">No mentors currently offering this skill</p>
        </div>
      )}

      {/* Request Mentorship Button */}
      <Button
        onClick={() => onRequestMentorship?.(skill.id, mentor?.id)}
        disabled={!mentor || isLoading}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 disabled:opacity-50"
      >
        <BookOpen className="w-3.5 h-3.5 mr-1" /> Request Mentorship
      </Button>
    </div>
  );
}