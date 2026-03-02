import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Star, Loader2, Flame, CheckCircle2, AlertTriangle,
  ThumbsUp, ThumbsDown, Sparkles, User, Calendar
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const VERDICT_STYLE = {
  'Refined Vintage': 'bg-green-100 text-green-800 border-green-300',
  'Acceptable':      'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Synthetic Slop':  'bg-red-100 text-red-800 border-red-300',
};

const DIM_LABEL = {
  empathy:         'Empathy',
  clarity:         'Clarity',
  problem_solving: 'Problem Solving',
  de_escalation:   'De-escalation',
  brand_voice:     'Brand Voice',
};

export default function GhostReviewDetail({ review, onEvaluated }) {
  const [response, setResponse] = useState(review.trainee_response || '');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(
    review.ai_score != null ? {
      score: review.ai_score,
      feedback: review.ai_feedback,
      strengths: review.ai_strengths || [],
      improvements: review.ai_improvements || [],
    } : null
  );
  const qc = useQueryClient();

  const handleSubmit = async () => {
    if (!response.trim()) { toast.error('Please write a response first'); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('evaluateGhostReviewResponse', {
        ghost_review_id: review.id,
        trainee_response: response,
      });
      setEvaluation(res.data.evaluation);
      qc.invalidateQueries({ queryKey: ['ghost-reviews'] });
      onEvaluated?.();
      toast.success('Response evaluated!');
    } catch (e) {
      toast.error('Evaluation failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-5">
      {/* Review */}
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

      {/* Response area */}
      {review.status === 'Pending Response' && !evaluation ? (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Your Diplomatic Response
          </label>
          <Textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Craft your response carefully — empathy, clarity, and brand voice matter..."
            rows={6}
            className="resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{response.length} characters</span>
            <Button
              onClick={handleSubmit}
              disabled={loading || !response.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Evaluating...</> : 'Submit & Evaluate'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Your Response</p>
            <p className="text-sm text-gray-700 italic">"{review.trainee_response || response}"</p>
          </div>
        </div>
      )}

      {/* Evaluation Results */}
      {evaluation && (
        <Card className={`border-2 ${
          evaluation.score >= 80 ? 'border-green-300 bg-green-50/40'
          : evaluation.score >= 60 ? 'border-yellow-300 bg-yellow-50/40'
          : 'border-red-300 bg-red-50/40'
        }`}>
          <CardContent className="pt-4 pb-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`text-4xl font-bold ${scoreColor(evaluation.score)}`}>
                  {evaluation.score}
                  <span className="text-lg text-gray-400 font-normal">/100</span>
                </div>
                {evaluation.vintage_verdict && (
                  <Badge className={`border text-sm font-semibold ${VERDICT_STYLE[evaluation.vintage_verdict] || 'bg-gray-100'}`}>
                    {evaluation.score >= 80 && <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {evaluation.vintage_verdict}
                  </Badge>
                )}
              </div>
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>

            {/* Overall feedback */}
            <p className="text-sm text-gray-700">{evaluation.feedback}</p>

            {/* Dimension scores */}
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

            {/* Strengths & Improvements */}
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

            {/* Admin feedback */}
            {review.admin_feedback && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-xs font-semibold text-indigo-700 mb-1">Mentor Feedback</p>
                <p className="text-xs text-indigo-800">{review.admin_feedback}</p>
                {review.admin_override_score != null && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">Override Score: {review.admin_override_score}/100</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}