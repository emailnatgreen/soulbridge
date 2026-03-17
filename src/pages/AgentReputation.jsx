import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, TrendingUp, Shield, AlertTriangle, RefreshCw, Award } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import FilterBar from '@/components/filters/FilterBar';
import ActivityTimeline from '@/components/audit/ActivityTimeline';
import AskAxiButton from '@/components/AskAxiButton';
import { toast } from 'sonner';

const FILTERS = [
  { key: 'role', label: 'Role', type: 'select', options: ['guardian','creator','trader','teacher','healer','scout','elder','master'] },
  { key: 'status', label: 'Status', type: 'select', options: ['active','dormant','suspended','probation'] },
  { key: 'honorRange', label: 'Honor Score', type: 'range', min: 0, max: 100 },
];

const SORT_OPTIONS = [
  { value: '-honor_score', label: 'Honor (High–Low)' },
  { value: 'honor_score', label: 'Honor (Low–High)' },
  { value: 'name', label: 'Name A–Z' },
];

export default function AgentReputation() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('leaderboard');
  const [filterValues, setFilterValues] = useState({ search: '', role: 'all', status: 'all', honorRange: { min: 0, max: 100 } });
  const [sortBy, setSortBy] = useState('-honor_score');

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents-reputation'],
    queryFn: () => base44.entities.Agent.list('-honor_score', 100),
  });

  const { data: reputationEvents = [] } = useQuery({
    queryKey: ['reputation-events'],
    queryFn: () => base44.entities.ReputationEvent.list('-created_date', 100),
  });

  const recalcMutation = useMutation({
    mutationFn: (agentId) => base44.functions.invoke('calculateAgentReputation', { agent_id: agentId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agents-reputation'] }); toast.success('Reputation recalculated!'); },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const filteredAgents = agents.filter(a => {
    const q = filterValues.search?.toLowerCase();
    if (q && !a.name?.toLowerCase().includes(q)) return false;
    if (filterValues.role !== 'all' && a.role !== filterValues.role) return false;
    if (filterValues.status !== 'all' && a.status !== filterValues.status) return false;
    if (filterValues.honorRange?.min > 0 && (a.honor_score ?? 100) < filterValues.honorRange.min) return false;
    if (filterValues.honorRange?.max < 100 && (a.honor_score ?? 100) > filterValues.honorRange.max) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === '-honor_score') return (b.honor_score ?? 100) - (a.honor_score ?? 100);
    if (sortBy === 'honor_score') return (a.honor_score ?? 100) - (b.honor_score ?? 100);
    return (a.name || '').localeCompare(b.name || '');
  });

  const avgHonor = agents.length > 0 ? Math.round(agents.reduce((s, a) => s + (a.honor_score ?? 100), 0) / agents.length) : 0;
  const top10 = agents.slice(0, 10).map(a => ({ name: a.name?.slice(0, 12), score: a.honor_score ?? 100 }));
  const rising = agents.filter(a => (a.honor_score ?? 100) >= 90);

  // Audit timeline events
  const timelineEvents = [
    ...reputationEvents.map(e => ({
      id: e.id,
      type: (e.change ?? 0) < 0 ? 'error' : 'reputation',
      title: `Honor ${(e.change ?? 0) >= 0 ? '+' : ''}${e.change ?? 0}: ${e.event_type?.replace(/_/g, ' ') || 'Event'}`,
      description: e.reason || e.description || '',
      actor: agents.find(a => a.id === e.agent_id)?.name || 'Unknown',
      timestamp: e.created_date,
    })),
    ...agents.filter(a => a.warnings?.length > 0).flatMap(a =>
      (a.warnings || []).map((w, i) => ({
        id: `${a.id}-warn-${i}`,
        type: 'error',
        title: `Warning Issued to ${a.name}`,
        description: w.reason || '',
        actor: w.issued_by || 'System',
        timestamp: w.date || a.created_date,
      }))
    ),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/10 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-400" />Agent Reputation
            </h1>
            <p className="text-slate-400 text-sm mt-1">{agents.length} agents · avg honor {avgHonor}</p>
          </div>
          <AskAxiButton label="Analyze Reputation" context="Review the current honor scores, reputation events, and warnings across all agents. Identify any concerning trends, policy violations, or agents needing attention." />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Honor', val: avgHonor, color: 'text-amber-400' },
            { label: 'Elite (90+)', val: rising.length, color: 'text-green-400' },
            { label: 'At Risk (<50)', val: agents.filter(a => (a.honor_score ?? 100) < 50).length, color: 'text-red-400' },
            { label: 'Reputation Events', val: reputationEvents.length, color: 'text-blue-400' },
          ].map(k => (
            <div key={k.label} className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${k.color}`}>{k.val}</div>
              <div className="text-xs text-slate-500 mt-1">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {['leaderboard', 'rankings', 'audit trail'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${tab === t ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'leaderboard' && (
          <Card className="bg-slate-900/60 border-slate-700/40">
            <CardHeader><CardTitle className="text-white text-sm">Top 10 Honor Scores</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={top10} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
                  <Bar dataKey="score" name="Honor Score" radius={[0, 4, 4, 0]}>
                    {top10.map((entry, i) => <Cell key={i} fill={entry.score >= 90 ? '#22c55e' : entry.score >= 70 ? '#f59e0b' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {tab === 'rankings' && (
          <>
            <FilterBar filters={FILTERS} values={filterValues} onChange={setFilterValues}
              searchKey="search" searchPlaceholder="Search agents…"
              sortOptions={SORT_OPTIONS} sortValue={sortBy} onSortChange={setSortBy}
              resultCount={filteredAgents.length} />
            <div className="space-y-2">
              {filteredAgents.map((a, idx) => (
                <div key={a.id} className="flex items-center gap-4 p-4 bg-slate-900/60 border border-slate-700/40 rounded-xl hover:border-amber-500/30 transition-all">
                  <span className="text-slate-600 text-sm w-6 shrink-0 text-right">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{a.name}</span>
                      <Badge className="text-xs bg-slate-800 border-slate-700 text-slate-400 capitalize">{a.role}</Badge>
                      {a.warnings?.length > 0 && (
                        <Badge className="text-xs bg-red-900/40 text-red-300 border-red-700/40">
                          <AlertTriangle className="w-2.5 h-2.5 mr-1" />{a.warnings.length} warnings
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {(a.specializations || []).slice(0, 3).map(s => (
                        <span key={s} className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-xl font-bold ${(a.honor_score ?? 100) >= 80 ? 'text-amber-400' : (a.honor_score ?? 100) >= 50 ? 'text-slate-300' : 'text-red-400'}`}>
                        {a.honor_score ?? 100}
                      </div>
                      <div className="text-xs text-slate-600">honor</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => recalcMutation.mutate(a.id)}
                      disabled={recalcMutation.isPending}
                      className="h-7 w-7 p-0 text-slate-600 hover:text-amber-400">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'audit trail' && (
          <ActivityTimeline events={timelineEvents} title="Reputation & Honor Audit Trail" maxHeight="600px" />
        )}
      </div>
    </div>
  );
}