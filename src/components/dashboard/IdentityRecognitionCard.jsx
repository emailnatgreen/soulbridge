import React, { useEffect, useState } from 'react';
import { User, Mail, CheckCircle } from 'lucide-react';

export default function IdentityRecognitionCard({ user }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('sb_identity_profile') || 'null');
      setName(stored?.name || user?.full_name || '');
      setEmail(stored?.email || user?.email || '');
    } catch (_) {
      setName(user?.full_name || '');
      setEmail(user?.email || '');
    }
  }, [user?.full_name, user?.email]);

  const handleSave = () => {
    localStorage.setItem('sb_identity_profile', JSON.stringify({ name, email }));
    setSaved(true);
    window.dispatchEvent(new CustomEvent('sb-signal', {
      detail: {
        id: Date.now(),
        type: 'identity_profile_saved',
        time: new Date().toLocaleTimeString('en-GB'),
        page_name: 'dashboard'
      }
    }));
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Recognition details</p>
          <h3 className="text-white font-semibold text-sm">Enter name and email</h3>
        </div>
        {saved && (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-[10px] text-green-300">
            <CheckCircle className="w-3 h-3" /> Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Full name</label>
          <div className="relative">
            <User className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-400/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Email address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-400/50"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
        <p className="text-xs text-white/35">This helps SoulBridge recognise you alongside your DID.</p>
        <button
          onClick={handleSave}
          className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white hover:from-purple-500 hover:to-pink-500 transition"
        >
          Save details
        </button>
      </div>
    </div>
  );
}