import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Brain, X, Loader2, CheckCircle } from 'lucide-react';

const BUNDLE_SIZE = 1000;

function extractKeywords(text) {
  const stopWords = new Set(['the','a','an','is','it','to','of','and','in','that','was','for','on','are','as','with','his','they','be','at','by','this','have','from','or','had','not','but','what','all','were','when','we','there','been','one','do','if','into','has']);
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
  )].slice(0, 8);
}

export default function SaveToMemoryPanel({ messages, conversation, onClose, onDeleted }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [importance, setImportance] = useState(6);
  const [bundleStart, setBundleStart] = useState(0);

  const msgCount = messages.length;
  const bundleEnd = Math.min(bundleStart + BUNDLE_SIZE, msgCount);
  const bundle = messages.slice(bundleStart, bundleEnd);

  const handleSave = async () => {
    if (!bundle.length) return;
    setSaving(true);
    setSaved(false);
    setProgress(0);
    setTotal(bundle.length);

    let saved = 0;
    let savedCount = 0;
    const BATCH = 20;
    for (let i = 0; i < bundle.length; i += BATCH) {
      const chunk = bundle.slice(i, i + BATCH);
      const results = await Promise.all(chunk.map(msg => {
        if (!msg.content || msg.role === 'system') return Promise.resolve(null);
        const keywords = extractKeywords(msg.content);
        return base44.entities.Memory.create({
          agent_id: 'axi',
          type: 'conversation_snippet',
          content: msg.content,
          context: `AxiChat · ${msg.role} · ${msg.created_date ? new Date(msg.created_date).toLocaleDateString() : 'unknown date'}`,
          keywords,
          importance,
        }).catch((error) => {
          console.error('Failed to save memory snippet:', error);
          return null;
        });
      }));
      savedCount += results.filter(Boolean).length;
      saved += chunk.length;
      setProgress(saved);
    }
    setSaving(false);
    setSaved(savedCount > 0);
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-slate-900 border border-violet-500/40 rounded-xl shadow-2xl z-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="text-white text-sm font-semibold">Save to Memory Browser</span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      <div className="text-xs text-slate-400 space-y-1">
        <p>Total messages: <span className="text-white font-medium">{msgCount}</span></p>
        <p>Bundle: <span className="text-violet-300 font-medium">messages {bundleStart + 1}–{bundleEnd}</span> ({bundle.length} items)</p>
      </div>

      {/* Bundle navigation */}
      {msgCount > BUNDLE_SIZE && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={bundleStart === 0}
            className="text-xs border-slate-600 text-slate-300 h-7 px-2"
            onClick={() => setBundleStart(Math.max(0, bundleStart - BUNDLE_SIZE))}>
            ← Prev
          </Button>
          <span className="text-xs text-slate-500 flex-1 text-center">
            Bundle {Math.floor(bundleStart / BUNDLE_SIZE) + 1} / {Math.ceil(msgCount / BUNDLE_SIZE)}
          </span>
          <Button size="sm" variant="outline" disabled={bundleEnd >= msgCount}
            className="text-xs border-slate-600 text-slate-300 h-7 px-2"
            onClick={() => setBundleStart(bundleEnd)}>
            Next →
          </Button>
        </div>
      )}

      {/* Importance */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-400 w-24 flex-shrink-0">Importance: <span className="text-violet-300 font-semibold">{importance}/10</span></label>
        <input type="range" min={1} max={10} value={importance} onChange={e => setImportance(Number(e.target.value))}
          className="flex-1 accent-violet-500" />
      </div>

      {/* Progress */}
      {saving && (
        <div className="text-xs text-slate-400">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
            <span>Saving {progress}/{total}…</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${(progress / total) * 100}%` }} />
          </div>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-green-400 text-xs">
          <CheckCircle className="w-4 h-4" />
          <span>Saved bundle to Memory Browser.</span>
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || !bundle.length}
        className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs h-8 gap-2"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
        Save Bundle to Memory ({bundle.length} messages)
      </Button>
    </div>
  );
}