import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, BarChart3, Brain, Shield, AlertTriangle, Sparkles, Hash } from 'lucide-react';
import ClaimCard from './ClaimCard';
import PolicyBanner from './PolicyBanner';
import RiskList from './RiskList';
import MintNFTPreview from './MintNFTPreview';

const LEAF_CONFIG = [
  { key: 'claims', num: 1, icon: FileText, label: 'Claims', color: 'text-cyan-400' },
  { key: 'evidence', num: 2, icon: Search, label: 'Evidence', color: 'text-blue-400' },
  { key: 'scores', num: 3, icon: BarChart3, label: 'Scores', color: 'text-purple-400' },
  { key: 'reasoning', num: 4, icon: Brain, label: 'Reasoning', color: 'text-indigo-400' },
  { key: 'policy', num: 5, icon: Shield, label: 'Policy', color: 'text-emerald-400' },
  { key: 'risks', num: 6, icon: AlertTriangle, label: 'Risks', color: 'text-amber-400' },
  { key: 'synthesis', num: 7, icon: Sparkles, label: 'Synthesis', color: 'text-pink-400' },
];

export default function LeafReport({ report }) {
  if (!report) return null;

  const claims = report.leaf1_claims || [];
  const evidence = report.leaf2_evidence || [];
  const scores = report.leaf3_scores || [];

  return (
    <div className="space-y-4">
      {/* Leaf Navigation Badges */}
      <div className="flex flex-wrap gap-1.5">
        {LEAF_CONFIG.map(leaf => {
          const Icon = leaf.icon;
          return (
            <Badge key={leaf.num} className={`text-[10px] bg-white/5 border-white/10 ${leaf.color}`}>
              <Icon className="w-3 h-3 mr-1" />
              Leaf {leaf.num}: {leaf.label}
            </Badge>
          );
        })}
      </div>

      {/* Leaf 5: Policy Decision (shown first for quick glance) */}
      <PolicyBanner policy={report.leaf5_policy} />

      {/* Leaf 7: Synthesis (the verified answer) */}
      <Card className="bg-white/[0.03] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-pink-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Leaf 7 — Verified Synthesis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/80 text-sm leading-relaxed">{report.leaf7_synthesis}</p>
        </CardContent>
      </Card>

      {/* Leaf 1+2+3: Claims with Evidence and Scores */}
      <Card className="bg-white/[0.03] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-cyan-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Leaves 1-3 — Claims · Evidence · Scores
            <Badge className="text-[9px] bg-white/5 text-white/40 border-white/10 ml-auto">{claims.length} claims</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {claims.map(claim => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              score={scores.find(s => s.claim_id === claim.id)}
              evidence={evidence.find(e => e.claim_id === claim.id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Leaf 4: Reasoning */}
      <Card className="bg-white/[0.03] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-indigo-400 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            Leaf 4 — Reasoning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 text-xs leading-relaxed">{report.leaf4_reasoning}</p>
        </CardContent>
      </Card>

      {/* Leaf 6: Risks */}
      <Card className="bg-white/[0.03] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Leaf 6 — Risks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RiskList risks={report.leaf6_risks} />
        </CardContent>
      </Card>

      {/* Cryptographic Anchor */}
      {report.report_hash && (
        <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3 h-3 text-cyan-400/60" />
            <p className="text-cyan-400/60 text-[10px] uppercase tracking-wider font-semibold">Cryptographic Anchor</p>
          </div>
          <p className="text-cyan-300/80 font-mono text-[10px] break-all">{report.report_hash}</p>
          <div className="flex flex-wrap gap-3 text-[9px] text-white/20 pt-1">
            <span>Schema: {report.schema_version || 'v1'}</span>
            {report.veracity_summary && (
              <>
                <span>Avg: {(report.veracity_summary.avg_score * 100).toFixed(0)}%</span>
                <span>Min: {(report.veracity_summary.min_score * 100).toFixed(0)}%</span>
                <span>Max: {(report.veracity_summary.max_score * 100).toFixed(0)}%</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* NFT Mint Affordance */}
      <div className="flex items-center justify-between">
        <MintNFTPreview report={report} />
      </div>

      {/* Metadata Footer */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 flex flex-wrap gap-3 text-[10px] text-white/20">
        <span>Pipeline: {report.processing_ms ? `${(report.processing_ms / 1000).toFixed(1)}s` : '...'}</span>
        <span>Email: {report.email_sent ? '✓ sent' : '—'}</span>
        <span>Node 3: {report.node3_hook || 'stub'}</span>
        <span>Base44: {report.base44_hook || 'stub'}</span>
        {report.node3_outbox?.status && <span>Outbox: {report.node3_outbox.status}</span>}
        <span className="ml-auto">Report: {report.id?.slice(-8)}</span>
      </div>
    </div>
  );
}