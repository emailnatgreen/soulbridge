import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Layers, ArrowRight, ShieldAlert, TestTube, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import SuggestedWeightBadge from './SuggestedWeightBadge';
import { computeBuildOrder } from '@/lib/buildOrderEngine';

const PHASE_STYLES = {
  1: { border: 'border-red-500/20', bg: 'bg-red-500/5', badge: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Critical Fixes' },
  2: { border: 'border-amber-500/20', bg: 'bg-amber-500/5', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Hardening' },
  3: { border: 'border-blue-500/20', bg: 'bg-blue-500/5', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Optimisation' },
  4: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Pre-publish' },
};

function StepRow({ step }) {
  return (
    <div className={`flex items-start gap-2 pl-3 py-1.5 text-[10px] rounded ${step.publish_blocker ? 'bg-red-500/5' : ''}`}>
      <ArrowRight className="w-2.5 h-2.5 text-white/15 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white/60 font-mono text-[8px] text-white/20">{step.step_id}</span>
          <span className="text-white/70">{step.title}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <SuggestedWeightBadge weight={step.suggested_weight} category={step.weight_category} />
          {step.publish_blocker && (
            <Badge className="text-[7px] bg-red-500/25 text-red-200 border-red-400/30 gap-0.5">
              <ShieldAlert className="w-2 h-2" /> BLOCKER
            </Badge>
          )}
          {step.test_required && (
            <Badge className="text-[7px] bg-cyan-500/15 text-cyan-300 border-cyan-500/25 gap-0.5">
              <TestTube className="w-2 h-2" /> TEST
            </Badge>
          )}
          {step.target && step.target !== 'general' && (
            <Badge className="text-[7px] bg-white/5 text-white/30 border-white/10">{step.target}</Badge>
          )}
          {step.dependencies && step.dependencies !== 'none' && (
            <span className="text-white/20 text-[8px]">deps: {step.dependencies}</span>
          )}
          <Badge className="text-[7px] bg-white/5 text-white/20 border-white/5 ml-auto">L{step.source_leaf}</Badge>
        </div>
      </div>
    </div>
  );
}

function PhaseBlock({ phaseData }) {
  const [expanded, setExpanded] = useState(true);
  const style = PHASE_STYLES[phaseData.phase] || PHASE_STYLES[3];

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 p-2.5 text-left">
        <Badge className={`text-[9px] ${style.badge}`}>Phase {phaseData.phase}</Badge>
        <span className="text-white/60 text-xs font-medium">{phaseData.name}</span>
        <span className="text-white/20 text-[9px] ml-auto">{phaseData.steps.length} step{phaseData.steps.length !== 1 ? 's' : ''}</span>
        {expanded ? <ChevronUp className="w-3 h-3 text-white/20" /> : <ChevronDown className="w-3 h-3 text-white/20" />}
      </button>
      {expanded && (
        <div className="border-t border-white/5 p-2 space-y-0.5">
          {phaseData.steps.map(step => <StepRow key={step.step_id} step={step} />)}
        </div>
      )}
    </div>
  );
}

export default function BuildOrderEngine({ investigation }) {
  const [buildOrder, setBuildOrder] = useState(null);

  if (!investigation || !investigation.leaves) return null;

  const handleCompute = () => {
    const result = computeBuildOrder(investigation.leaves);
    setBuildOrder(result);
  };

  // Allow recomputation
  const handleRecompute = () => {
    setBuildOrder(null);
    setTimeout(() => {
      const result = computeBuildOrder(investigation.leaves);
      setBuildOrder(result);
    }, 0);
  };

  return (
    <Card className="bg-white/[0.03] border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-violet-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Build Order Engine
          <Badge className="text-[7px] bg-violet-500/10 text-violet-300/60 border-violet-500/20 ml-1">DETERMINISTIC</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-white/25 text-[10px]">
          Pure orchestration — consumes L3 contradictions, L4 cross-links, L5 risk + weight, L6 actions, L7 synthesis. Same inputs → same ordering. Non-LLM. Non-destructive.
        </p>

        {!buildOrder ? (
          <Button onClick={handleCompute} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs w-full">
            <Layers className="w-3 h-3 mr-1" /> Compute Build Order
          </Button>
        ) : (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-3 text-[10px] items-center">
              <span className="text-white/40">{buildOrder.summary.total} steps</span>
              {buildOrder.summary.blockers > 0 && (
                <span className="text-red-400 font-semibold">{buildOrder.summary.blockers} publish blockers</span>
              )}
              <span className="text-cyan-400/70">{buildOrder.summary.tests_required} tests required</span>
              {Object.entries(buildOrder.summary.by_phase).map(([p, count]) => (
                <span key={p} className="text-white/20">P{p}: {count}</span>
              ))}
              <Button onClick={handleRecompute} variant="ghost" size="sm" className="h-5 px-1.5 text-white/30 hover:text-white/60 ml-auto">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>

            {/* Phase blocks */}
            {buildOrder.phases.map(phase => (
              <PhaseBlock key={phase.phase} phaseData={phase} />
            ))}

            {buildOrder.phases.length === 0 && (
              <p className="text-white/20 text-xs text-center py-3">No actionable steps found in investigation data</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}