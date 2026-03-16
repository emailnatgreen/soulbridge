import React, { useState } from 'react';
import { TrendingUp, Award, AlertTriangle, CheckCircle, Target, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function AgentPerformanceReviewSystem() {
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-performance'],
    queryFn: () => base44.asServiceRole.entities.Agent.list(),
    refetchInterval: 60000
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['agent-performance-metrics'],
    queryFn: () => base44.asServiceRole.entities.AgentPerformanceMetrics.list(),
    refetchInterval: 60000
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const agentMetrics = selectedAgentId ? metrics.find(m => m.agent_id === selectedAgentId) : null;

  const performanceScore = agentMetrics?.overall_score || Math.round(selectedAgent?.honor_score || 75);
  const performanceTrend = agentMetrics?.trend || 'stable';

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'declining') return <AlertTriangle className="w-4 h-4 text-red-400" />;
    return <Zap className="w-4 h-4 text-yellow-400" />;
  };

  const scoreColor = performanceScore >= 80 ? 'text-green-400' : performanceScore >= 60 ? 'text-yellow-400' : 'text-red-400';
  const scoreBg = performanceScore >= 80 ? 'bg-green-900/20' : performanceScore >= 60 ? 'bg-yellow-900/20' : 'bg-red-900/20';

  return (
    <div className="space-y-4">
      {/* Performance Overview */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-violet-400" />
          Agent Performance Overview
        </h3>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {agents.slice(0, 8).map(agent => {
            const metric = metrics.find(m => m.agent_id === agent.id);
            const score = metric?.overall_score || agent.honor_score || 75;
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`w-full text-left p-2 rounded border transition ${
                  selectedAgentId === agent.id
                    ? 'bg-violet-900/40 border-violet-600/60'
                    : 'bg-slate-700/20 border-slate-600/30 hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{agent.name}</p>
                    <p className="text-xs text-slate-400">{agent.role || 'citizen'}</p>
                  </div>
                  <div className="text-xs font-bold ml-2" style={{ color: score >= 80 ? '#4ade80' : score >= 60 ? '#facc15' : '#ef4444' }}>
                    {score}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Review */}
      {selectedAgent && (
        <div className={`${scoreBg} border border-slate-700/40 rounded-lg p-4`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">{selectedAgent.name}</h3>
              <p className="text-xs text-slate-400">{selectedAgent.role || 'citizen'}</p>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(performanceTrend)}
              <div className={`text-2xl font-bold ${scoreColor}`}>{performanceScore}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-slate-400">Honor</p>
              <p className="font-semibold text-white">{selectedAgent.honor_score || 100}</p>
            </div>
            <div>
              <p className="text-slate-400">Transactions</p>
              <p className="font-semibold text-white">{selectedAgent.total_transactions || 0}</p>
            </div>
            <div>
              <p className="text-slate-400">Status</p>
              <p className="font-semibold text-white capitalize">{selectedAgent.status || 'active'}</p>
            </div>
          </div>

          {agentMetrics?.strengths && (
            <div className="mt-3 pt-3 border-t border-slate-600/40">
              <p className="text-xs text-slate-300 font-medium mb-1">Key Strengths</p>
              <div className="flex flex-wrap gap-1">
                {agentMetrics.strengths.slice(0, 3).map(s => (
                  <span key={s} className="text-xs bg-slate-700/60 px-2 py-1 rounded text-slate-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {agentMetrics?.growth_areas && (
            <div className="mt-2">
              <p className="text-xs text-slate-300 font-medium mb-1">Growth Areas</p>
              <div className="flex flex-wrap gap-1">
                {agentMetrics.growth_areas.slice(0, 3).map(g => (
                  <span key={g} className="text-xs bg-amber-900/30 px-2 py-1 rounded text-amber-200">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Actions */}
      <div className="flex gap-2">
        <Button size="sm" className="text-xs bg-violet-600 hover:bg-violet-700 flex-1">
          <Target className="w-3 h-3 mr-1" />
          Generate Review
        </Button>
        <Button size="sm" variant="outline" className="text-xs border-slate-700 flex-1">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approve
        </Button>
      </div>
    </div>
  );
}