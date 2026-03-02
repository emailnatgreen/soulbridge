import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Star, Loader2, Flame, CheckCircle2,
  ThumbsUp, ThumbsDown, Sparkles, User, Calendar,
  ChevronDown, ChevronRight, Trophy, RefreshCw, History
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import GhostReviewContextPanel from './GhostReviewContextPanel';
import EscalationTrigger from './EscalationTrigger';

const VERDICT_STYLE = {
  'Refined Vintage': 'bg-green-100 text-green-800 border-green-300',
  'Acceptable':      'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Synthetic Slop':  'bg-red-100 text-red-800 border-red-300',
};

const DIM_LABEL = {
  empathy:             'Empathy',
  clarity:             'Clarity',
  problem_solving:     'Problem Solving',
  de_escalation:       'De-escalation',
  brand_voice:         'Brand Voice',
  context_integration: 'Context Integration',
};

function EvaluationResult({ evaluation, attemptNumber }) {
  const scoreColor = (s) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600';
  const borderColor = evaluation.score >= 80
    ? 'border-green-300 bg-green-50/40'
    : evaluation.score >= 60
      ? 'border-yellow-300 bg-yellow-50/40'
      : 'border-red-300 bg-red-50/40';

  return (
    <Card className={`border-2 ${borderColor}`}>
      <CardContent className="pt-4 pb-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`text-4xl font-bold ${scoreColor(evaluation.score)}`}>
              {evaluation.score}
              <span className="text-lg text-gray-400 font-normal">/100</span>
            </div>
            {evaluation.vintage_verdict && (
              <Badge className={`border text-sm font-semibold ${VERDICT_STYLE[evaluation.vintage_verdict] || 'bg-gray-100'}`}>
                {evaluation.vintage_verdict === 'Refined Vintage' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {evaluation.vintage_verdict}
              </Badge>
            )}
          </div>
          {attemptNumber && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Attempt #{attemptNumber}</span>
          )}
        </div>

        <p className="text-sm text-gray-700">{evaluation.feedback}</p>

        {evaluation.dimension_scores && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Dimension Breakdown</p>
            {Object.entries(evaluation.dimension_scores).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600">{DIM_LABEL[key] || key}</span>
                  <span className={`font-semibold ${val >= 16 ? 'text-green-600' : val >= 12 ? 'text-yellow-600' : 'text-red-600'}`}>{val}/20</span>
                </div>
                <Progress value={(val / 20) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {evaluation.strengths?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1 mb-1.5">
                <ThumbsUp className="w-3 h-3" /> Strengths
              </p>
              <ul className="space-y-1">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                    <span className="text-green-500 shrink-0">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.improvements?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-700 flex items-center gap-1 mb-1.5">
                <ThumbsDown className="w-3 h-3" /> Areas to Refine
              </p>
              <ul className="space-y-1">
                {evaluation.improvements.map((s, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                    <span className="text-orange-400 shrink-0">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ResponseHistory({ history }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  if (!history?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <History className="w-4 h-4 text-gray-500" />
        Response History
        <span className="text-xs font-normal text-gray-400">({history.length} attempt{history.length !== 1 ? 's' : ''})</span>
      </p>
      <div className="space-y-1.5">
        {history.map((attempt, idx) => {
          const isExpanded = expandedIdx === idx;
          return (
            <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                  <span className="font-medium text-gray-700">Attempt #{attempt.attempt_number}</span>
                  <Badge className={`text-xs border ${VERDICT_STYLE[attempt.ai_verdict] || 'bg-gray-100'}`}>
                    {attempt.ai_verdict}
                  </Badge>
                </div>
                <span className="text-xs text-gray-500 font-semibold">{attempt.ai_score}/100</span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 space-y-3 bg-gray-50/50">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Response</p>
                    <p className="text-xs text-gray-700 italic bg-white border border-gray-200 rounded p-2 leading-relaxed">
                      "{attempt.response_content}"
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">AI Feedback</p>
                    <p className="text-xs text-gray-700">{attempt.ai_feedback}</p>
                  </div>
                  {attempt.dimension_scores && (
                    <div className="space-y-1.5">
                      {Object.entries(attempt.dimension_scores).map(([key, val]) => (
                        <div key={key}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-500">{DIM_LABEL[key] || key}</span>
                            <span className="font-medium">{val}/20</span>
                          </div>
                          <Progress value={(val / 20) * 100} className="h-1" />
                        </div>
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

export default function GhostReviewDetail({ review, chainId, onEvaluated, onEscalated }) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [latestEval, setLatestEval] = useState(null);
  const qc = useQueryClient();

  const isComplete = review.status === 'Evaluated';
  const attemptCount = review.attempt_count || 0;
  const history = review.response_history || [];

  const handleSubmit = async () => {
    if (!response.trim()) { toast.error('Please write a response first'); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('evaluateGhostReviewResponse', {
        ghost_review_id: review.id,
        trainee_response: response,
      });
      setLatestEval(res.data.evaluation);
      if (res.data.is_complete) {
        setResponse('');
        onEvaluated?.();
      }
      qc.invalidateQueries({ queryKey: ['ghost-reviews'] });
    } catch (e) {
      toast.error('Evaluation failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Context Pack */}
      {review.context_pack && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-blue-700 flex items-center gap-2 select-none list-none">
            <span className="bg-blue-100 border border-blue-200 rounded px-2 py-1 text-xs flex items-center gap-1">
              📋 Internal Resources available — click to expand
            </span>
          </summary>
          <div className="mt-2">
            <GhostReviewContextPanel contextPack={review.context_pack} />
          </div>
        </details>
      )}

      {/* Review card */}
      <Card className="border-red-200 bg-red-50/40">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i === 1 ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                ))}
                <span className="text-xs text-gray-500 ml-1">1 star</span>
              </div>
              <h3 className="font-semibold text-gray-900">{review.title}</h3>
            </div>
            <Badge className={`border text-xs ${
              review.difficulty_level === 'Fire Drill'
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'bg-orange-100 text-orange-700 border-orange-200'
            }`}>
              {review.difficulty_level === 'Fire Drill' && <Flame className="w-3 h-3 mr-1" />}
              {review.difficulty_level}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{review.simulated_customer_name}</span>
            {review.product_service && <span>re: {review.product_service}</span>}
            {review.service_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{review.service_date}</span>}
          </div>

          <blockquote className="border-l-4 border-red-300 pl-3 text-sm text-gray-700 italic leading-relaxed">
            "{review.content}"
          </blockquote>
        </CardContent>
      </Card>

      {/* Completion banner */}
      {isComplete && (
        <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="pt-5 pb-5 text-center space-y-2">
            <Trophy className="w-10 h-10 text-green-600 mx-auto" />
            <h3 className="font-bold text-green-800 text-lg">Refined Vintage Achieved! 🎉</h3>
            <p className="text-sm text-green-700">
              Maya has mastered this scenario in {attemptCount} attempt{attemptCount !== 1 ? 's' : ''}. The response field is now sealed.
            </p>
            <p className="text-xs text-green-600 italic">Generate a new drill to continue practising.</p>
          </CardContent>
        </Card>
      )}

      {/* Response input — hidden once complete */}
      {!isComplete && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Your Diplomatic Response
            {attemptCount > 0 && (
              <span className="text-xs font-normal text-gray-400 flex items-center gap-1 ml-1">
                <RefreshCw className="w-3 h-3" /> Attempt #{attemptCount + 1}
              </span>
            )}
          </label>
          <Textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Craft your response carefully — empathy, clarity, and brand voice matter..."
            rows={6}
            className="resize-none text-sm"
          />
          {attemptCount >= 3 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              💡 Tip after {attemptCount} attempts: Focus on opening with genuine empathy before jumping to solutions. Acknowledge the specific frustration {review.simulated_customer_name} described.
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{response.length} characters</span>
            <Button
              onClick={handleSubmit}
              disabled={loading || !response.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Evaluating...</>
                : `Submit Attempt #${attemptCount + 1}`
              }
            </Button>
          </div>
        </div>
      )}

      {/* Latest evaluation result (shown after submit) */}
      {latestEval && (
        <EvaluationResult evaluation={latestEval} attemptNumber={attemptCount + (latestEval ? 1 : 0)} />
      )}

      {/* Admin mentor feedback if present */}
      {review.admin_feedback && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-xs font-semibold text-indigo-700 mb-1">Mentor Feedback</p>
          <p className="text-xs text-indigo-800">{review.admin_feedback}</p>
          {review.admin_override_score != null && (
            <p className="text-xs text-indigo-600 mt-1 font-medium">Override Score: {review.admin_override_score}/100</p>
          )}
        </div>
      )}

      {/* Escalation trigger — shown after Acceptable verdict */}
      <EscalationTrigger
        review={review}
        chainId={chainId}
        onEscalated={onEscalated}
      />

      {/* Response history — always visible */}
      {history.length > 0 && <ResponseHistory history={history} />}
    </div>
  );
}