import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Layers, Users, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { runSimulation, runBatch } from '@/lib/prisonerSimulation';
import DrawerGrid from './DrawerGrid';
import CycleAnalysis from './CycleAnalysis';
import PerformanceMetrics from './PerformanceMetrics';
import CoherenceCertificate from './CoherenceCertificate';

export default function PrisonerSimulator() {
  const [result, setResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [selectedPrisoner, setSelectedPrisoner] = useState(0);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState([]);

  const handleSingleRun = useCallback(() => {
    setRunning(true);
    setBatchResult(null);
    // Use requestAnimationFrame to let UI update
    requestAnimationFrame(() => {
      const res = runSimulation();
      setResult(res);
      setSelectedPrisoner(0);
      setHistory(prev => [{ type: 'single', success: res.success, time: res.totalTimeMs, timestamp: res.timestamp }, ...prev].slice(0, 20));
      setRunning(false);
    });
  }, []);

  const handleBatchRun = useCallback(() => {
    setRunning(true);
    setResult(null);
    requestAnimationFrame(() => {
      const res = runBatch(16);
      setBatchResult(res);
      // Show the first run's details
      if (res.runs.length > 0) {
        setResult(res.runs[0]);
        setSelectedPrisoner(0);
      }
      setHistory(prev => [{ type: 'batch', successRate: res.successRate, time: res.totalTimeMs, timestamp: res.timestamp }, ...prev].slice(0, 20));
      setRunning(false);
    });
  }, []);

  const prisonerResult = result?.prisonerResults?.[selectedPrisoner];

  return (
    <div className="space-y-5">
      {/* Leaf 6 Header */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              Leaf 6: 100 Prisoner Integration
              <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[9px]">LIVE</Badge>
            </h3>
            <p className="text-white/40 text-xs">The Jailbreak — emergent, leaderless collaboration under constraint</p>
          </div>
        </div>
        <p className="text-white/30 text-[10px] leading-relaxed">
          100 prisoners, 100 drawers. Each drawer holds a slip with a random number. Each prisoner starts at their own number 
          and follows the chain (open drawer → read slip → open that drawer) for up to 50 steps. 
          If ALL 100 find their own number → <span className="text-amber-300">Golden Bloom</span>. 
          If any chain exceeds 50 → <span className="text-red-300">Scar</span>. 
          The optimal pointer-following strategy yields ~31% coherence — proving decentralised intelligence without a master.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleSingleRun}
          disabled={running}
          className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-sm"
        >
          <Play className="w-4 h-4" />
          {running ? 'Running…' : 'Run Single'}
        </Button>
        <Button
          onClick={handleBatchRun}
          disabled={running}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-2 text-sm"
        >
          <Layers className="w-4 h-4" />
          {running ? 'Running…' : 'Run 16× Batch'}
        </Button>
        {result && (
          <Badge className={`text-xs ${result.success ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
            {result.success ? '✓ Coherent' : '✗ Broken'} — {result.totalTimeMs.toFixed(2)}ms
          </Badge>
        )}
      </div>

      {/* Certificate */}
      {(result || batchResult) && (
        <CoherenceCertificate result={!batchResult ? result : null} batchResult={batchResult} />
      )}

      {/* Performance */}
      <PerformanceMetrics result={!batchResult ? result : null} batchResult={batchResult} />

      {/* Cycle Analysis */}
      {result && (
        <CycleAnalysis cycles={result.cycles} maxSteps={result.maxAllowedSteps} />
      )}

      {/* Drawer Grid with prisoner selector */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">
              Drawer Grid — Prisoner {selectedPrisoner}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-white"
                onClick={() => setSelectedPrisoner(p => Math.max(0, p - 1))}
                disabled={selectedPrisoner <= 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-white/60 text-xs font-mono w-8 text-center">{selectedPrisoner}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-white"
                onClick={() => setSelectedPrisoner(p => Math.min(99, p + 1))}
                disabled={selectedPrisoner >= 99}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Badge className={`text-[9px] ml-2 ${prisonerResult?.found ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
                {prisonerResult?.found ? `Found in ${prisonerResult.stepsUsed} steps` : `Failed after ${prisonerResult?.stepsUsed || 0} steps`}
              </Badge>
            </div>
          </div>
          <DrawerGrid
            drawers={result.drawers}
            highlightChain={prisonerResult?.steps}
            prisonerNumber={selectedPrisoner}
            success={prisonerResult?.found}
          />
        </div>
      )}

      {/* Run History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2">
          <p className="text-white/30 text-[9px] uppercase tracking-wider">Session History</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <div key={i} className={`rounded-md border px-2 py-1 text-[9px] ${
                h.type === 'batch'
                  ? 'border-purple-500/30 bg-purple-500/5 text-purple-300'
                  : h.success
                    ? 'border-green-500/30 bg-green-500/5 text-green-300'
                    : 'border-red-500/30 bg-red-500/5 text-red-300'
              }`}>
                {h.type === 'batch' ? `Batch ${h.successRate}%` : h.success ? '✓' : '✗'} · {h.time.toFixed(1)}ms
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}