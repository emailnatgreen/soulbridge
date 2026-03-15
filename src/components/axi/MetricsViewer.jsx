import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

export default function MetricsViewer() {
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const { data: agents = [] } = useQuery({
    queryKey: ['agents-metrics-list'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 50),
  });

  const { data: metrics } = useQuery({
    queryKey: ['agent-perf-metrics', selectedAgentId],
    queryFn: () => selectedAgentId
      ? base44.entities.AgentPerformanceMetrics.filter({ agent_id: selectedAgentId }, '-created_date', 1).then(r => r[0])
      : null,
    enabled: !!selectedAgentId,
    refetchInterval: 30000,
  });

  const { data: repEvents = [] } = useQuery({
    queryKey: ['rep-events-metrics', selectedAgentId],
    queryFn: () => selectedAgentId
      ? base44.entities.ReputationEvent.filter({ agent_id: selectedAgentId }, '-created_date', 8)
      : [],
    enabled: !!selectedAgentId,
    refetchInterval: 30000,
  });

  const { data: autoLogs = [] } = useQuery({
    queryKey: ['auto-logs-metrics'],
    queryFn: () => base44.entities.AutomationLog.list('-created_date', 8),
    refetchInterval: 20000,
  });

  const statusColor = { success: 'text-green-400', error: 'text-red-400', warning: 'text-yellow-400' };
  const deltaIcon = (d) => d > 0 ? <TrendingUp className="w-3 h-3 text-green-400" /> : d < 0 ? <TrendingDown className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-slate-400" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Real-time Metrics Viewer</h3>
      </div>

      {/* Agent selector */}
      <select
        value={selectedAgentId}
        onChange={e => setSelectedAgentId(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500"
      >
        <option value="">— Select agent for metrics —</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
        ))}
      </select>

      {/* Agent Performance Metrics */}
      {selectedAgentId && (
        <div className="bg-slate-800/40 rounded-lg p-3 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Performance</p>
          {metrics ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Overall Score</span>
                <span className="text-xs font-bold text-cyan-300">{metrics.overall_score ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Honor Delta</span>
                <div className="flex items-center gap-1">
                  {deltaIcon(metrics.reputation_changes?.honor_delta)}
                  <span className="text-xs text-white">{metrics.reputation_changes?.honor_delta ?? '—'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Trend</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0 border-slate-600 text-slate-300">{metrics.performance_trend ?? '—'}</Badge>
              </div>
              {metrics.strengths?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Strengths</p>
                  <div className="flex flex-wrap gap-1">
                    {metrics.strengths.slice(0, 3).map((s, i) => <Badge key={i} className="text-xs bg-green-900/40 text-green-300 border-0 px-1.5 py-0">{s}</Badge>)}
                  </div>
                </div>
              )}
              {metrics.growth_opportunities?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Growth Areas</p>
                  <div className="flex flex-wrap gap-1">
                    {metrics.growth_opportunities.slice(0, 3).map((s, i) => <Badge key={i} className="text-xs bg-amber-900/40 text-amber-300 border-0 px-1.5 py-0">{s}</Badge>)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500 italic">No metrics recorded yet</p>
          )}
        </div>
      )}

      {/* Reputation Events */}
      {selectedAgentId && (
        <div className="bg-slate-800/40 rounded-lg p-3 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Recent Reputation Events</p>
          {repEvents.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No recent events</p>
          ) : repEvents.map((e, i) => (
            <div key={i} className="flex items-start justify-between gap-2 border-b border-slate-700/40 pb-1.5 last:border-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 truncate">{e.description || e.event_type}</p>
                <p className="text-xs text-slate-500">{e.created_date ? format(new Date(e.created_date), 'MMM d, HH:mm') : ''}</p>
              </div>
              <span className={`text-xs font-bold flex-shrink-0 ${(e.impact || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(e.impact || 0) > 0 ? '+' : ''}{e.impact ?? ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Automation Logs */}
      <div className="bg-slate-800/40 rounded-lg p-3 space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-widest">Recent Automation Logs</p>
        {autoLogs.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No recent logs</p>
        ) : autoLogs.map((log, i) => (
          <div key={i} className="flex items-start justify-between gap-2 border-b border-slate-700/40 pb-1.5 last:border-0 last:pb-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 truncate">{log.automation_name}</p>
              <p className="text-xs text-slate-500 truncate">{log.message}</p>
            </div>
            <span className={`text-xs font-semibold flex-shrink-0 capitalize ${statusColor[log.status] || 'text-slate-400'}`}>{log.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}