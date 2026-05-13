import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Microscope, History, Shield, Hash, Fingerprint } from 'lucide-react';
import InvestigationInput from '@/components/admin-truth/InvestigationInput';
import AdminLeafEngine from '@/components/admin-truth/AdminLeafEngine';
import InvestigationHistory from '@/components/admin-truth/InvestigationHistory';
import InvestigationFilters from '@/components/admin-truth/InvestigationFilters';
import BuildOrderEngine from '@/components/admin-truth/BuildOrderEngine';
import Phase1GatePanel from '@/components/admin-truth/Phase1GatePanel';
import Phase1GateBadge from '@/components/admin-truth/Phase1GateBadge';
import ExposureReadinessPanel from '@/components/admin-truth/ExposureReadinessPanel';
import ExposureReadinessBadge from '@/components/admin-truth/ExposureReadinessBadge';
import VisibilityGovernancePanel from '@/components/admin-truth/VisibilityGovernancePanel';
import { computeBuildOrder } from '@/lib/buildOrderEngine';
import { evaluatePhase1Gate } from '@/lib/phase1CompletionGate';
import { evaluateExposureReadiness } from '@/lib/exposureReadinessEngine';
import SovereignIdentityPanel from '@/components/admin-truth/SovereignIdentityPanel';
import InvestigationTimeline from '@/components/admin-truth/InvestigationTimeline';
import CrossLinkPanel from '@/components/admin-truth/CrossLinkPanel';
import MemoryQueryPanel from '@/components/admin-truth/MemoryQueryPanel';
import { computeSovereignIdentity } from '@/lib/sovereignIdentity';

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
    nft_visibility: meta.nft_visibility || 'private',
    truth_visibility: meta.truth_visibility || 'private',
    skill_visibility: meta.skill_visibility || 'hidden',
    visibility_audit_log: meta.visibility_audit_log || [],
    sovereign_signature: meta.sovereign_signature || null,
    frozen_at: meta.frozen_at,
    created_date: memory.created_date,
  };
}

