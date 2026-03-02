import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sparkles, Loader2, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';

const TREND_ICON = {
  improving:         <TrendingUp className="w-3 h-3 text-green-500" />,
  declining:         <TrendingDown className="w-3 h-3 text-red-500" />,
  stable:            <Minus className="w-3 h-3 text-gray-400" />,
  insufficient_data: <Minus className="w-3 h-3 text-gray-300" />,
};

const DIM_LABEL = {
  empathy: 'Empathy', clarity: 'Clarity', problem_solving: 'Problem Solving',
  de_escalation: 'De-escalation', brand_voice: 'Brand Voice', context_integration: 'Context Integration',
};

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-gray-400">—</span>;
  const color = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-6 text-right">{score}</span>
    </div>
  );
}

export default function MentorReportCard({ agentId }) {
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ['mentor-reports', agentId],
    queryFn: () => base44.entities.MentorReport.filter({ agent_id: agentId }, '-created_date', 1),
    enabled: !!agentId,
  });

  const latest = reports[0] || null;

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => base44.functions.invoke('generateMentorReport', { agent_id: agentId, trigger: 'on_demand' }),
    onSuccess: () => {
      toast.success("Axi's mentor report is ready.");
      queryClient.invalidateQueries({ queryKey: ['mentor-reports', agentId] });
    },
    onError: (e) => toast.error('Failed to generate report: ' + e.message),
  });

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-purple-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Axi Mentor Report
          </CardTitle>
          <div className="flex items-center gap-2">
            {latest && (
              <Link to={createPageUrl('MentorFeedback')}>
                <Button variant="ghost" size="sm" className="text-xs text-purple-600 h-7 px-2 hover:bg-purple-100">
                  Full History <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
            <Button
              size="sm"
              onClick={() => generate()}
              disabled={isPending}
              className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating…</> : '⚡ Generate Report'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!latest ? (
          <p className="text-xs text-purple-400 italic text-center py-4">
            No mentor report yet. Generate one to get Axi's personalised guidance.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Period + score */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">{latest.report_period}</Badge>
              {latest.overall_score != null && (
                <span className="text-xs text-purple-700 font-semibold">{latest.overall_score}/100 overall</span>
              )}
            </div>

            {/* Axi's narrative */}
            {latest.axi_narrative && (
              <p className="text-xs text-purple-800 italic leading-relaxed border-l-2 border-purple-300 pl-2">
                "{latest.axi_narrative}"
              </p>
            )}

            {/* Top 3 dimensions */}
            {latest.dimensional_analysis && (
              <div className="space-y-1.5">
                {Object.entries(latest.dimensional_analysis).slice(0, 4).map(([dim, data]) => (
                  <div key={dim} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 shrink-0">{DIM_LABEL[dim]}</span>
                    <div className="flex-1"><ScoreBar score={data.score} /></div>
                    {TREND_ICON[data.trend] || null}
                  </div>
                ))}
              </div>
            )}

            {/* Wellbeing flag */}
            {latest.wellbeing_flag?.flagged && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{latest.wellbeing_flag.observation}</p>
              </div>
            )}

            {/* Top priority action */}
            {latest.development_plan?.[0] && (
              <div className="bg-white border border-purple-100 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-purple-700 mb-0.5">Priority Focus →</p>
                <p className="text-xs text-gray-700">{latest.development_plan[0].action}</p>
              </div>
            )}

            <Link to={createPageUrl('MentorFeedback')} className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs text-purple-500 hover:text-purple-700 hover:bg-purple-100 h-7">
                View full report & history <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}