import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MemorySynthesisTrigger() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const runBundling = async () => {
    setRunning(true);
    setResult(null);
    setProgress({ done: 0, total: null });

    try {
      // Step 1: count
      const countRes = await base44.functions.invoke('bulkBundleMemories', { action: 'count' });
      const total = countRes.data?.total || 0;
      if (total === 0) {
        setResult({ success: true, message: 'No memories to bundle.' });
        setRunning(false);
        return;
      }
      setProgress({ done: 0, total });

      // Step 2: batch through
      let offset = 0;
      let bundled = 0;
      const batchSize = 500;
      while (offset < total) {
        const res = await base44.functions.invoke('bulkBundleMemories', {
          action: 'bundle_batch',
          offset,
          limit: batchSize,
          delete_after_bundle: false,
        });
        bundled += res.data?.bundled || 0;
        offset += batchSize;
        setProgress({ done: Math.min(offset, total), total });
      }

      setResult({ success: true, message: `Bundled ${bundled} memories into synthesis records.` });
      toast.success(`Synthesis complete — ${bundled} memories bundled`);
    } catch (e) {
      setResult({ success: false, message: e?.response?.data?.error || e?.message || 'Failed' });
      toast.error('Synthesis failed');
    }
    setRunning(false);
  };

  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border border-violet-500/30 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="text-white font-semibold text-sm">Memory Synthesis</h3>
            <p className="text-white/40 text-[10px]">Compress raw memories into indexed knowledge bundles for Axi</p>
          </div>
        </div>
        <Button
          onClick={runBundling}
          disabled={running}
          size="sm"
          className="bg-violet-600 hover:bg-violet-500 text-white gap-1.5 text-xs"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Running…' : 'Run Now'}
        </Button>
      </div>

      {running && progress?.total && (
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-white/40 text-[10px]">{progress.done.toLocaleString()} / {progress.total.toLocaleString()} memories processed ({pct}%)</p>
        </div>
      )}

      {result && (
        <div className={`flex items-center gap-2 mt-2 text-xs ${result.success ? 'text-green-300' : 'text-red-400'}`}>
          {result.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {result.message}
        </div>
      )}
    </div>
  );
}