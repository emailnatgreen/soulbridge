import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, CheckCircle, Download, Trash2 } from 'lucide-react';

const BUNDLE_SIZE = 1000;

function extractKeywords(text) {
  const stop = new Set(['the','a','an','is','it','to','of','and','in','that','was','for','on','are','as','with','they','be','at','by','this','have','from','or','had','not','but','what','all','were','when','we','there','been','one','do','if','into','has']);
  return [...new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(w => w.length > 3 && !stop.has(w))
  )].slice(0, 8);
}

export default function AxiChatImporter({ onImported }) {
  const [loading, setLoading] = useState(false);
  const [allMessages, setAllMessages] = useState([]);
  const [bundleIndex, setBundleIndex] = useState(0);
  const [importance, setImportance] = useState(6);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedBundle, setSavedBundle] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deletedBundles, setDeletedBundles] = useState(new Set());
  const [convoRef, setConvoRef] = useState(null);


  const totalBundles = Math.ceil(allMessages.length / BUNDLE_SIZE);
  const bundleStart = bundleIndex * BUNDLE_SIZE;
  const bundleEnd = Math.min(bundleStart + BUNDLE_SIZE, allMessages.length);
  const bundle = allMessages.slice(bundleStart, bundleEnd);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const conversations = await base44.agents.listConversations({ agent_name: 'axi' });
      const unified = conversations
        .filter(c => c.metadata?.unified_axi_chat === true)
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      if (!unified.length) { setAllMessages([]); setLoading(false); return; }
      const convo = await base44.agents.getConversation(unified[0].id);
      setConvoRef(convo);
      const msgs = (convo.messages || []).filter(m => m.content && m.role !== 'system');
      setAllMessages(msgs);
      setBundleIndex(0);
      setSavedBundle(null);
    } catch (err) {
      console.error('Failed to fetch AxiChat history:', err);
    }
    setLoading(false);
  };

  const saveBundle = async () => {
    if (!bundle.length) return;
    setSaving(true);
    setProgress(0);
    setSavedBundle(null);
    let done = 0;
    let savedCount = 0;
    const BATCH = 20;
    for (let i = 0; i < bundle.length; i += BATCH) {
      const chunk = bundle.slice(i, i + BATCH);
      const results = await Promise.all(chunk.map(msg =>
        base44.entities.Memory.create({
          agent_id: 'axi',
          user_id: msg.role === 'user' ? 'chat_user' : 'axi',
          type: 'conversation_snippet',
          content: msg.content,
          context: `AxiChat · ${msg.role} · ${msg.created_date ? new Date(msg.created_date).toLocaleDateString() : 'unknown'}`,
          keywords: extractKeywords(msg.content),
          importance,
        }).catch((error) => {
          console.error('Failed to save memory snippet:', error);
          return null;
        })
      ));
      savedCount += results.filter(Boolean).length;
      done += chunk.length;
      setProgress(done);
    }
    setSaving(false);
    if (savedCount === 0) {
      setSavedBundle(null);
      return;
    }
    setSavedBundle(bundleIndex);
    if (onImported) onImported();
    await deleteBundleFromChat(bundleIndex, allMessages);
  };

  const deleteBundleFromChat = async (idx, currentMsgs) => {
    if (!convoRef) return;
    setDeleting(true);
    try {
      const msgs = currentMsgs || allMessages;
      const start = idx * BUNDLE_SIZE;
      const end = Math.min(start + BUNDLE_SIZE, msgs.length);
      const bundleMsgs = msgs.slice(start, end);
      const sigSet = new Set(bundleMsgs.map(m => (m.created_date || '') + '||' + (m.content || '').slice(0, 40)));
      const fresh = await base44.agents.getConversation(convoRef.id);
      const remaining = (fresh.messages || []).filter(m => {
        const sig = (m.created_date || '') + '||' + (m.content || '').slice(0, 40);
        return !sigSet.has(sig);
      });
      if (remaining.length === fresh.messages.length) {
        return;
      }
      console.warn('Bundle deletion from AxiChat is not supported safely from this screen yet.');
    } catch (err) {
      console.error('Failed to delete bundle from chat:', err);
    }
    setDeleting(false);
  };

  return (
    <div className="rounded-2xl border border-violet-600/40 bg-slate-800/50 backdrop-blur p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-violet-400" />
        <h2 className="text-white font-semibold">Import AxiChat History into Memory</h2>
      </div>

      {allMessages.length === 0 ? (
        <div className="flex items-center gap-3">
          <p className="text-slate-400 text-sm flex-1">
            Load your full AxiChat conversation history, then save it in bundles of {BUNDLE_SIZE} messages.
          </p>
          <Button onClick={fetchHistory} disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white gap-2 flex-shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Load History
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-slate-400">Total messages: <span className="text-white font-semibold">{allMessages.length}</span></span>
            <span className="text-slate-400">Bundles: <span className="text-violet-300 font-semibold">{totalBundles}</span></span>
            <span className="text-slate-400">Current bundle: <span className="text-violet-300 font-semibold">{bundleIndex + 1} / {totalBundles}</span> (msgs {bundleStart + 1}–{bundleEnd})</span>
          </div>

          {/* Bundle nav */}
          {totalBundles > 1 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={bundleIndex === 0}
                className="border-slate-600 text-slate-300 h-7 px-3 text-xs"
                onClick={() => { setBundleIndex(i => i - 1); setSavedBundle(null); }}>
                ← Prev Bundle
              </Button>
              <div className="flex gap-1 flex-1 justify-center flex-wrap">
                {Array.from({ length: totalBundles }, (_, i) => (
                  <button key={i} onClick={() => { setBundleIndex(i); setSavedBundle(null); }}
                    className={`w-6 h-6 rounded text-xs font-semibold transition-colors ${i === bundleIndex ? 'bg-violet-500 text-white' : savedBundle === i ? 'bg-green-600/30 text-green-300 border border-green-500/40' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" disabled={bundleIndex >= totalBundles - 1}
                className="border-slate-600 text-slate-300 h-7 px-3 text-xs"
                onClick={() => { setBundleIndex(i => i + 1); setSavedBundle(null); }}>
                Next Bundle →
              </Button>
            </div>
          )}

          {/* Importance */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 w-32 flex-shrink-0">
              Importance: <span className="text-violet-300 font-semibold">{importance}/10</span>
            </label>
            <input type="range" min={1} max={10} value={importance} onChange={e => setImportance(Number(e.target.value))}
              className="flex-1 accent-violet-500" />
          </div>

          {/* Progress */}
          {saving && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
                <span>Saving {progress} / {bundle.length}…</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-200" style={{ width: `${(progress / bundle.length) * 100}%` }} />
              </div>
            </div>
          )}

          {savedBundle === bundleIndex && !saving && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>
                Bundle {bundleIndex + 1} saved to Memory
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={saveBundle} disabled={saving || !bundle.length}
              className="bg-violet-600 hover:bg-violet-500 text-white gap-2 flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Save Bundle {bundleIndex + 1} ({bundle.length} messages)
            </Button>
            <Button onClick={fetchHistory} disabled={loading} variant="outline"
              className="border-slate-600 text-slate-300 hover:text-white gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Reload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}