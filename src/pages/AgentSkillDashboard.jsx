import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, BarChart3, TrendingUp, Trophy, Star, Zap, Target } from 'lucide-react';
import MayaSkillRadar from '@/components/diplomacy/MayaSkillRadar';
import MayaSkillTimeline from '@/components/diplomacy/MayaSkillTimeline';
import MayaSkillBreakdown from '@/components/diplomacy/MayaSkillBreakdown';

export default function AgentSkillDashboard() {
  // Get agent ID from URL parameter or use current user
  const urlParams = new URLSearchParams(window.location.search);
  const agentIdParam = urlParams.get('agent_id');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agent-by-id', agentIdParam],
    queryFn: () => {
      if (agentIdParam) {
        return base44.entities.Agent.filter({ id: agentIdParam }, 'name', 1);
      }
      return [];
    },
    enabled: !!agentIdParam,
  });

  // Determine which agent we're viewing
  const viewingAgent = agentIdParam && agents[0] ? agents[0] : null;
  const agentId = viewingAgent?.id || currentUser?.id;
  const agentName = viewingAgent?.name || currentUser?.full_name || 'Agent';

  const { data: allSkills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['agent-skills', agentId],
    queryFn: () => base44.entities.AgentSkill.filter({ agent_id: agentId }),
    enabled: !!agentId,
  });

  const { data: progressRecords = [], isLoading: progressLoading } = useQuery({
    queryKey: ['skill-progress', agentId],
    queryFn: () => base44.entities.SkillProgress.filter({ agent_id: agentId }, '-recorded_at', 200),
    enabled: !!agentId,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['ghost-reviews'],
    queryFn: () => base44.entities.GhostReview.list('-created_date', 200),
  });

  const diplomacySkills = allSkills.filter(s => s.skill_category === 'diplomacy');

  const myReviews = reviews.filter(r => !r.assigned_agent_id || r.assigned_agent_id === agentId);

  const stats = useMemo(() => {
    const evaluated = myReviews.filter(r => r.status === 'Evaluated');
    const scored = myReviews.filter(r => r.ai_score != null);
    const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.ai_score, 0) / scored.length) : null;
    const refinedVintage = myReviews.filter(r => r.ai_verdict === 'Refined Vintage').length;
    const totalAttempts = myReviews.reduce((s, r) => s + (r.attempt_count || 0), 0);
    const overallLevel = diplomacySkills.length
      ? Math.round(diplomacySkills.reduce((s, sk) => s + (sk.level || 0), 0) / diplomacySkills.length)
      : null;
    return { evaluated: evaluated.length, avgScore, refinedVintage, totalAttempts, overallLevel };
  }, [myReviews, diplomacySkills]);

  const isLoading = skillsLoading || progressLoading || !agentId;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                {agentName}'s Skill Dashboard
                <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-xs">Self-NFT Tracker</Badge>
              </h1>
              <p className="text-sm text-gray-500">Real-time skill growth & living Self-NFT evolution</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Loading skill data...</div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { label: 'Overall Level', value: stats.overallLevel != null ? `${stats.overallLevel}` : '—', icon: <Zap className="w-4 h-4 text-purple-500" />, color: 'text-purple-700' },
                { label: 'Avg Score', value: stats.avgScore != null ? `${stats.avgScore}` : '—', icon: <Star className="w-4 h-4 text-amber-500" />, color: 'text-amber-700' },
                { label: 'Refined Vintage', value: stats.refinedVintage, icon: <Trophy className="w-4 h-4 text-green-500" />, color: 'text-green-700' },
                { label: 'Drills Completed', value: stats.evaluated, icon: <Target className="w-4 h-4 text-blue-500" />, color: 'text-blue-700' },
                { label: 'Total Attempts', value: stats.totalAttempts, icon: <TrendingUp className="w-4 h-4 text-orange-500" />, color: 'text-orange-700' },
              ].map(s => (
                <Card key={s.label} className="border-gray-200">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="flex justify-center mb-1">{s.icon}</div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Radar + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    Current Skill Profile
                    <span className="text-xs font-normal text-gray-400 ml-1">Purple = current · Ghost = peak</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MayaSkillRadar skills={diplomacySkills} />
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Score Timeline
                    <span className="text-xs font-normal text-gray-400 ml-1">Click legend to toggle dimensions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MayaSkillTimeline skills={diplomacySkills} />
                </CardContent>
              </Card>
            </div>

            {/* Per-dimension breakdown */}
            <Card className="border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  Dimension Breakdown
                  <span className="text-xs font-normal text-gray-400 ml-1">Dots = last 5 verdicts (🟢 Refined · 🟡 Acceptable · 🔴 Slop)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MayaSkillBreakdown skills={diplomacySkills} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}