import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Zap, Clock, BarChart3, Activity } from 'lucide-react';

function Metric({ icon: Icon, label, value, sub, good }) {
  return (
    <div className={`rounded-lg border p-3 ${good ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${good ? 'text-green-400' : 'text-slate-400'}`} />
        <span className="text-white/40 text-[9px] uppercase">{label}</span>
      </div>
      <p className={`text-lg font-bold ${good ? 'text-green-300' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-white/25 text-[9px] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PerformanceMetrics({ result, batchResult }) {
  if (!result && !batchResult) return null;

  if (batchResult) {
    return (
      <div className="space-y-3">
        <p className="text-white/40 text-[10px] uppercase tracking-wider">Batch Performance — {batchResult.batchSize}× Runs</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Metric icon={BarChart3} label="Success Rate" value={`${batchResult.successRate}%`} sub={`${batchResult.successes}/${batchResult.batchSize} coherent`} good={batchResult.successRate > 25} />
          <Metric icon={Clock} label="Avg Time" value={`${batchResult.avgTimeMs}ms`} sub="Per simulation" good={batchResult.avgTimeMs < 100} />
          <Metric icon={Activity} label="Avg Longest Cycle" value={batchResult.avgLongestCycle} sub="Mean maximum chain" />
          <Metric icon={Zap} label="Total Time" value={`${batchResult.totalTimeMs}ms`} sub={`${batchResult.batchSize} runs`} good={batchResult.totalTimeMs < 2000} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-white/40 text-[10px] uppercase tracking-wider">Single Run Performance</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric icon={Zap} label="Total Time" value={`${result.totalTimeMs.toFixed(2)}ms`} sub="Setup + cycles" good={result.totalTimeMs < 10} />
        <Metric icon={Clock} label="Cycle Time" value={`${result.cycleTimeMs.toFixed(2)}ms`} sub="100 prisoners" good={result.cycleTimeMs < 5} />
        <Metric icon={Activity} label="Avg Steps" value={result.avgSteps} sub={`Max: ${result.maxStepsUsed}/${result.maxAllowedSteps}`} />
        <Metric icon={BarChart3} label="Cycles" value={result.cycleCount} sub={`Longest: ${result.longestCycle}`} good={result.longestCycle <= result.maxAllowedSteps} />
      </div>
    </div>
  );
}