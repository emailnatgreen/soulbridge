import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Sparkles, Loader2, AlertTriangle, TrendingUp, TrendingDown,
  Minus, CheckCircle2, Target, Brain, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MAYA_AGENT_ID = 'maya';

const DIM_LABEL = {
  empathy: 'Empathy', clarity: 'Clarity', problem_solving: 'Problem Solving',
  de_escalation: 'De-escalation', brand_voice: 'Brand Voice', context_integration: 'Context Integration',
};

const TREND_ICON = {
  improving:         <TrendingUp className="w-3.5 h-3.5 text-green-500" />,
  declining:         <TrendingDown className="w-3.5 h-3.5 text-red-500" />,
  stable:            <Minus className="w-3.5 h-3.5 text-gray-400" />,
  insufficient_data: <Minus className="w-3.5 h-3.5 text-gray-300" />,
};

function ScoreBar({ score, size = 'sm' }) {
  if (score == null) return <span className="text-sm text-gray-400">—</span>;
  const color = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const h = size === 'lg' ? 'h-2' : 'h-1.5';
  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 ${h} bg-gray-100 rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{score}</span>
    </div>
  );
}

function ReportCard({ report, isSelected, onClick }) {
  const overall = report.overall_score;
  const color = overall >= 75 ? 'border-green-300 bg-green-50' : overall >= 50 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-purple-400 border-purple-300 bg-purple-50' : color}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-800">{report.report_period}</span>
        {overall != null && (
          <span className="text-lg font-bold text-purple-700">{overall}<span className="text-xs font-normal text-gray-400">/100</span></span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        {format(new Date(report.created_date), 'dd MMM yyyy, HH:mm')}
        <Badge variant="outline" className="text-xs border-gray-200 ml-auto">{report.trigger === 'scheduled' ? '⏰ Scheduled' : '⚡ On-demand'}</Badge>
      </div>
      {report.reviews_analysed != null && (
        <p className="text-xs text-gray-400 mt-1">{report.reviews_analysed} reviews analysed</p>
      )}
    </button>
  );
}

export default function MentorFeedback() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-for-maya'],
    queryFn: () => base44.entities.Agent.filter({ name: 'Maya' }, 'name', 5),
  });
  const mayaId = agents[0]?.id || MAYA_AGENT_ID;

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['mentor-reports-all', mayaId],
    queryFn: () => base44.entities.MentorReport.filter({ agent_id: mayaId }, '-created_date', 20),
    enabled: !!mayaId,
  });

  const selected = reports.find(r => r.id === selectedId) || reports[0] || null;

  const { mutate: generate, isPending } = useMutation({
    mutationFn: () => base44.functions.invoke('generateMentorReport', { agent_id: mayaId, trigger: 'on_demand' }),
    onSuccess: () => {
      toast.success("Axi's mentor report generated.");
      queryClient.invalidateQueries({ queryKey: ['mentor-reports-all', mayaId] });
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('MayaDiplomacyTraining')}>
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Training</Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Axi Mentor Reports
              </h1>
              <p className="text-sm text-gray-500">Maya's personalised developmental feedback from Axi</p>
            </div>
          </div>
          <Button
            onClick={() => generate()}
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate New Report</>}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No mentor reports yet</p>
            <p className="text-sm mt-1">Click "Generate New Report" to have Axi assess Maya's progress</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report list */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Report History</p>
              {reports.map(r => (
                <ReportCard
                  key={r.id}
                  report={r}
                  isSelected={selected?.id === r.id}
                  onClick={() => setSelectedId(r.id)}
                />
              ))}
            </div>

            {/* Detail */}
            {selected && (
              <div className="lg:col-span-2 space-y-5">
                {/* Axi narrative */}
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-purple-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" /> Axi's Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-purple-900 italic leading-relaxed">"{selected.axi_narrative}"</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant="outline" className="border-purple-200 text-purple-600 text-xs">{selected.report_period}</Badge>
                      <Badge variant="outline" className="border-gray-200 text-gray-500 text-xs">{selected.reviews_analysed} reviews</Badge>
                      {selected.overall_score != null && (
                        <span className="text-sm font-bold text-purple-700 ml-auto">{selected.overall_score}/100</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Dimensional analysis */}
                {selected.dimensional_analysis && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-700">Dimensional Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(selected.dimensional_analysis).map(([dim, data]) => (
                          <div key={dim}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">{DIM_LABEL[dim]}</span>
                                {TREND_ICON[data.trend]}
                              </div>
                              <span className="text-xs text-gray-400 capitalize">{(data.trend || '').replace('_', ' ')}</span>
                            </div>
                            <ScoreBar score={data.score} size="lg" />
                            {data.commentary && (
                              <p className="text-xs text-gray-500 mt-1 ml-1">{data.commentary}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Wellbeing flag */}
                {selected.wellbeing_flag?.flagged && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" /> Wellbeing Observation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-amber-900">{selected.wellbeing_flag.observation}</p>
                      {selected.wellbeing_flag.recommendation && (
                        <p className="text-sm text-amber-700 italic">{selected.wellbeing_flag.recommendation}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Strengths */}
                {selected.strengths_summary?.length > 0 && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-green-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {selected.strengths_summary.map((s, i) => (
                          <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                            <span className="text-green-400 mt-0.5">✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Development plan */}
                {selected.development_plan?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
                        <Target className="w-4 h-4 text-purple-500" /> Development Plan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selected.development_plan.map((item, i) => (
                          <div key={i} className="border border-gray-100 rounded-xl p-4 bg-white">
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                                {item.priority}
                              </span>
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-semibold text-gray-800">{item.focus_area}</p>
                                <p className="text-sm text-gray-700">{item.action}</p>
                                <p className="text-xs text-gray-500 italic">{item.rationale}</p>
                                {item.suggested_drill_type && (
                                  <Badge variant="outline" className="text-xs border-purple-200 text-purple-600 mt-1">
                                    Drill: {item.suggested_drill_type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}