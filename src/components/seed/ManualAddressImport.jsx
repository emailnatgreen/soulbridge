import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenLine, Loader2, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ManualAddressImport({ onComplete, onClose }) {
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const isValidAddress = address.startsWith('r') && address.length >= 25 && address.length <= 35;

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Enter a wallet name'); return; }
    if (!isValidAddress) { toast.error('Enter a valid XRPL address (starts with r)'); return; }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.Wallet.create({
        name: name.trim(),
        classic_address: address.trim(),
        network: 'mainnet',
        owner_id: user.id,
        balance: 0,
      });
      toast.success(`Wallet "${name}" added manually`);
      onComplete?.();
    } catch (e) {
      toast.error('Failed to save wallet');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white/5 border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <PenLine className="w-4 h-4 text-purple-400" /> Add Wallet Manually
        </h3>
        <button onClick={onClose} className="text-white/30 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-white/50 text-xs">
        Enter an existing XRPL mainnet address to add it to your SoulBridge account. 
        You'll be able to track its balance and publish its DID.
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Wallet Name</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. My External Wallet"
            className="bg-white/5 border-white/10 text-white"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">XRPL Address</Label>
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXX"
            className="bg-white/5 border-white/10 text-white font-mono"
          />
          {address && !isValidAddress && (
            <p className="text-red-400 text-[10px] flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Must be a valid XRPL address starting with 'r'
            </p>
          )}
        </div>
      </div>

      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg px-3 py-2 text-xs text-purple-300 flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>Manual wallets are <strong>watch-only</strong> — SoulBridge can track the balance but cannot sign transactions for external addresses. For full control, use <strong>Create New</strong> or <strong>Xaman</strong>.</span>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || !name.trim() || !isValidAddress}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white gap-2"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
        ) : (
          <><CheckCircle className="w-4 h-4" /> Add Wallet</>
        )}
      </Button>
    </div>
  );
}