import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Shield, Activity, RefreshCw, AlertTriangle, Check, X, Clock, Filter, Zap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Node8RecommendationCard from './Node8RecommendationCard';
import Phase3ConfigPanel from './Phase3ConfigPanel';

const STAT_ICONS = {
  pending: Clock,
  approved: Check,
  denied: X,
};

export default function Node8OversightPanel() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showConfig, setShowConfig] = useState(false);
  const queryClient = useQueryClient();

  // Fetch recommendations
  const { data: recsData, isLoading } = useQuery({
    queryKey: ['node8-recs', statusFilter],
    queryFn: async () => {
      const params = { action: 'list', limit: 50 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await base44.functions.invoke('node8Injector', params);
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Generate recommendations
  const generateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('node8Injector', { action: 'generate' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['node8-recs'] }),
  });

  // Escalation check
  const escalateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('node8Injector', { action: 'escalate' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['node8-recs'] }),
  });

  // Approve
  const approveMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke('node8Injector', { action: 'approve', id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['node8-recs'] }),
  });

  // Deny
  const denyMutation = useMutation({
    mutationFn: ({ id, denial_rationale }) => base44.functions.invoke('node8Injector', { action: 'deny', id, denial_rationale }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['node8-recs'] }),
  });

  const recs = recsData?.recommendations || [];
  const config = recsData?.config || {};
  const pendingCount = recs.filter(r => r.status === 'pending').length;
  const approvedCount = recs.filter(r => r.status === 'approved').length;
  const deniedCount = recs.filter(r => r.status === 'denied').length;
  const autoExecCount = recs.filter(r => r.status === 'auto_executed').length;
  const isActing = approveMutation.isPending || denyMutation.isPending;

  // Override mutation (for auto-executed recs)
  const overrideMutation = useMutation({
    mutationFn: ({ id, override_reason }) => base44.functions.invoke('node8Injector', { action: 'override', id, override_reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['node8-recs'] }),
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="rounded-2xl border border-purple-500/20 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Node 8 Oversight — Constitutional Cockpit
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-500/10 text-cyan-300 border-cyan-500/20 text-[10px]">
              <Zap className="w-3 h-3 mr-1" />
              Phase 3: Graduated Autonomy
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConfig(!showConfig)}
              className="text-slate-400 hover:text-white h-6 w-6 p-0"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <StatBox label="Pending" count={pendingCount} icon={Clock} color="text-yellow-400" bg="bg-yellow-500/10 border-yellow-500/20" />
          <StatBox label="Approved" count={approvedCount} icon={Check} color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
          <StatBox label="Auto-Executed" count={autoExecCount} icon={Zap} color="text-cyan-400" bg="bg-cyan-500/10 border-cyan-500/20" />
          <StatBox label="Denied" count={deniedCount} icon={X} color="text-red-400" bg="bg-red-500/10 border-red-500/20" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-xs"
            variant="outline"
            size="sm"
          >
            {generateMutation.isPending ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Analyzing…</>
            ) : (
              <><Activity className="w-3.5 h-3.5 mr-1.5" /> Generate Recommendations</>
            )}
          </Button>
          <Button
            onClick={() => escalateMutation.mutate()}
            disabled={escalateMutation.isPending}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/30 text-xs"
            variant="outline"
            size="sm"
          >
            {escalateMutation.isPending ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> Checking…</>
            ) : (
              <><AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Check Escalations</>
            )}
          </Button>
        </div>

        {/* Generation Result */}
        {generateMutation.data && (
          <div className="mt-3 p-2 rounded-lg bg-purple-500/5 border border-purple-500/15 text-xs text-purple-300">
            {generateMutation.data.data?.recommendations_created > 0
              ? `✅ Created ${generateMutation.data.data.recommendations_created} recommendation(s) — Threat Level: ${generateMutation.data.data.threat_level}`
              : `✅ ${generateMutation.data.data?.message || 'No actionable threats.'}`
            }
          </div>
        )}
        {escalateMutation.data && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/15 text-xs text-red-300">
            {escalateMutation.data.data?.escalated > 0
              ? `🚨 Escalated ${escalateMutation.data.data.escalated} recommendation(s) to Governor`
              : `✅ No pending escalations. ${escalateMutation.data.data?.checked || 0} checked.`
            }
          </div>
        )}
      </div>

      {/* Phase 3 Config Panel */}
      {showConfig && <Phase3ConfigPanel config={config} />}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-slate-800/60 border-white/10 text-white text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="auto_executed">Auto-executed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[10px] text-slate-500">{recs.length} recommendation(s)</span>
      </div>

      {/* Recommendation List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : recs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No recommendations yet.</p>
          <p className="text-xs mt-1">Run "Generate Recommendations" to scan for threats.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map(rec => (
            <Node8RecommendationCard
              key={rec.id}
              rec={rec}
              onApprove={(id) => approveMutation.mutate(id)}
              onDeny={(id, rationale) => denyMutation.mutate({ id, denial_rationale: rationale })}
              onOverride={(id, reason) => overrideMutation.mutate({ id, override_reason: reason })}
              isActing={isActing || overrideMutation.isPending}
              config={config}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, count, icon: Icon, color, bg }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${bg}`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
      <p className="text-white text-lg font-bold">{count}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}