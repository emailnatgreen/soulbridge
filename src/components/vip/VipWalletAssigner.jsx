import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Users, Globe } from 'lucide-react';

export default function VipWalletAssigner({ wallets, agents, onComplete }) {
  const [name, setName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedRole, setSelectedRole] = useState('citizen');
  const [color, setColor] = useState('#a855f7');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const roles = ['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'];
  const colors = ['#a855f7', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter a name for this wallet'); return; }
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const res = await base44.functions.invoke('axiCreateAndFundWallet', {
        walletName: `VIP: ${name.trim()}`,
      });
      const data = res?.data;
      if (data?.error) {
        setError(data.error);
      } else {
        const walletId = data?.wallet?.id;
        // Update wallet with role, color, notes
        if (walletId) {
          await base44.entities.Wallet.update(walletId, {
            notes: JSON.stringify({ role: selectedRole, color, linkedAgent: selectedAgent || null, vip: true })
          });
        }
        // Link agent if selected
        if (selectedAgent && walletId && data?.wallet?.classic_address) {
          await base44.entities.Agent.update(selectedAgent, {
            wallet_id: walletId,
            classic_address: data.wallet.classic_address
          });
        }
        setSuccess(`Wallet created: ${data?.wallet?.classic_address || 'Success'}`);
        setName('');
        setSelectedAgent('');
        setSelectedRole('citizen');
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
        <h3 className="text-white font-semibold text-sm">Create VIP Wallet</h3>
      </div>
      <p className="text-white/50 text-xs">Create a mainnet wallet. Starts at 0 XRP — fund manually via Xumm or direct transfer.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Wallet Name */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">Name of Wallet</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ripple Judge, VIP Guest"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-400/60"
          />
        </div>

        {/* Role */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">Role</label>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/60 appearance-none"
          >
            {roles.map(r => (
              <option key={r} value={r} className="bg-slate-900 text-white">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Link Agent */}
        <div>
          <label className="text-white/40 text-xs mb-1 block flex items-center gap-1">
            <Users className="w-3 h-3" /> Link to Agent
          </label>
          <select
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/60 appearance-none"
          >
            <option value="" className="bg-slate-900 text-white">— No Agent —</option>
            {(agents || []).map(a => (
              <option key={a.id} value={a.id} className="bg-slate-900 text-white">{a.name}</option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div>
          <label className="text-white/40 text-xs mb-1 block">Wallet Color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
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