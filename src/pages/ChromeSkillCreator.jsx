import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Heart, Sparkles, ScrollText, X, Loader2 } from 'lucide-react';
import SimulatedPayDialog from '@/components/chrome-skill/SimulatedPayDialog';
import HonourSafetyPreview from '@/components/chrome-skill/HonourSafetyPreview';
import { SuccessModal, ErrorModal } from '@/components/chrome-skill/SkillResultModal';

export default function ChromeSkillCreator() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triggers, setTriggers] = useState([]);
  const [actions, setActions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [harnessResult, setHarnessResult] = useState(null);

  // Live preview state
  const [preview, setPreview] = useState({ honour: null, safety: null, honour_signals: [], safety_signals: [], risk_flag: null });
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewAbort = useRef(null);

  // Debounced live preview — 400ms after last change
  useEffect(() => {
    if (!title && !description) {
      setPreview({ honour: null, safety: null, honour_signals: [], safety_signals: [], risk_flag: null });
      return;
    }

    const timeout = setTimeout(async () => {
      if (previewAbort.current) previewAbort.current.abort();
      const controller = new AbortController();
      previewAbort.current = controller;
      setPreviewLoading(true);
      try {
        const res = await base44.functions.invoke('chromeSkillPreview', { title, description, triggers, actions });
        if (!controller.signal.aborted && res.data?.status === 'scored') {
          setPreview(res.data);
        }
      } catch (e) {
        if (!controller.signal.aborted) console.warn('Preview failed:', e);
      }
      if (!controller.signal.aborted) setPreviewLoading(false);
    }, 400);

    return () => clearTimeout(timeout);
  }, [title, description, triggers.length, actions.length]);

  const canCreate = title.length > 0 && description.length > 0 && triggers.length > 0 && actions.length > 0;

  const handlePayAndCreate = () => {
    setStatus(null);
    setShowPayDialog(true);
  };

  const handlePaymentComplete = async (payment) => {
    setPaymentResult(payment);
    setShowPayDialog(false);
    setLoading(true);
    setStatus(null);
    const res = await base44.functions.invoke('chromeSkillCreatorHarness', {
      title,
      description,
      triggers,
      actions,
      payment_token: payment.token,
      payment_method: payment.method,
      payment_amount: payment.amount,
      payment_currency: payment.currency,
      payment_timestamp: payment.timestamp,
    });
    setHarnessResult(res.data);
    if (res.data?.success || res.data?.skill_id) {
      setStatus('success');
    } else {
      setStatus('error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Chrome Skill Creator</h1>
          <p className="text-sm text-slate-400">Define a new skill for the Chrome agent ecosystem</p>
        </div>

        {/* Skill Title */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Skill Title</label>
          <Input
            placeholder="Enter skill title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500 h-11 rounded-lg focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>

        {/* Skill Description */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Skill Description</label>
          <Textarea
            placeholder="Describe what this skill does…"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500 rounded-lg resize-none focus:border-purple-500/50 focus:ring-purple-500/20"
          />
        </div>

        {/* Triggers Section */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Triggers
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1.5 h-8" onClick={() => setTriggers([...triggers, { id: Date.now() }])}>
              <Plus className="w-3.5 h-3.5" />
              Add Trigger
            </Button>
          </div>
          {triggers.length === 0 ? (
            <div className="min-h-[48px] rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center">
              <span className="text-xs text-slate-600">No triggers defined yet</span>
            </div>
          ) : (
            <div className="space-y-2">
              {triggers.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2">
                  <span className="text-xs text-slate-400">Trigger {i + 1}</span>
                  <button onClick={() => setTriggers(triggers.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-teal-400" />
              Actions
            </h2>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white gap-1.5 h-8" onClick={() => setActions([...actions, { id: Date.now() }])}>
              <Plus className="w-3.5 h-3.5" />
              Add Action
            </Button>
          </div>
          {actions.length === 0 ? (
            <div className="min-h-[48px] rounded-lg border border-dashed border-slate-700/50 flex items-center justify-center">
              <span className="text-xs text-slate-600">No actions defined yet</span>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((a, i) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2">
                  <span className="text-xs text-slate-400">Action {i + 1}</span>
                  <button onClick={() => setActions(actions.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Honour + Safety Live Preview */}
        <HonourSafetyPreview
          preview={preview}
          previewLoading={previewLoading}
          harnessResult={harnessResult}
        />

        {/* Result Modals */}
        {status === 'success' && (
          <SuccessModal
            harnessResult={harnessResult}
            onClose={() => setStatus(null)}
          />
        )}
        {status === 'error' && (
          <ErrorModal
            harnessResult={harnessResult}
            onClose={() => setStatus(null)}
          />
        )}

        {/* Pay & Create — Simulated Google Pay Flow */}
        <Button
          disabled={!canCreate || loading}
          onClick={handlePayAndCreate}
          className="w-full h-12 rounded-xl text-sm font-semibold bg-white hover:bg-slate-100 text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Creating Skill…</>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">G</span>
              </div>
              Buy with <span className="font-bold">Google Pay</span>
            </>
          )}
        </Button>

        {/* Simulated Payment Dialog */}
        {showPayDialog && (
          <SimulatedPayDialog
            amount="0.50"
            currency="RLUSD"
            skillTitle={title || 'Untitled Skill'}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setShowPayDialog(false)}
          />
        )}

        {/* Shield Log Banner */}
        <div className="rounded-xl border border-slate-700/30 bg-slate-900/30 px-4 py-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-600 shrink-0" />
          <p className="text-xs text-slate-600">Skill creation events will be logged safely.</p>
        </div>
      </div>
    </div>
  );
}