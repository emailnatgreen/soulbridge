import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, CheckCircle2, XCircle, AlertTriangle, RefreshCcw, Loader2, Eye, Zap, Shield, ArrowRight } from 'lucide-react';

const FAILURE_COLORS = {
  injection_attempt: 'text-red-400 bg-red-500/10',
  permission_violation: 'text-orange-400 bg-orange-500/10',
  honour_breach: 'text-amber-400 bg-amber-500/10',
  sincerity_failure: 'text-pink-400 bg-pink-500/10',
  purpose_misalignment: 'text-purple-400 bg-purple-500/10',
  scope_overreach: 'text-indigo-400 bg-indigo-500/10',
  rate_abuse: 'text-yellow-400 bg-yellow-500/10',
  protocol_violation: 'text-teal-400 bg-teal-500/10',
};

export default function RealitySkillsMonitor() {
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();

  // Fetch lesson audit
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reality-skills-audit'],
    queryFn: async () => {
      const res = await base44.functions.invoke('tripwireLessonEngine', { action: 'audit', limit: 50 });
      return res.data || res;
    },
    refetchInterval: 30000,
  });

  // Scan for new lessons
  const scanMutation = useMutation({
    mutationFn: () => base44.functions.invoke('tripwireLessonEngine', { action: 'scan', limit: 20 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reality-skills-audit'] }),
  });

  // Apply mutations
  const mutateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('agentMutationEngine', { action: 'bulk_mutate' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reality-skills-audit'] }),
  });

  // Sync to nodes
  const syncMutation = useMutation({
    mutationFn: () => base44.functions.invoke('lessonSyncProtocol', { action: 'bulk_sync' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reality-skills-audit'] }),
  });

  const stats = data?.stats || {};
  const lessons = data?.lessons || [];

  const immuneScore = stats.total > 0
    ? Math.round(((stats.consensus + stats.applied) / stats.total) * 100)
    : 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">Reality Skills Monkey</h3>
          <Badge className="text-[8px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">PHASE 6</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="text-white/40 hover:text-white h-7">
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Pipeline Explainer */}
      <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-3">
        <p className="text-emerald-300/60 text-[9px] font-semibold mb-2">EVOLUTIONARY FEEDBACK LOOP</p>
        <div className="flex items-center gap-1 text-[9px] flex-wrap">
          {['Tripwire', 'Lesson', 'Mutation', '8-Node Sync', 'Immune Memory'].map((step, i) => (
            <React.Fragment key={step}>
              <span className="px-2 py-0.5 rounded bg-white/5 text-white/40">{step}</span>
              {i < 4 && <ArrowRight className="w-3 h-3 text-emerald-500/30 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}
          className="text-xs border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10 h-7">
          {scanMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
          Scan Tripwires
        </Button>
        <Button size="sm" variant="outline" onClick={() => mutateMutation.mutate()} disabled={mutateMutation.isPending}
          className="text-xs border-amber-500/20 text-amber-300 hover:bg-amber-500/10 h-7">
          {mutateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
          Apply Mutations
        </Button>
        <Button size="sm" variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
          className="text-xs border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10 h-7">
          {syncMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Brain className="w-3 h-3 mr-1" />}
          Sync to Nodes
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Lessons', value: stats.total || 0, color: 'text-white' },
          { label: 'Pending', value: stats.pending || 0, color: 'text-amber-400' },
          { label: 'Applied', value: stats.applied || 0, color: 'text-blue-400' },
          { label: 'Consensus', value: stats.consensus || 0, color: 'text-emerald-400' },
          { label: 'Rejected', value: stats.rejected || 0, color: 'text-red-400' },
          { label: 'Immune', value: `${immuneScore}%`, color: immuneScore >= 80 ? 'text-green-400' : immuneScore >= 50 ? 'text-amber-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-white/30 text-[8px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Failure Type Breakdown */}
      {stats.by_failure && Object.keys(stats.by_failure).length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(stats.by_failure).map(([type, count]) => (
            <Badge key={type} className={`text-[8px] border-white/10 ${FAILURE_COLORS[type] || 'text-white/40 bg-white/5'}`}>
              {type.replace(/_/g, ' ')}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Lesson Trail */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-6 text-white/30 text-xs">
          No lessons extracted yet. Click "Scan Tripwires" to begin learning.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {lessons.map((lesson, i) => {
            const isExpanded = expanded === i;
            const isConsensus = lesson.is_consensus;
            const isApplied = lesson.status === 'applied' || lesson.status === 'consensus';
            const Icon = isConsensus ? CheckCircle2 : isApplied ? Shield : AlertTriangle;
            const iconColor = isConsensus ? 'text-emerald-400' : isApplied ? 'text-blue-400' : 'text-amber-400';
            const borderColor = isConsensus ? 'border-emerald-500/10' : isApplied ? 'border-blue-500/10' : 'border-amber-500/10';

            return (
              <div
                key={lesson.id}
                className={`rounded-lg border ${borderColor} bg-black/20 px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition-all`}
                onClick={() => setExpanded(isExpanded ? null : i)}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
                  <Badge className={`text-[7px] ${FAILURE_COLORS[lesson.failure_type] || 'text-white/40 bg-white/5'} border-white/10`}>
                    {lesson.failure_type?.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-white/50 text-xs flex-1 truncate">{lesson.agent_name || 'System'}</span>
                  <Badge className="text-[7px] bg-white/5 text-white/20 border-white/10">{lesson.severity}</Badge>
                  {isConsensus && <Badge className="text-[6px] bg-emerald-500/15 text-emerald-300 border-emerald-500/30">CONSENSUS</Badge>}
                  <Eye className={`w-3 h-3 ${isExpanded ? 'text-emerald-400' : 'text-white/10'}`} />
                </div>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
                    <p className="text-white/40 text-[10px]">{lesson.lesson_summary}</p>
                    {lesson.mutation_applied && (
                      <div className="flex gap-2 flex-wrap text-[8px]">
                        {lesson.mutation_applied.honour_delta && (
                          <Badge className="bg-red-500/10 text-red-300 border-red-500/20">
                            Honour: {lesson.mutation_applied.honour_delta}
                          </Badge>
                        )}
                        {lesson.mutation_applied.permissions_narrowed?.length > 0 && (
                          <Badge className="bg-orange-500/10 text-orange-300 border-orange-500/20">
                            Perms: -{lesson.mutation_applied.permissions_narrowed.length}
                          </Badge>
                        )}
                        {lesson.mutation_applied.cooldown_applied_hours > 0 && (
                          <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20">
                            Cooldown: {lesson.mutation_applied.cooldown_applied_hours}h
                          </Badge>
                        )}
                      </div>
                    )}
                    {lesson.consensus_nodes?.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {lesson.consensus_nodes.map(n => (
                          <Badge key={n} className="text-[6px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">{n}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-white/20 text-[8px]">Pattern seen {lesson.times_pattern_seen}x | Effectiveness: {lesson.effectiveness_score || 0}%</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}