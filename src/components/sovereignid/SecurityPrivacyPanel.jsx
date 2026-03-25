import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Key, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const SECURITY_MEASURES = [
  { label: 'AES-256-GCM Encryption', desc: 'All wallet seeds encrypted at rest with PBKDF2 key derivation', status: 'active' },
  { label: 'Server-Side Ownership Checks', desc: 'Every wallet operation verifies owner_id matches authenticated user', status: 'active' },
  { label: 'Access Logging', desc: 'All wallet access and decryption attempts are logged to WalletAccessLog', status: 'active' },
  { label: 'No Plaintext Seeds in Transit', desc: 'Seed decryption only via authenticated backend with ownership verification', status: 'active' },
  { label: 'DID Ownership Gating', desc: 'publishDID function verifies wallet ownership before any on-chain action', status: 'active' },
  { label: 'Filtered Wallet Lists', desc: 'All wallet queries scoped to owner_id — no cross-user data leakage', status: 'active' },
];

const PRIVACY_SETTINGS = [
  { id: 'public_did', label: 'Public DID Profile', desc: 'Allow others to view your DID public profile page', default: true },
  { id: 'show_balance', label: 'Show Balance Publicly', desc: 'Display XRP balance on your public DID profile', default: false },
  { id: 'show_txs', label: 'Show Transaction History', desc: 'Allow others to see your transaction history via XRPL explorer', default: false },
];

export default function SecurityPrivacyPanel({ user, wallets }) {
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(PRIVACY_SETTINGS.map(s => [s.id, s.default]))
  );

  function toggle(id) {
    setPrefs(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-8">
      {/* Security Status */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-400" /> Security Hardening Status
        </h2>
        <div className="space-y-3">
          {SECURITY_MEASURES.map((m, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white text-sm">{m.label}</div>
                <div className="text-slate-400 text-xs mt-0.5">{m.desc}</div>
              </div>
              <Badge className="ml-auto flex-shrink-0 bg-green-900/50 text-green-400 border-green-700/50 text-xs">Active</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Controls */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5 text-purple-400" /> Privacy Controls
        </h2>
        <div className="space-y-3">
          {PRIVACY_SETTINGS.map(setting => (
            <div key={setting.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium text-white text-sm">{setting.label}</div>
                <div className="text-slate-400 text-xs mt-0.5">{setting.desc}</div>
              </div>
              <button
                onClick={() => toggle(setting.id)}
                className={`relative w-11 h-6 rounded-full transition-colors ${prefs[setting.id] ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${prefs[setting.id] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Seed Security Notice */}
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-300 mb-1">Seed Phrase Responsibility</h3>
            <p className="text-amber-200/70 text-sm">
              SoulBridge encrypts your wallet seed using AES-256-GCM and never transmits it in plaintext outside of your authenticated session.
              However, <strong>you are solely responsible</strong> for storing your seed phrase offline in a secure location.
              SoulBridge cannot recover a lost seed phrase under any circumstances.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button className="bg-purple-600 hover:bg-purple-700 text-sm">Save Privacy Settings</Button>
        <span className="text-slate-500 text-xs">Settings are stored locally for this session</span>
      </div>
    </div>
  );
}