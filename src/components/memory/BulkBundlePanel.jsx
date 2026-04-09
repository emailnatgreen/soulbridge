import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Archive, Loader2, CheckCircle, AlertCircle, Play, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BATCH_SIZE = 500;

export default function BulkBundlePanel({ onComplete }) {
  const [counting, setCounting] = useState(false);
  const [stats, setStats] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ bundled: 0, deleted: 0, batches: 0, errors: [] });
  const [deleteAfter, setDeleteAfter] = useState(false);
  const [preserveOriginals, setPreserveOriginals] = useState(true);
  const [completed, setCompleted] = useState(false);
  const abortRef = useRef(false);

  const handleCount = async () => {
    setCounting(true);
    const res = await base44.functions.invoke('bulkBundleMemories', { action: 'count' });
    setStats(res.data);
    setCounting(false);
  };

  const handleStart = async () => {
    if (!stats) return;
    abortRef.current = false;
    setRunning(true);
    setCompleted(false);
    setProgress({ bundled: 0, deleted: 0, batches: 0, errors: [] });

    let offset = 0;
    let totalBundled = 0;
    let totalDeleted = 0;
    let batchCount = 0;
    const errors = [];

    while (offset < stats.total_memories && !abortRef.current) {
      try {
        const res = await base44.functions.invoke('bulkBundleMemories', {
          action: 'bundle_batch',
          offset: deleteAfter ? 0 : offset,
          limit: BATCH_SIZE,
          delete_after_bundle: deleteAfter,
          preserve_originals: preserveOriginals,
        });

        const data = res.data;
        totalBundled += data.bundled || 0;
        totalDeleted += data.deleted || 0;
        batchCount++;

        setProgress({ bundled: totalBundled, deleted: totalDeleted, batches: batchCount, errors });

        // If batch returned 0 memories, we're done
        if ((data.memories_in_batch || 0) === 0) break;

        // If not deleting, advance offset
        if (!deleteAfter) {
          offset += BATCH_SIZE;
        }

        // Safety: if we've done more than total, stop
        if (totalBundled >= stats.total_memories) break;

      } catch (err) {
        errors.push(`Batch ${batchCount + 1}: ${err?.response?.data?.error || err.message}`);
        setProgress(p => ({ ...p, errors: [...errors] }));
        // Continue to next batch despite error
        if (!deleteAfter) offset += BATCH_SIZE;
        batchCount++;
      }
    }

    setRunning(false);
    setCompleted(true);
    toast.success(`Bundled ${totalBundled} memories into Synthesis records${deleteAfter ? `, deleted ${totalDeleted} originals` : ''}`);
    if (onComplete) onComplete();
  };

  const handleStop = () => {
    abortRef.current = true;
    toast.info('Stopping after current batch completes...');
  };

  const estimatedBatches = stats ? Math.ceil(stats.total_memories / BATCH_SIZE) : 0;
  const progressPct = stats ? Math.min(100, (progress.bundled / stats.total_memories) * 100) : 0;

  return (
    <div className="rounded-2xl border border-emerald-600/40 bg-slate-800/50 backdrop-blur p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Archive className="w-5 h-5 text-emerald-400" />
        <h2 className="text-white font-semibold">Bulk Memory Bundler</h2>
        <Badge className="bg-emerald-500/20 text-emerald-300 text-xs ml-auto">Regulatory Archival</Badge>
      </div>

      <p className="text-slate-400 text-sm">
        Bundle all memories into Synthesis records for regulatory compliance. Each bundle of ~100 memories
        gets an AI-generated summary, themes, and retrieval hints.
      </p>

      {/* Step 1: Count */}
      {!stats && (
        <Button onClick={handleCount} disabled={counting} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
          {counting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
          {counting ? 'Counting...' : 'Count Memories'}
        </Button>
      )}

      {/* Step 2: Stats + Config */}
      {stats && !running && !completed && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-700/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.total_memories.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Total Memories</p>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-300">{stats.estimated_bundles}</p>
              <p className="text-xs text-slate-400">Synthesis Bundles</p>
            </div>
            <div className="bg-slate-700/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-violet-300">{estimatedBatches}</p>
              <p className="text-xs text-slate-400">Processing Batches</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl">
            <input
              type="checkbox"
              id="preserveOriginals"
              checked={preserveOriginals}
              onChange={e => setPreserveOriginals(e.target.checked)}
              className="accent-emerald-500"
            />
            <label htmlFor="preserveOriginals" className="text-sm text-slate-300 flex-1">
              <span className="font-medium">Preserve original memories (RECOMMENDED)</span>
              <br />
              <span className="text-xs text-slate-500">Keeps raw memories linked to synthesis bundles for Axi's context retrieval</span>
            </label>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs flex-shrink-0">
              Production Safe
            </Badge>
          </div>

          <div className="flex items-center gap-3 p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
            <input
              type="checkbox"
              id="deleteAfter"
              checked={deleteAfter}
              onChange={e => setDeleteAfter(e.target.checked)}
              className="accent-red-500"
            />
            <label htmlFor="deleteAfter" className="text-sm text-slate-300 flex-1">
              <span className="font-medium">Destructive: Delete originals after bundling</span>
              <br />
              <span className="text-xs text-red-400">⚠️ WARNING: Removes raw memories. Only for archive/cleanup after verification.</span>
            </label>
            {deleteAfter && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs flex-shrink-0">
                <Trash2 className="w-3 h-3 mr-1" /> Destructive
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleStart} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 flex-1">
              <Play className="w-4 h-4" />
              Start Bundling ({stats.total_memories.toLocaleString()} memories)
            </Button>
            <Button onClick={() => { setStats(null); setProgress({ bundled: 0, deleted: 0, batches: 0, errors: [] }); }}
              variant="outline" className="border-slate-600 text-slate-300">
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Running */}
      {running && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Bundling in progress...</p>
              <p className="text-slate-400 text-xs">Batch {progress.batches} — {progress.bundled.toLocaleString()} memories bundled</p>
            </div>
            <Button onClick={handleStop} size="sm" variant="outline" className="border-red-500/40 text-red-300 gap-1">
              <Square className="w-3 h-3" /> Stop
            </Button>
          </div>

          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="flex gap-4 text-xs text-slate-400">
            <span>Bundled: <span className="text-emerald-300 font-semibold">{progress.bundled.toLocaleString()}</span></span>
            {deleteAfter && <span>Deleted: <span className="text-red-300 font-semibold">{progress.deleted.toLocaleString()}</span></span>}
            <span>Batches: <span className="text-violet-300">{progress.batches}</span></span>
          </div>

          {progress.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 max-h-24 overflow-y-auto">
              {progress.errors.map((e, i) => (
                <p key={i} className="text-red-300 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Completed */}
      {completed && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Bundling Complete</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-900/20 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-300">{progress.bundled.toLocaleString()}</p>
              <p className="text-xs text-slate-400">Memories Bundled</p>
            </div>
            <div className="bg-violet-900/20 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-violet-300">{progress.batches}</p>
              <p className="text-xs text-slate-400">Batches Processed</p>
            </div>
            {deleteAfter && (
              <div className="bg-red-900/20 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-red-300">{progress.deleted.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Originals Deleted</p>
              </div>
            )}
          </div>
          <Button onClick={() => { setStats(null); setCompleted(false); setProgress({ bundled: 0, deleted: 0, batches: 0, errors: [] }); }}
            variant="outline" className="border-slate-600 text-slate-300">
            Run Again
          </Button>
        </div>
      )}
    </div>
  );
}