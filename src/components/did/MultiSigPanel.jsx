import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Plus, Trash2, ExternalLink, Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function MultiSigPanel({ wallet, onClose, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [signerData, setSignerData] = useState(null);
  const [mode, setMode] = useState('view'); // view | configure
  const [signers, setSigners] = useState([{ account: '', weight: 1, name: '' }]);
  const [quorum, setQuorum] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [xummUrl, setXummUrl] = useState(null);

  // Check current signer list on mount
  useEffect(() => {
    checkSignerList();
  }, [wallet.id]);

  const checkSignerList = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('setDidSignerList', {
        wallet_id: wallet.id,
        action: 'check'
      });
      setSignerData(res.data);
    } catch (e) {
      console.warn('Failed to check signer list:', e.message);
      setSignerData({ has_signer_list: false });
    }
    setLoading(false);
  };

  const addSigner = () => {
    if (signers.length >= 8) {
      toast.error('Maximum 8 signers allowed');
      return;
    }
    setSigners([...signers, { account: '', weight: 1, name: '' }]);
  };

  const removeSigner = (index) => {
    if (signers.length <= 1) return;
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index, field, value) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: field === 'weight' ? parseInt(value) || 1 : value };
    setSigners(updated);
  };

  const totalWeight = signers.reduce((sum, s) => sum + (s.weight || 0), 0);

  const handleSubmit = async () => {
    const validSigners = signers.filter(s => s.account.trim().startsWith('r'));
    if (validSigners.length === 0) {
      toast.error('Add at least one valid signer address');
      return;
    }
    if (quorum < 1 || quorum > totalWeight) {
      toast.error(`Quorum must be between 1 and ${totalWeight}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('setDidSignerList', {
        wallet_id: wallet.id,
        signers: validSigners.map(s => ({ account: s.account.trim(), weight: s.weight })),
        quorum
      });
      if (res.data?.xumm_url) {
        setXummUrl(res.data.xumm_url);
        window.open(res.data.xumm_url, '_blank');
        toast.success('Sign the transaction in Xaman to activate multi-sig');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to create multi-sig payload');
    }
    setSubmitting(false);
  };

  const handleRemoveMultiSig = async () => {
    if (!confirm('Remove multi-sig protection from this DID? This requires signing in Xaman.')) return;
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('setDidSignerList', {
        wallet_id: wallet.id,
        action: 'remove'
      });
      if (res.data?.xumm_url) {
        window.open(res.data.xumm_url, '_blank');
        toast.success('Sign in Xaman to remove multi-sig');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 text-purple-300 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking multi-sig status…
        </div>
      </div>
    );
  }

  // After Xumm URL generated — show confirmation
  if (xummUrl) {
    return (
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-semibold">Sign in Xaman</span>
          </div>
          <button onClick={() => { setXummUrl(null); checkSignerList(); onRefresh?.(); }} className="text-white/30 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-white/50 text-xs">A signing request has been sent to Xaman. Open your Xaman app to approve the multi-sig transaction.</p>
        <div className="flex gap-2">
          <a href={xummUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
            <ExternalLink className="w-3 h-3" /> Open in Xaman
          </a>
          <Button size="sm" variant="ghost" className="text-white/40 text-xs h-7"
            onClick={() => { setXummUrl(null); checkSignerList(); onRefresh?.(); }}>
            Done — Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 text-sm font-semibold">Multi-Sig Security</span>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
      </div>

      {/* Current Status */}
      {signerData?.has_signer_list ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-300 text-xs font-semibold">Multi-Sig Active</span>
            <span className="text-white/30 text-[10px]">Quorum {signerData.quorum} of {signerData.total_weight}</span>
          </div>
          <div className="space-y-1">
            {signerData.signers.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-1.5">
                <span className="text-white/60 font-mono text-[10px]">{s.account.slice(0, 10)}…{s.account.slice(-6)}</span>
                <span className="text-purple-300 text-[10px]">Weight {s.weight}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="ghost" className="text-purple-400 text-xs h-7" onClick={() => setMode('configure')}>
              Modify Signers
            </Button>
            <Button size="sm" variant="ghost" className="text-red-400 text-xs h-7" onClick={handleRemoveMultiSig} disabled={submitting}>
              Remove Multi-Sig
            </Button>
          </div>
        </div>
      ) : mode === 'view' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300 text-xs">No multi-sig configured</span>
          </div>
          <p className="text-white/40 text-[10px]">Add multi-signature protection to require multiple approvals before any transaction from this DID.</p>
          <Button size="sm" onClick={() => setMode('configure')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs h-8 gap-1.5">
            <Shield className="w-3 h-3" /> Configure Multi-Sig
          </Button>
        </div>
      ) : null}

      {/* Configure Mode */}
      {mode === 'configure' && (
        <div className="space-y-3 pt-1 border-t border-white/10">
          <p className="text-white/50 text-[10px]">Add XRPL addresses as signers. Each signer gets a weight. The quorum is the minimum total weight needed to authorise a transaction.</p>

          {/* Signer Inputs */}
          {signers.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="r... signer address"
                value={s.account}
                onChange={(e) => updateSigner(i, 'account', e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-purple-400 placeholder:text-white/20"
              />
              <input
                type="number"
                min={1}
                max={10}
                value={s.weight}
                onChange={(e) => updateSigner(i, 'weight', e.target.value)}
                className="w-16 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none focus:border-purple-400"
              />
              {signers.length > 1 && (
                <button onClick={() => removeSigner(i)} className="text-red-400/60 hover:text-red-400 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          <button onClick={addSigner} className="flex items-center gap-1.5 text-purple-400 text-[10px] hover:text-purple-300">
            <Plus className="w-3 h-3" /> Add Signer
          </button>

          {/* Quorum */}
          <div className="flex items-center gap-3">
            <label className="text-white/50 text-xs">Quorum</label>
            <input
              type="number"
              min={1}
              max={totalWeight || 1}
              value={quorum}
              onChange={(e) => setQuorum(parseInt(e.target.value) || 1)}
              className="w-20 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none focus:border-purple-400"
            />
            <span className="text-white/30 text-[10px]">of {totalWeight} total weight</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSubmit} disabled={submitting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs h-8 gap-1.5">
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
              Sign via Xaman
            </Button>
            <Button size="sm" variant="ghost" className="text-white/40 text-xs h-8"
              onClick={() => setMode('view')}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}