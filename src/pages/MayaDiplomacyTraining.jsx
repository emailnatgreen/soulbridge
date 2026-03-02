import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Shield, Flame, Star, CheckCircle2, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import GhostReviewInbox from '@/components/diplomacy/GhostReviewInbox';
import GhostReviewDetail from '@/components/diplomacy/GhostReviewDetail';
import GenerateGhostReviewsButton from '@/components/diplomacy/GenerateGhostReviewsButton';
import MentorReportCard from '@/components/diplomacy/MentorReportCard';
import GenerateTargetedDrillsButton from '@/components/diplomacy/GenerateTargetedDrillsButton';

// Maya's agent ID — adjust if different
const MAYA_AGENT_ID = 'maya';

export default function MayaDiplomacyTraining() {
  const [selected, setSelected] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-for-maya'],
    queryFn: () => base44.entities.Agent.filter({ name: 'Maya' }, 'name', 5),
  });

  const mayaId = agents[0]?.id || MAYA_AGENT_ID;

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['ghost-reviews'],
    queryFn: () => base44.entities.GhostReview.list('-created_date', 100),
  });

  const { data: agentSkills = [] } = useQuery({
    queryKey: ['maya-agent-skills', mayaId],
    queryFn: () => base44.entities.AgentSkill.filter({ agent_id: mayaId, skill_category: 'diplomacy' }),
    enabled: !!mayaId,
  });

  const myReviews = reviews.filter(r => !r.assigned_agent_id || r.assigned_agent_id === mayaId);

  const pending  = myReviews.filter(r => r.status === 'Pending Response').length;
  const submitted = myReviews.filter(r => r.status === 'Response Submitted').length;
  const evaluated = myReviews.filter(r => r.status === 'Evaluated').length;
  const avgScore = (() => {
    const scored = myReviews.filter(r => r.ai_score != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, r) => s + r.ai_score, 0) / scored.length);
  })();

  const selectedReview = selected ? myReviews.find(r => r.id === selected.id) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Maya's Diplomacy Training
                <Badge className="bg-purple-100 text-purple-700 border border-purple-200 text-xs">Ghost Reviews — Internal Only</Badge>
              </h1>
              <p className="text-sm text-gray-500">Fire Drill · Level 5 Diplomacy · Refined Vintage Standards</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={createPageUrl('MayaSkillDashboard')}>
              <Button variant="outline" size="sm" className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 h-8">
                <BarChart3 className="w-3 h-3 mr-1" /> Skill Dashboard
              </Button>
            </Link>
            <Link to={createPageUrl('EscalationChainView')}>
              <Button variant="outline" size="sm" className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 h-8">
                <TrendingUp className="w-3 h-3 mr-1" /> Escalation Chains
              </Button>
            </Link>
            <GenerateGhostReviewsButton assignedAgentId={mayaId} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-gray-700">{pending}</p>
              <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Pending</p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-orange-700">{submitted}</p>
              <p className="text-xs text-orange-600 mt-1">Awaiting Eval</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-green-700">{evaluated}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Evaluated</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-purple-700">{avgScore ?? '—'}</p>
              <p className="text-xs text-purple-600 mt-1 flex items-center justify-center gap-1"><Star className="w-3 h-3" /> Avg Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Mentor Report Card */}
        <div className="mb-6">
          <MentorReportCard agentId={mayaId} />
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Inbox */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                Review Inbox
                <Badge variant="outline" className="ml-auto text-xs">{myReviews.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GhostReviewInbox
                reviews={myReviews}
                selectedId={selected?.id}
                onSelect={setSelected}
              />
            </CardContent>
          </Card>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selectedReview ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-700">Review & Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <GhostReviewDetail
                   key={selectedReview.id}
                   review={selectedReview}
                   agentSkills={agentSkills}
                   onEvaluated={() => setSelected({ ...selectedReview, status: 'Evaluated' })}
                   onEscalated={(newReviewId, chainId) => {
                     window.location.href = createPageUrl(`EscalationChainView?chain_id=${chainId}`);
                   }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-20 text-center text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Select a ghost review to begin</p>
                  <p className="text-sm mt-1">Or generate new drills using the button above</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}