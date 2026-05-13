import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Microscope, History, Shield, Hash } from 'lucide-react';
import InvestigationInput from '@/components/admin-truth/InvestigationInput';
import AdminLeafEngine from '@/components/admin-truth/AdminLeafEngine';
import InvestigationHistory from '@/components/admin-truth/InvestigationHistory';
import InvestigationFilters from '@/components/admin-truth/InvestigationFilters';
import WorkflowGenerator from '@/components/admin-truth/WorkflowGenerator';
import VisibilityToggle from '@/components/admin-truth/VisibilityToggle';

function parseInvestigation(memory) {
  if (!memory) return null;
  const meta = typeof memory.context === 'string' ? JSON.parse(memory.context) : (memory.context || {});
  return {
    id: memory.id,
    question: memory.content,
    target_type: meta.target_type || 'general',
    status: meta.status || 'complete',
    leaves: meta.leaves || {},
    metrics: meta.metrics || null,
    processing_ms: meta.processing_ms,
    report_hash: meta.report_hash,
    hash_algo: meta.hash_algo || 'sha256',
    engine: meta.engine,
    is_public: meta.is_public || false,
    frozen_at: meta.frozen_at,
    created_date: memory.created_date,
  };
}

export default function AdminTruthEngine() {
  const [activeId, setActiveId] = useState(null);
  const [liveResult, setLiveResult] = useState(null);
  const [filters, setFilters] = useState({ target_type: 'all', risk_level: 'all', status: 'all', visibility: 'all' });
  const queryClient = useQueryClient();

  // Load investigation history
  const { data: rawInvestigations = [] } = useQuery({
    queryKey: ['admin-investigations'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminTruthEngine', { action: 'list' });
      return res.data.investigations || [];
    },
  });

  const investigations = useMemo(() => rawInvestigations.map(parseInvestigation).filter(Boolean), [rawInvestigations]);

  // Apply filters
  const filteredInvestigations = useMemo(() => {
    return investigations.filter(inv => {
      if (filters.target_type !== 'all' && inv.target_type !== filters.target_type) return false;
      if (filters.status !== 'all' && inv.status !== filters.status) return false;
      if (filters.visibility === 'public' && !inv.is_public) return false;
      if (filters.visibility === 'private' && inv.is_public) return false;
      if (filters.risk_level !== 'all' && inv.leaves?.risk_impact) {
        const hasMatchingRisk = inv.leaves.risk_impact.some(r => r.severity === filters.risk_level);
        if (!hasMatchingRisk) return false;
      }
      return true;
    });
  }, [investigations, filters]);

  // Investigation mutation
  const investigateMutation = useMutation({
    mutationFn: async ({ question, target_type }) => {
      const res = await base44.functions.invoke('adminTruthEngine', { action: 'investigate', question, target_type });
      return res.data;
    },
    onSuccess: (data) => {
      setLiveResult(data);
      setActiveId(data.id);
      queryClient.invalidateQueries({ queryKey: ['admin-investigations'] });
    },
  });

  // Visibility toggle
  const toggleVisibility = useMutation({
    mutationFn: async ({ id, is_public }) => {
      const res = await base44.functions.invoke('adminTruthEngine', { action: 'toggle_visibility', id, is_public });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-investigations'] });
    },
  });

  // Get current display investigation
  const currentInvestigation = liveResult && activeId === liveResult.id
    ? liveResult
    : filteredInvestigations.find(inv => inv.id === activeId) || null;

  const handleSelect = (id) => {
    setActiveId(id);
    setLiveResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/10 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Microscope className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Admin Truth Engine</h1>
              <Badge className="text-[9px] bg-violet-500/15 text-violet-300 border-violet-500/30">7-LEAF</Badge>
              <Badge className="text-[9px] bg-red-500/15 text-red-300 border-red-500/30">ADMIN ONLY</Badge>
            </div>
            <p className="text-white/40 text-xs">Sovereign investigation engine — nodes, agents, features, system integrity</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Sovereign Agent Badge */}
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-violet-300 text-[10px] font-semibold uppercase tracking-wider">Sovereign Investigator</span>
              </div>
              <p className="text-white/30 text-[9px]">Private agent • Non-discoverable • Admin-locked • Investigation memory only</p>
            </div>

            {/* Filters */}
            <Card className="bg-white/[0.03] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-white/50">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <InvestigationFilters filters={filters} onFilterChange={setFilters} />
              </CardContent>
            </Card>

            {/* History */}
            <Card className="bg-white/[0.03] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-white/50 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Investigation History
                  <Badge className="text-[8px] bg-white/5 text-white/30 border-white/10 ml-auto">{filteredInvestigations.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InvestigationHistory investigations={filteredInvestigations} selectedId={activeId} onSelect={handleSelect} />
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Input */}
            <InvestigationInput onSubmit={(data) => investigateMutation.mutate(data)} isProcessing={investigateMutation.isPending} />

            {/* Processing */}
            {investigateMutation.isPending && (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
                <div>
                  <p className="text-violet-300 text-sm font-medium">Investigation Running...</p>
                  <p className="text-white/30 text-xs mt-1">7-Leaf Pipeline: Raw → Classify → Contradictions → Cross-link → Risk → Actions → Synthesis</p>
                </div>
              </div>
            )}

            {/* Error */}
            {investigateMutation.isError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-red-400 text-xs">{investigateMutation.error?.message || 'Investigation failed'}</p>
              </div>
            )}

            {/* Investigation Display */}
            {currentInvestigation && !investigateMutation.isPending && (
              <div className="space-y-4">
                {/* Header */}
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Investigation</p>
                        <p className="text-white text-sm">{currentInvestigation.question}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className="text-[9px] bg-violet-500/15 text-violet-300 border-violet-500/30">{currentInvestigation.target_type}</Badge>
                          {currentInvestigation.processing_ms && (
                            <span className="text-white/20 text-[9px]">{(currentInvestigation.processing_ms / 1000).toFixed(1)}s</span>
                          )}
                          {currentInvestigation.metrics?.confidence_score > 0 && (
                            <Badge className={`text-[9px] ${currentInvestigation.metrics.confidence_score >= 70 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : currentInvestigation.metrics.confidence_score >= 40 ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                              {currentInvestigation.metrics.confidence_score}% confidence
                            </Badge>
                          )}
                          {currentInvestigation.metrics?.critical_risks > 0 && (
                            <Badge className="text-[9px] bg-red-500/15 text-red-300 border-red-500/30">{currentInvestigation.metrics.critical_risks} critical</Badge>
                          )}
                        </div>
                      </div>
                      <VisibilityToggle
                        isPublic={currentInvestigation.is_public}
                        onToggle={(val) => toggleVisibility.mutate({ id: currentInvestigation.id, is_public: val })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 7-Leaf Display */}
                <AdminLeafEngine investigation={currentInvestigation} />

                {/* Workflow Generator */}
                <WorkflowGenerator investigation={currentInvestigation} />

                {/* Hash Footer */}
                {currentInvestigation.report_hash && (
                  <div className="rounded-lg border border-violet-500/10 bg-violet-500/5 p-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-violet-400/60" />
                      <p className="text-violet-400/60 text-[10px] uppercase tracking-wider font-semibold">Investigation Anchor</p>
                    </div>
                    <p className="text-violet-300/80 font-mono text-[10px] break-all">{currentInvestigation.report_hash}</p>
                    <div className="flex flex-wrap gap-3 text-[9px] text-white/20 pt-1">
                      <span>Engine: {currentInvestigation.engine?.name || 'Admin Truth Engine'} v{currentInvestigation.engine?.version || '2.0.0'}</span>
                      <span>Hash: {currentInvestigation.hash_algo || 'sha256'}</span>
                      <span>Type: {currentInvestigation.target_type}</span>
                      <span>Visibility: {currentInvestigation.is_public ? 'Public' : 'Private'}</span>
                      {currentInvestigation.frozen_at && <span>Frozen: {new Date(currentInvestigation.frozen_at).toLocaleString()}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!currentInvestigation && !investigateMutation.isPending && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
                <Microscope className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/20 text-sm">No investigation loaded</p>
                <p className="text-white/10 text-xs mt-1">Select a target type and describe what to investigate</p>
              </div>
            )}
          </div>
        </div>

        {/* Engine Doctrine */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-white/20 text-[10px] leading-relaxed">
          <span className="text-violet-400/40 font-semibold">Admin Truth Engine v2.1.0:</span> Investigation → LLM Analysis (web-grounded) → 7-Leaf Deterministic Pipeline: L1 Raw Data (source-tagged, immutable snapshot) · L2 Classification (type/domain/priority buckets) · L3 Contradictions & Gaps (integrity flags) · L4 Cross-Links (node/agent/feature/historical) · L5 Risk & Impact (scored 1-10, suggested weight) · L6 Proposed Actions (grouped, dependency-ordered, weighted) · L7 Synthesis (phase-mapped, confidence score) → Suggested Weight: (risk × impact) + contradictions + dependencies → SHA-256 Hash → Sovereign Memory. Deterministic. Auditable. Governance-safe.
          </p>
        </div>
      </div>
    </div>
  );
}