import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, Sparkles, Brain, Loader2 } from 'lucide-react';

export default function AIInsightsTab({ project, tasks = [] }) {
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [scheduleOptimization, setScheduleOptimization] = useState(null);

  const riskMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze risks for this project:\n\nTitle: ${project.title}\nDescription: ${project.description}\nStatus: ${project.status}\nProgress: ${project.progress_percentage}%\nTasks: ${tasks.length} total, ${tasks.filter(t => t.status === 'completed').length} completed, ${tasks.filter(t => t.status === 'blocked').length} blocked\nTeam size: ${project.team_members?.length || 0}\n\nProvide a risk analysis.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overall_risk_level: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
            overall_risk_score: { type: 'number' },
            critical_risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  severity: { type: 'string' },
                  probability: { type: 'number' },
                  impact_description: { type: 'string' },
                  mitigation_strategy: { type: 'string' },
                },
              },
            },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      return res;
    },
    onSuccess: (data) => setRiskAnalysis(data),
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const taskList = tasks.map(t => `- ${t.title} (${t.status}, ${t.priority}, ${t.estimated_hours || '?'}h)`).join('\n');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Optimize the schedule for this project:\n\nTitle: ${project.title}\nTarget completion: ${project.target_completion_date || 'Not set'}\nTasks:\n${taskList}\n\nProvide schedule optimization recommendations.`,
        response_json_schema: {
          type: 'object',
          properties: {
            predicted_completion_date: { type: 'string' },
            time_savings_hours: { type: 'number' },
            critical_path: { type: 'array', items: { type: 'string' } },
            efficiency_improvements: { type: 'array', items: { type: 'string' } },
            bottlenecks: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      return res;
    },
    onSuccess: (data) => setScheduleOptimization(data),
  });

  return (
    <div className="space-y-6">
      {/* Risk Analysis */}
      <Card className="bg-gradient-to-br from-red-900/30 to-orange-900/30 backdrop-blur-xl border-red-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-400" />
              Risk Analysis
            </CardTitle>
            <Button
              onClick={() => riskMutation.mutate()}
              disabled={riskMutation.isPending}
              size="sm"
              className="bg-red-600/50 hover:bg-red-600/70"
            >
              {riskMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze Risks'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {riskMutation.isPending && (
            <div className="text-center py-8 text-white/60">
              <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-red-400" />
              Analyzing project risks...
            </div>
          )}
          {riskAnalysis && (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="text-sm font-medium text-red-300 mb-1">Overall Risk Level</div>
                <div className="text-2xl font-bold text-white">{riskAnalysis.overall_risk_level}</div>
                <div className="text-sm text-white/60 mt-1">Score: {riskAnalysis.overall_risk_score}/100</div>
              </div>
              {riskAnalysis.critical_risks?.length > 0 && (
                <div className="space-y-3">
                  <div className="text-white font-medium">Critical Risks</div>
                  {riskAnalysis.critical_risks.map((risk, idx) => (
                    <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-white">{risk.title}</div>
                        <div className="flex items-center gap-2">
                          <Badge className={risk.severity === 'critical' ? 'bg-red-500/20 text-red-400' : risk.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}>
                            {risk.severity}
                          </Badge>
                          <Badge variant="outline">{risk.probability}% likely</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-white/70 mb-2">{risk.impact_description}</p>
                      <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-200 mt-2">
                        <span className="font-medium">Mitigation:</span> {risk.mitigation_strategy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {riskAnalysis.recommendations?.length > 0 && (
                <div>
                  <div className="text-white font-medium mb-2">Recommendations</div>
                  <div className="space-y-2">
                    {riskAnalysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm text-blue-200">• {rec}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!riskMutation.isPending && !riskAnalysis && (
            <p className="text-white/40 text-sm text-center py-6">Click "Analyze Risks" to get an AI-powered risk assessment.</p>
          )}
        </CardContent>
      </Card>

      {/* Schedule Optimization */}
      <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-xl border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Schedule Optimization
            </CardTitle>
            <Button
              onClick={() => scheduleMutation.mutate()}
              disabled={scheduleMutation.isPending}
              size="sm"
              className="bg-purple-600/50 hover:bg-purple-600/70"
            >
              {scheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Optimize Schedule'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scheduleMutation.isPending && (
            <div className="text-center py-8 text-white/60">
              <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-purple-400" />
              Optimizing project schedule...
            </div>
          )}
          {scheduleOptimization && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="text-sm text-white/60 mb-1">Predicted Completion</div>
                  <div className="text-white font-medium">
                    {scheduleOptimization.predicted_completion_date ? new Date(scheduleOptimization.predicted_completion_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="text-sm text-green-300 mb-1">Time Savings</div>
                  <div className="text-green-400 font-medium">{scheduleOptimization.time_savings_hours || 0}h</div>
                </div>
              </div>
              {scheduleOptimization.critical_path?.length > 0 && (
                <div>
                  <div className="text-white font-medium mb-2">Critical Path</div>
                  <div className="space-y-1">
                    {scheduleOptimization.critical_path.map((item, idx) => (
                      <div key={idx} className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-sm text-orange-200">{item}</div>
                    ))}
                  </div>
                </div>
              )}
              {scheduleOptimization.efficiency_improvements?.length > 0 && (
                <div>
                  <div className="text-white font-medium mb-2">Efficiency Improvements</div>
                  <div className="space-y-2">
                    {scheduleOptimization.efficiency_improvements.map((imp, idx) => (
                      <div key={idx} className="p-3 bg-purple-500/10 border border-purple-500/30 rounded text-sm text-purple-200">• {imp}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {!scheduleMutation.isPending && !scheduleOptimization && (
            <p className="text-white/40 text-sm text-center py-6">Click "Optimize Schedule" to get AI-powered scheduling recommendations.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}