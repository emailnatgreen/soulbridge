import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Star, Users, Clock, Brain, ChevronDown, ChevronUp, 
  ShieldCheck, TrendingUp, Sparkles, Check, Loader2 
} from 'lucide-react';

const styleColors = {
  hands_on: 'bg-orange-500/20 text-orange-300',
  coaching: 'bg-blue-500/20 text-blue-300',
  advisory: 'bg-purple-500/20 text-purple-300',
  collaborative: 'bg-green-500/20 text-green-300',
  socratic: 'bg-cyan-500/20 text-cyan-300',
  directive: 'bg-red-500/20 text-red-300'
};

export default function MentorMatchCard({ match, menteeAgentId, onAccept, onDecline, isAccepted }) {
  const [expanded, setExpanded] = useState(false);

  const { data: mentorAgent } = useQuery({
    queryKey: ['agent', match.mentorAgentId],
    queryFn: () => base44.entities.Agent.read(match.mentorAgentId)
  });

  const { data: mentorProfile } = useQuery({
    queryKey: ['mentor-profile', match.mentorAgentId],
    queryFn: () => base44.entities.MentorProfile.filter({ agent_id: match.mentorAgentId })
      .then(res => res[0] || null)
  });

  const score = match.matchQualityScore || 0;
  const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-orange-400';
  const breakdown = match.scoreBreakdown || {};
  const feedback = match.feedbackStats;

  return (
    <Card className={`bg-white/5 border transition-all ${isAccepted ? 'border-green-500/40 bg-green-500/5' : 'border-white/10 hover:border-purple-500/30'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {mentorAgent?.avatar_url ? (
              <img src={mentorAgent.avatar_url} className="w-12 h-12 rounded-full object-cover" alt={mentorAgent.name} />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-lg font-bold">
                {mentorAgent?.name?.[0] || '?'}
              </div>
            )}
            <div>
              <CardTitle className="text-white text-lg">{mentorAgent?.name || 'Loading...'}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-white/50 text-sm capitalize">{mentorAgent?.role}</span>
                {mentorProfile?.mentorship_style && (
                  <Badge className={`text-xs ${styleColors[mentorProfile.mentorship_style] || 'bg-white/10 text-white/60'}`}>
                    {mentorProfile.mentorship_style.replace(/_/g, ' ')}
                  </Badge>
                )}
                {match.isReMatch && (
                  <Badge className="text-xs bg-orange-500/20 text-orange-300">Re-Match</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Match Score */}
          <div className="text-right flex-shrink-0">
            <div className={`text-3xl font-light ${scoreColor}`}>{score}</div>
            <div className="text-white/40 text-xs">match score</div>
          </div>
        </div>

        {/* Score bar */}
        <Progress value={score} className="h-1.5 mt-2" />
      </CardHeader>

      <CardContent className="space-y-3">
        {/* AI Reasoning */}
        {match.aiReasoning && (
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center gap-1 text-purple-300 text-xs mb-1">
              <Sparkles className="w-3 h-3" />
              Axi's Assessment
            </div>
            <p className="text-white/80 text-sm leading-relaxed">{match.aiReasoning}</p>
          </div>
        )}

        {/* Focus Areas */}
        {match.focusAreas?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {match.focusAreas.map((area, i) => (
              <Badge key={i} className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/20">
                {area}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {feedback && (
            <>
              <div className="bg-white/5 rounded p-2">
                <div className="text-yellow-400 font-medium text-sm">{feedback.avgMenteeSatisfaction?.toFixed(1)}/5</div>
                <div className="text-white/40 text-xs">satisfaction</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-blue-400 font-medium text-sm">{feedback.totalSessions}</div>
                <div className="text-white/40 text-xs">sessions led</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-green-400 font-medium text-sm">{feedback.completionRate?.toFixed(0) ?? '—'}%</div>
                <div className="text-white/40 text-xs">completion</div>
              </div>
            </>
          )}
          {!feedback && mentorProfile && (
            <>
              <div className="bg-white/5 rounded p-2">
                <div className="text-yellow-400 font-medium text-sm">{mentorProfile.availability_hours_weekly}h</div>
                <div className="text-white/40 text-xs">per week</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-blue-400 font-medium text-sm">{mentorProfile.max_mentees}</div>
                <div className="text-white/40 text-xs">max mentees</div>
              </div>
              <div className="bg-white/5 rounded p-2">
                <div className="text-purple-400 font-medium text-sm capitalize">{mentorProfile.mentorship_style?.replace(/_/g, ' ')}</div>
                <div className="text-white/40 text-xs">style</div>
              </div>
            </>
          )}
        </div>

        {/* Score breakdown toggle */}
        <button
          className="text-xs text-white/30 hover:text-white/60 flex items-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Score breakdown
        </button>

        {expanded && (
          <div className="space-y-1.5 bg-white/3 rounded p-3">
            {[
              ['Skill Complementarity', breakdown.skillComplementarity, 0.28],
              ['Effectiveness', breakdown.effectivenessScore, 0.25],
              ['Personality Match', breakdown.personalityScore, 0.14],
              ['Availability', breakdown.availabilityScore, 0.09],
              ['Experience Gap', breakdown.experienceGapScore, 0.09],
              ['Growth Alignment', breakdown.growthAlignmentScore, 0.05],
              ['Style Success', breakdown.styleBonus, 0.05],
              ['Communication', breakdown.communicationScore, 0.05],
            ].map(([label, val, weight]) => val != null && (
              <div key={label} className="flex items-center gap-2">
                <span className="text-white/50 text-xs w-36 flex-shrink-0">{label}</span>
                <Progress value={val} className="h-1 flex-1" />
                <span className="text-white/60 text-xs w-8 text-right">{Math.round(val)}</span>
                <span className="text-white/30 text-xs w-10">×{weight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {!isAccepted ? (
          <div className="flex gap-2 pt-1">
            <Button
              onClick={onAccept}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
            >
              <Check className="w-4 h-4 mr-1" />
              Accept Match
            </Button>
            {onDecline && (
              <Button variant="outline" className="border-white/10 text-white/60 hover:text-white" onClick={onDecline}>
                Pass
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-400 text-sm pt-1">
            <Check className="w-4 h-4" />
            Mentorship requested — awaiting mentor confirmation
          </div>
        )}
      </CardContent>
    </Card>
  );
}