import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Key, Loader2, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AssignSeedPanel({ wallet, onComplete, onClose }) {
  const [seed, setSeed] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!seed.trim()) {
      toast.error('Please enter the wallet seed');
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions.invoke('assignWalletSeed', {
        wallet_id: wallet.id,
        seed: seed.trim(),
      });
      if (res?.data?.success) {
        toast.success(res.data.message || 'Seed assigned successfully');
        onComplete?.();
      } else {
        toast.error(res?.data?.error || 'Failed to assign seed');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || 'Failed to assign seed');
    }
    setSaving(false);
  };

  return (
    <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold text-xs flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-red-400" /> Assign Missing Seed
        </h4>
        <button onClick={onClose} className="text-white/30 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
        <p className="text-red-300/70 text-[10px] flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          The seed must match the wallet address <span className="font-mono text-red-300">{wallet.classic_address?.slice(0, 12)}...</span>
        </p>
      </div>

      <div>
        <label className="text-white/40 text-[10px] mb-1 block">Secret Seed (Family Seed)</label>
        <input
          type="password"
          value={seed}
          onChange={e => setSeed(e.target.value)}
          placeholder="sEd... or s..."
          className="w-full bg-white/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-red-400/60"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleAssign} disabled={saving || !seed.trim()}
          className="bg-red-600 hover:bg-red-500 text-white gap-1.5 text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
          Assign & Encrypt Seed
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-white/40 hover:text-white text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}