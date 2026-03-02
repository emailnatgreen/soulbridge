import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, TrendingUp, CheckCircle2, Clock, Flame,
  ChevronRight, AlertTriangle, Trophy, Star
} from 'lucide-react';
import GhostReviewDetail from '@/components/diplomacy/GhostReviewDetail';
import GhostReviewContextPanel from '@/components/diplomacy/GhostReviewContextPanel';

const VERDICT_STYLE = {
  'Refined Vintage': 'bg-green-100 text-green-700 border-green-300',
  'Acceptable':      'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Synthetic Slop':  'bg-red-100 text-red-700 border-red-300',
};

const STATUS_COLOR = {
  Active:    'bg-amber-100 text-amber-700 border-amber-300',
  Resolved:  'bg-green-100 text-green-700 border-green-300',
  Abandoned: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function EscalationChainView() {
  const urlParams = new URLSearchParams(window.location.search);
  const chainId = urlParams.get('chain_id');
  const [activeStage, setActiveStage] = useState(0);

  const { data: chains = [], isLoading: chainsLoading } = useQuery({
    queryKey: ['escalation-chains'],
    queryFn: () => base44.entities.EscalationChain.list('-created_date', 50),
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['ghost-reviews'],
    queryFn: () => base44.entities.GhostReview.list('-created_date', 200),
  });

  const reviewMap = Object.fromEntries(allReviews.map(r => [r.id, r]));

  // If chain_id param given, focus on that chain; otherwise show list
  const focusedChain = chainId ? chains.find(c => c.id === chainId) : null;
  const stageReviews = focusedChain
    ? (focusedChain.review_ids || []).map(id => reviewMap[id]).filter(Boolean)
    : [];

  if (chainsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading escalation chains...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <Link to={createPageUrl('MayaDiplomacyTraining')}>
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to Training</Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Escalation Chains
            </h1>
            <p className="text-sm text-gray-500">Multi-stage diplomatic endurance drills</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {focusedChain && stageReviews.length > 0 ? (
          // Chain detail view
          <div className="space-y-4">
            {/* Chain header */}
            <Card className="border-amber-200 bg-amber-50/40">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">{focusedChain.title}</h2>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge className={`border text-xs ${STATUS_COLOR[focusedChain.status] || ''}`}>
                        {focusedChain.status}
                      </Badge>
                      <Badge className="border text-xs bg-gray-100 text-gray-600 border-gray-300">
                        {stageReviews.length} stage{stageReviews.length !== 1 ? 's' : ''}
                      </Badge>
                      <Badge className="border text-xs bg-orange-100 text-orange-700 border-orange-200">
                        {focusedChain.difficulty_level}
                      </Badge>
                    </div>
                  </div>
                  {focusedChain.status === 'Resolved' && (
                    <Trophy className="w-8 h-8 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stage navigation */}
            <div className="flex items-center gap-2 flex-wrap">
              {stageReviews.map((r, i) => {
                const verdict = r.ai_verdict;
                const isActive = activeStage === i;
                return (
                  <React.Fragment key={r.id}>
                    <button
                      onClick={() => setActiveStage(i)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <span>Stage {i + 1}</span>
                      {verdict && (
                        <span className={`w-2 h-2 rounded-full ${
                          verdict === 'Refined Vintage' ? 'bg-green-400' :
                          verdict === 'Acceptable' ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                      )}
                      {!verdict && <Clock className="w-3 h-3 opacity-50" />}
                    </button>
                    {i < stageReviews.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-amber-500" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Active stage detail */}
            {stageReviews[activeStage] && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                        Stage {activeStage + 1}
                        {activeStage > 0 && (
                          <Badge className="border text-xs bg-red-50 text-red-600 border-red-200">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            Escalated
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <GhostReviewDetail
                        key={stageReviews[activeStage].id}
                        review={stageReviews[activeStage]}
                        chainId={focusedChain.id}
                        onEvaluated={() => {}}
                        onEscalated={(newReviewId) => {
                          setActiveStage(activeStage + 1);
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-1">
                  {stageReviews[activeStage].context_pack && (
                    <Card className="sticky top-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-blue-700">📋 Internal Resources</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <GhostReviewContextPanel contextPack={stageReviews[activeStage].context_pack} />
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Chains list view
          <div className="space-y-4">
            {chains.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-16 text-center text-gray-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No escalation chains yet</p>
                  <p className="text-sm mt-1">Escalations are triggered from within a Ghost Review when your response scores "Acceptable".</p>
                  <Link to={createPageUrl('MayaDiplomacyTraining')}>
                    <Button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                      Go to Training Inbox
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              chains.map(chain => {
                const chainReviews = (chain.review_ids || []).map(id => reviewMap[id]).filter(Boolean);
                const resolved = chain.status === 'Resolved';
                return (
                  <Card key={chain.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-gray-900">{chain.title}</h3>
                            <Badge className={`border text-xs ${STATUS_COLOR[chain.status] || ''}`}>
                              {chain.status}
                            </Badge>
                          </div>
                          {/* Stage pills */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {chainReviews.map((r, i) => (
                              <React.Fragment key={r.id}>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${VERDICT_STYLE[r.ai_verdict] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  S{i + 1}: {r.ai_verdict || 'Pending'}
                                  {r.ai_score != null && ` · ${r.ai_score}`}
                                </span>
                                {i < chainReviews.length - 1 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {resolved && <Trophy className="w-5 h-5 text-green-500" />}
                          <Link to={createPageUrl(`EscalationChainView?chain_id=${chain.id}`)}>
                            <Button size="sm" variant="outline" className="text-xs h-7">
                              View Chain <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}