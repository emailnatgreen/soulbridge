import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Microscope, History } from 'lucide-react';
import TruthChatInput from '@/components/truth/TruthChatInput';
import LeafReport from '@/components/truth/LeafReport';
import ReportHistoryList from '@/components/truth/ReportHistoryList';

export default function TruthEngine() {
  const [activeReportId, setActiveReportId] = useState(null);
  const [liveReport, setLiveReport] = useState(null);
  const queryClient = useQueryClient();

  // Load history
  const { data: reports = [] } = useQuery({
    queryKey: ['truth-reports'],
    queryFn: () => base44.entities.TruthReport.list('-created_date', 30),
  });

  // Ask mutation
  const askMutation = useMutation({
    mutationFn: async (question) => {
      const res = await base44.functions.invoke('truthEngine', { action: 'ask', question });
      return res.data;
    },
    onSuccess: (data) => {
      setLiveReport(data);
      setActiveReportId(data.report_id);
      queryClient.invalidateQueries({ queryKey: ['truth-reports'] });
    },
  });

  // Get selected report from history or live
  const displayReport = liveReport && activeReportId === liveReport.report_id
    ? {
        id: liveReport.report_id,
        question: liveReport.question,
        raw_answer: liveReport.raw_answer,
        leaf1_claims: liveReport.leaf1_claims,
        leaf2_evidence: liveReport.leaf2_evidence,
        leaf3_scores: liveReport.leaf3_scores,
        leaf4_reasoning: liveReport.leaf4_reasoning,
        leaf5_policy: liveReport.leaf5_policy,
        leaf6_risks: liveReport.leaf6_risks,
        leaf7_synthesis: liveReport.leaf7_synthesis,
        status: liveReport.status,
        processing_ms: liveReport.processing_ms,
        email_sent: liveReport.email_sent,
        node3_hook: liveReport.node3_hook,
        base44_hook: liveReport.base44_hook,
      }
    : reports.find(r => r.id === activeReportId) || null;

  const handleSelectReport = (id) => {
    setActiveReportId(id);
    setLiveReport(null); // clear live data so we use stored version
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/10 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Microscope className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">Truth Engine</h1>
              <Badge className="text-[9px] bg-cyan-500/15 text-cyan-300 border-cyan-500/30">7-LEAF</Badge>
            </div>
            <p className="text-white/40 text-xs">Ask anything → LLM answers → claims extracted → verified → 7-leaf report → emailed to you</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar: History */}
          <div className="lg:col-span-1">
            <Card className="bg-white/[0.03] border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-white/50 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  Report History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReportHistoryList
                  reports={reports}
                  selectedId={activeReportId}
                  onSelect={handleSelectReport}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main: Chat + Report */}
          <div className="lg:col-span-3 space-y-4">
            {/* Chat Input */}
            <TruthChatInput onSubmit={(q) => askMutation.mutate(q)} isProcessing={askMutation.isPending} />

            {/* Processing State */}
            {askMutation.isPending && (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                <div>
                  <p className="text-cyan-300 text-sm font-medium">Truth Pipeline Running...</p>
                  <p className="text-white/30 text-xs mt-1">LLM → Claims → Evidence → Verify → Synthesize → Email</p>
                </div>
              </div>
            )}

            {/* Error */}
            {askMutation.isError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-red-400 text-xs">{askMutation.error?.message || 'Pipeline failed'}</p>
              </div>
            )}

            {/* Report Display */}
            {displayReport && !askMutation.isPending && (
              <div className="space-y-4">
                {/* Question + Raw Answer */}
                <Card className="bg-white/[0.03] border-white/10">
                  <CardContent className="py-4 space-y-3">
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Question</p>
                      <p className="text-white text-sm">{displayReport.question}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Raw LLM Answer <Badge className="text-[8px] bg-red-500/10 text-red-300/60 border-red-500/20 ml-1">UNTRUSTED</Badge></p>
                      <p className="text-white/50 text-xs leading-relaxed">{displayReport.raw_answer}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* 7-Leaf Report */}
                <LeafReport report={displayReport} />
              </div>
            )}

            {/* Empty State */}
            {!displayReport && !askMutation.isPending && (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
                <Microscope className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/20 text-sm">Ask a question to begin verification</p>
                <p className="text-white/10 text-xs mt-1">Every answer is decomposed into atomic claims, verified, scored, and synthesized</p>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Doctrine */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-white/20 text-[10px] leading-relaxed">
            <span className="text-cyan-400/40 font-semibold">Truth Engine Pipeline:</span> Question → LLM Draft (untrusted) → Claim Extraction → Evidence Retrieval (web-grounded) → Veracity Scoring → Policy Decision → Risk Flagging → Verified Synthesis → Email Report. 
            Node 3 and Base44 on-chain hooks are stubbed for future integration. Each report is stored as a TruthReport entity with full audit trail.
          </p>
        </div>
      </div>
    </div>
  );
}