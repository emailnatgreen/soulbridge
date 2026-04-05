import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

export default function VipWalletAssigner({ inviteTokens, wallets, onComplete }) {
  const [name, setName] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter a name for this VIP wallet'); return; }
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const res = await base44.functions.invoke('axiCreateAndFundWallet', {
        name: `VIP: ${name.trim()}`,
        network,
        notes: `VIP invite wallet for ${name.trim()}`,
      });
      const data = res?.data;
      if (data?.error) {
        setError(data.error);
      } else {
        setSuccess(`Wallet created: ${data?.classic_address || 'Success'}`);
        setName('');
        onComplete?.();
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to create wallet');
    }
    setCreating(false);
  };

  return (
    <div className="bg-gradient-to-br from-amber-900/20 to-purple-900/20 border border-amber-500/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-amber-400" />
        <h3 className="text-white font-semibold text-sm">Create & Assign VIP Wallet</h3>
      </div>
      <p className="text-white/50 text-xs">Create a funded mainnet wallet for a VIP invite. The wallet will be created with a real XRPL address and balance.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="text-white/40 text-xs mb-1 block">Recipient Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ripple Judge, VIP Guest"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-400/60"
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-1 block">Network</label>
          <select
            value={network}
            onChange={e => setNetwork(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/60"
          >
            <option value="mainnet">Mainnet (Live)</option>
            <option value="testnet">Testnet</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
      {success && <p className="text-green-400 text-xs">{success}</p>}

      <Button onClick={handleCreate} disabled={creating}
        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white gap-2">
        {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Plus className="w-4 h-4" /> Create VIP Wallet</>}
      </Button>
    </div>
  );
}