import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Tag, GitCompare, Link2, Shield, Zap, Sparkles } from 'lucide-react';
import LeafRawData from './leaves/LeafRawData';
import LeafClassification from './leaves/LeafClassification';
import LeafContradictions from './leaves/LeafContradictions';
import LeafCrossLinks from './leaves/LeafCrossLinks';
import LeafRiskImpact from './leaves/LeafRiskImpact';
import LeafProposedActions from './leaves/LeafProposedActions';
import LeafSynthesis from './leaves/LeafSynthesis';
import WeightDistribution from './WeightDistribution';

export const ADMIN_LEAF_CONFIG = [
  { key: 'raw_data', num: 1, icon: Database, label: 'Raw Data', color: 'text-cyan-400', desc: 'Freeze the input before analysis', purpose: 'Immutable snapshot with source tagging and SHA-256 hash' },
  { key: 'classification', num: 2, icon: Tag, label: 'Classification', color: 'text-blue-400', desc: 'Sort into deterministic buckets', purpose: 'Type, domain, and priority classification' },
  { key: 'contradictions', num: 3, icon: GitCompare, label: 'Contradictions & Gaps', color: 'text-amber-400', desc: 'What is wrong, missing, or inconsistent', purpose: 'Gap detection, contradiction mapping, integrity flags' },
  { key: 'cross_links', num: 4, icon: Link2, label: 'Cross-Links', color: 'text-purple-400', desc: 'Map the relational structure', purpose: 'Node, agent, feature, and historical relationships' },
  { key: 'risk_impact', num: 5, icon: Shield, label: 'Risk & Impact', color: 'text-red-400', desc: 'Quantify the seriousness', purpose: 'Risk scoring, impact assessment, severity assignment' },
  { key: 'proposed_actions', num: 6, icon: Zap, label: 'Proposed Actions', color: 'text-emerald-400', desc: 'Define what must be done', purpose: 'Deterministic actions grouped by target with dependencies' },
  { key: 'synthesis', num: 7, icon: Sparkles, label: 'Synthesis', color: 'text-pink-400', desc: 'Final governance-ready output', purpose: 'Phase mapping, workflow export, visibility recommendation' },
];

const LEAF_COMPONENTS = {
  raw_data: LeafRawData,
  classification: LeafClassification,
  contradictions: LeafContradictions,
  cross_links: LeafCrossLinks,
  risk_impact: LeafRiskImpact,
  proposed_actions: LeafProposedActions,
  synthesis: LeafSynthesis,
};

function hasLeafData(data) {
  if (!data) return false;
  if (typeof data === 'string') return data.length > 0;
  if (typeof data === 'object' && !Array.isArray(data)) return Object.keys(data).length > 0 && (data.summary || data.phase_mapping);
  if (Array.isArray(data)) return data.length > 0;
  return true;
}

export default function AdminLeafEngine({ investigation, grounding }) {
  const [activeTab, setActiveTab] = useState('all');

  if (!investigation) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-12 text-center">
        <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No investigation loaded</p>
        <p className="text-slate-600 text-xs mt-1">Run the engine or select from history</p>
      </div>
    );
  }

  const leaves = investigation.leaves || {};
  const metrics = investigation.metrics || {};
  const groundingCtx = {
    grade: metrics.grounding_grade || null,
    confidence: metrics.confidence_score || null,
  };

  return (
    <div className="space-y-4">
      {/* Leaf summary badges */}
      <div className="flex flex-wrap gap-1.5">
        {ADMIN_LEAF_CONFIG.map(leaf => {
          const Icon = leaf.icon;
          const has = hasLeafData(leaves[leaf.key]);
          const count = Array.isArray(leaves[leaf.key]) ? leaves[leaf.key].length : null;
          return (
            <Badge key={leaf.num} className={`text-[10px] gap-1 ${has ? `bg-slate-800 border-slate-600 ${leaf.color}` : 'bg-slate-800/50 border-slate-700/50 text-slate-600'}`}>
              <Icon className="w-3 h-3" />
              L{leaf.num}
              {count !== null && count > 0 && <span className="opacity-60">({count})</span>}
            </Badge>
          );
        })}
      </div>

      {/* Metrics bar */}
      {investigation.metrics && (
        <div className="space-y-2 px-1">
          <div className="flex flex-wrap gap-3 text-[10px]">
            <span className="text-cyan-300">{investigation.metrics.total_data_points} data points</span>
            <span className="text-blue-300">{investigation.metrics.classified_items} classified</span>
            <span className="text-amber-300">{investigation.metrics.contradictions_found} contradictions</span>
            {investigation.metrics.integrity_flags > 0 && <span className="text-red-300 font-semibold">{investigation.metrics.integrity_flags} integrity flags</span>}
            <span className="text-purple-300">{investigation.metrics.cross_links_mapped} cross-links</span>
            <span className="text-red-300">{investigation.metrics.risks_identified} risks (avg {investigation.metrics.avg_risk_score}/10)</span>
            <span className="text-emerald-300">{investigation.metrics.actions_proposed} actions</span>
            <span className="text-pink-300">confidence: {investigation.metrics.confidence_score}%</span>
          </div>
          <WeightDistribution distribution={investigation.metrics.weight_distribution} avgWeight={investigation.metrics.avg_suggested_weight} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/80 border border-slate-700/60 flex-wrap h-auto gap-0.5 p-1">
          <TabsTrigger value="all" className="text-[10px] text-slate-400 data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">All Leaves</TabsTrigger>
          <TabsTrigger value="risks" className="text-[10px] text-slate-400 data-[state=active]:bg-red-600/25 data-[state=active]:text-red-200">Risks</TabsTrigger>
          <TabsTrigger value="gaps" className="text-[10px] text-slate-400 data-[state=active]:bg-amber-600/25 data-[state=active]:text-amber-200">Gaps</TabsTrigger>
          <TabsTrigger value="actions" className="text-[10px] text-slate-400 data-[state=active]:bg-emerald-600/25 data-[state=active]:text-emerald-200">Actions</TabsTrigger>
          <TabsTrigger value="links" className="text-[10px] text-slate-400 data-[state=active]:bg-purple-600/25 data-[state=active]:text-purple-200">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-3">
          {ADMIN_LEAF_CONFIG.map(leaf => {
            const Component = LEAF_COMPONENTS[leaf.key];
            return <Component key={leaf.num} leaf={leaf} data={leaves[leaf.key]} grounding={groundingCtx} />;
          })}
        </TabsContent>

        <TabsContent value="risks" className="space-y-3 mt-3">
          <LeafRiskImpact leaf={ADMIN_LEAF_CONFIG[4]} data={leaves.risk_impact} grounding={groundingCtx} />
        </TabsContent>

        <TabsContent value="gaps" className="space-y-3 mt-3">
          <LeafContradictions leaf={ADMIN_LEAF_CONFIG[2]} data={leaves.contradictions} grounding={groundingCtx} />
        </TabsContent>

        <TabsContent value="actions" className="space-y-3 mt-3">
          <LeafProposedActions leaf={ADMIN_LEAF_CONFIG[5]} data={leaves.proposed_actions} grounding={groundingCtx} />
        </TabsContent>

        <TabsContent value="links" className="space-y-3 mt-3">
          <LeafCrossLinks leaf={ADMIN_LEAF_CONFIG[3]} data={leaves.cross_links} grounding={groundingCtx} />
        </TabsContent>
      </Tabs>
    </div>
  );
}