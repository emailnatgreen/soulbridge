import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Users, Palette, Shield, Globe, X } from 'lucide-react';
import { toast } from 'sonner';

const roles = ['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'];
const colors = ['#a855f7', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function parseNotes(notes) {
  if (!notes) return {};
  try {
    const p = JSON.parse(notes);
    return p && typeof p === 'object' ? p : {};
  } catch { return {}; }
}

export default function VipWalletEditPanel({ wallet, agents, onSave, onClose }) {
  const parsed = parseNotes(wallet.notes);
  const [walletName, setWalletName] = useState(wallet.name || '');
  const [role, setRole] = useState(parsed.role || 'citizen');
  const [color, setColor] = useState(parsed.color || '#a855f7');
  const [linkedAgent, setLinkedAgent] = useState(parsed.linkedAgent || '');
  const [linkedNodeDid, setLinkedNodeDid] = useState(parsed.linkedNodeDid || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const notesData = { ...parsed, role, color, linkedAgent: linkedAgent || null, linkedNodeDid: linkedNodeDid || null, vip: true };
    await base44.entities.Wallet.update(wallet.id, {
      name: walletName,
      notes: JSON.stringify(notesData)
    });

    // Sync agent link
    if (linkedAgent) {
      await base44.entities.Agent.update(linkedAgent, {
        wallet_id: wallet.id,
        classic_address: wallet.classic_address
      });
    }

    toast.success('Wallet updated');
    setSaving(false);
    onSave?.();
  };

  const linkedAgentObj = (agents || []).find(a => a.id === linkedAgent);

  return (
    <div className="bg-white/5 border border-purple-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold text-xs flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-purple-400" /> Edit Wallet
        </h4>
        <button onClick={onClose} className="text-white/30 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Name */}
        <div>
          <label className="text-white/40 text-[10px] mb-1 block">Name of Wallet</label>
          <input
            type="text"
            value={walletName}
            onChange={e => setWalletName(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400/60"
          />
        </div>

        {/* Role */}
        <div>
          <label className="text-white/40 text-[10px] mb-1 block flex items-center gap-1">
            <Shield className="w-3 h-3" /> Role
          </label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400/60 appearance-none"
          >
            {roles.map(r => (
              <option key={r} value={r} className="bg-slate-900">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Link Agent */}
        <div>
          <label className="text-white/40 text-[10px] mb-1 block flex items-center gap-1">
            <Users className="w-3 h-3" /> Link Agent
          </label>
          <select
            value={linkedAgent}
            onChange={e => setLinkedAgent(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400/60 appearance-none"
          >
            <option value="" className="bg-slate-900">— None —</option>
            {(agents || []).map(a => (
              <option key={a.id} value={a.id} className="bg-slate-900">{a.name}</option>
            ))}
          </select>
        </div>

        {/* Node DID Link */}
        <div>
          <label className="text-white/40 text-[10px] mb-1 block flex items-center gap-1">
            <Globe className="w-3 h-3" /> Node DID Link
          </label>
          <input
            type="text"
            value={linkedNodeDid}
            onChange={e => setLinkedNodeDid(e.target.value)}
            placeholder="e.g. did:xrpl:1:rABC..."
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-purple-400/60"
          />
        </div>

        {/* Color */}
        <div className="sm:col-span-2">
          <label className="text-white/40 text-[10px] mb-1 block">Color</label>
          <div className="flex items-center gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Changes
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-white/40 hover:text-white text-xs">
          Cancel
        </Button>
      </div>
    </div>
  );
}