export default function AdminTruthEngine() {
  const [activeId, setActiveId] = useState(null);
  const [liveResult, setLiveResult] = useState(null);
  const [filters, setFilters] = useState({ target_type: 'all', risk_level: 'all', status: 'all', visibility: 'all' });
  const [currentBuildOrder, setCurrentBuildOrder] = useState(null);
  const [localWaivers, setLocalWaivers] = useState([]);
  const [sovereignId, setSovereignId] = useState(null);
  const queryClient = useQueryClient();

  // Compute sovereign identity once on mount
  React.useEffect(() => {
    computeSovereignIdentity().then(setSovereignId);
  }, []);

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

  // Visibility governance mutation (3-switch model)
  const updateVisibility = useMutation({
    mutationFn: async ({ id, field, new_value, reason }) => {
      const res = await base44.functions.invoke('adminTruthEngine', { action: 'update_visibility', id, field, new_value, reason });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-investigations'] });
      // Update live result audit log if we have one
      if (liveResult && data.audit_log) {
        setLiveResult(prev => prev ? { ...prev, visibility_audit_log: data.audit_log, [data.field]: data.to_state } : prev);
      }
    },
  });

  // Get current display investigation
  const currentInvestigation = liveResult && activeId === liveResult.id
    ? liveResult
    : filteredInvestigations.find(inv => inv.id === activeId) || null;

  // Phase-1 Gate — hard lock, recomputed whenever build order or waivers change
  const phase1Gate = useMemo(() => {
    if (!currentInvestigation || !currentBuildOrder) return null;
    return evaluatePhase1Gate(currentInvestigation.leaves, currentBuildOrder, localWaivers);
  }, [currentInvestigation, currentBuildOrder, localWaivers]);

  // ERE — recomputed automatically whenever inputs change (consumes gate result)
  const exposureReadiness = useMemo(() => {
    if (!currentInvestigation) return null;
    return evaluateExposureReadiness(
      currentInvestigation.leaves,
      currentBuildOrder,
      localWaivers,
      currentInvestigation.visibility_audit_log || []
    );
  }, [currentInvestigation, currentBuildOrder, localWaivers]);

  const handleSelect = (id) => {
    setActiveId(id);
    setLiveResult(null);
    setCurrentBuildOrder(null);
    setLocalWaivers([]);
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
            {/* Sovereign Identity */}
            <SovereignIdentityPanel />

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
                          <Phase1GateBadge result={phase1Gate} />
                          <ExposureReadinessBadge result={exposureReadiness} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={currentInvestigation.nft_visibility === 'public' ? 'text-emerald-400' : currentInvestigation.nft_visibility === 'internal' ? 'text-amber-400' : 'text-white/30'}>
                          NFT: {currentInvestigation.nft_visibility}
                        </span>
                        <span className={currentInvestigation.truth_visibility === 'public' ? 'text-emerald-400' : currentInvestigation.truth_visibility === 'internal' ? 'text-amber-400' : 'text-white/30'}>
                          Truth: {currentInvestigation.truth_visibility}
                        </span>
                        <span className={currentInvestigation.skill_visibility === 'listed' ? 'text-emerald-400' : currentInvestigation.skill_visibility === 'unlisted' ? 'text-amber-400' : 'text-white/30'}>
                          Skill: {currentInvestigation.skill_visibility}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 7-Leaf Display */}
                <AdminLeafEngine investigation={currentInvestigation} />

                {/* Build Order Engine */}
                <BuildOrderEngine investigation={currentInvestigation} onBuildOrderComputed={setCurrentBuildOrder} />

                {/* Phase-1 Completion Gate — hard lock (severity pillar) */}
                <Phase1GatePanel
                  result={phase1Gate}
                  onRequestWaiver={() => {
                    // Handled by the VisibilityGovernancePanel waiver dialog below
                    const waiverBtn = document.querySelector('[data-waiver-trigger]');
                    if (waiverBtn) waiverBtn.click();
                  }}
                />

                {/* Exposure Readiness Engine — deterministic governance intelligence */}
                <ExposureReadinessPanel result={exposureReadiness} />

                {/* Visibility Governance — gated by Phase-1 Gate + ERE */}
                <VisibilityGovernancePanel
                  investigation={currentInvestigation}
                  buildOrder={currentBuildOrder}
                  phase1Gate={phase1Gate}
                  exposureReadiness={exposureReadiness}
                  auditLog={currentInvestigation.visibility_audit_log || []}
                  onVisibilityChange={(field, newValue, reason) => {
                    updateVisibility.mutate({ id: currentInvestigation.id, field, new_value: newValue, reason });
                  }}
                  onWaiversChange={setLocalWaivers}
                />

                {/* Investigation Timeline — forensic replay */}
                <InvestigationTimeline investigation={currentInvestigation} />

                {/* Hash Footer — enriched with sovereign identity anchor */}
                {currentInvestigation.report_hash && (
                  <div className="rounded-lg border border-violet-500/10 bg-violet-500/5 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-violet-400/60" />
                      <p className="text-violet-400/60 text-[10px] uppercase tracking-wider font-semibold">Investigation Anchor</p>
                      {sovereignId && (
                        <div className="ml-auto flex items-center gap-1">
                          <Fingerprint className="w-3 h-3 text-violet-400/40" />
                          <span className="text-violet-400/40 font-mono text-[8px]">{sovereignId.public_surface.public_fingerprint}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-violet-300/80 font-mono text-[10px] break-all">{currentInvestigation.report_hash}</p>
                    <div className="flex flex-wrap gap-3 text-[9px] text-white/20 pt-1">
                      <span>Engine: {currentInvestigation.engine?.name || 'Admin Truth Engine'} v{currentInvestigation.engine?.version || '2.0.0'}</span>
                      <span>Hash: {currentInvestigation.hash_algo || 'sha256'}</span>
                      <span>Type: {currentInvestigation.target_type}</span>
                      <span>NFT: {currentInvestigation.nft_visibility} · Truth: {currentInvestigation.truth_visibility} · Skill: {currentInvestigation.skill_visibility}</span>
                      {currentInvestigation.frozen_at && <span>Frozen: {new Date(currentInvestigation.frozen_at).toLocaleString()}</span>}
                      {sovereignId && <span>Signed by: {sovereignId.public_surface.public_fingerprint}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Memory Intelligence — query engine + cross-link patterns */}
            {investigations.length > 0 && (
              <div className="space-y-4">
                <MemoryQueryPanel investigations={investigations} onSelectInvestigation={handleSelect} />
                <CrossLinkPanel investigations={investigations} />
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
          <span className="text-violet-400/40 font-semibold">Admin Truth Engine v2.6.0:</span> Sovereign Identity → Investigation → 7-Leaf Pipeline → Suggested Weight → Build Order Engine → Phase‑1 Gate → ERE → Visibility Governance → Memory Intelligence (timeline replay, cross-link patterns, forensic query). Seven-layer governance spine: 0. Sovereign Identity (who signs) · 1. Truth Engine (what is true) · 2. Test Suite (what is broken) · 3. Build Order Engine (what must be done) · 4. Phase‑1 Gate (is it structurally sound) · 5. ERE (is it safe to expose) · 6. Memory Intelligence (forensic record, queryable, replayable). Every artefact signed. Deterministic. Auditable. Tamper-proof. Testable.
          </p>
        </div>
      </div>
    </div>
  );
}