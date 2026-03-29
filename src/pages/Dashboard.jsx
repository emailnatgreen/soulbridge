import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Radio, Sparkles, LogOut, Home, ArrowRight, Key, CheckCircle, AlertTriangle, Plus, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ConstitutionalBraidLive from '@/components/ConstitutionalBraidLive';
import OctagonMillUI from '@/components/OctagonMillUI';

// ── Signal emitter (global, shared) ──────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.__sb = window.__sb || { signals: [] };
  window.__sb.emit = (type, meta = {}) => {
    const s = { id: Date.now(), type, time: new Date().toLocaleTimeString('en-GB'), ...meta };
    window.__sb.signals.unshift(s);
    if (window.__sb.signals.length > 50) window.__sb.signals.pop();
    window.dispatchEvent(new CustomEvent('sb-signal', { detail: s }));
    // Persist to DB silently
    base44.entities.Signal.create({ signal_type: type, page_name: 'dashboard', ...meta }).catch(() => {});
  };
}

function SignalDot({ type }) {
  const colors = {
    identity_connected: 'bg-green-400',
    page_view: 'bg-blue-400',
    axi_activated: 'bg-purple-400',
    session_started: 'bg-amber-400',
  };
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[type] || 'bg-white/40'}`} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [identity, setIdentity] = useState(null);
  const [signals, setSignals] = useState([]);
  const [wallets, setWallets] = useState([]);

  // Admin gate
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <Shield className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-white text-xl font-semibold">Admin Access Only</h2>
          <Link to="/" className="inline-flex items-center gap-2 bg-purple-600 text-white rounded-lg px-4 py-2 text-sm hover:opacity-90 transition">
            <Home className="w-4 h-4" /> Go to Home
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Load identity from localStorage
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.connected) {
          setIdentity(parsed);
          window.__sb?.emit('identity_connected', { did: parsed.did });
        }
      }
    } catch (_) {}

    // Emit page view signal
    window.__sb?.emit('page_view', { page: 'dashboard' });

    // Load recent signals
    const loadSignals = async () => {
      try {
        const db = await base44.entities.Signal.list('-created_date', 30);
        const mem = window.__sb?.signals || [];
        const merged = [...mem, ...db].reduce((acc, s) => {
          const key = s.id || s.created_date;
          if (!acc.seen.has(key)) { acc.seen.add(key); acc.list.push(s); }
          return acc;
        }, { seen: new Set(), list: [] }).list.slice(0, 25);
        setSignals(merged);
      } catch (_) {
        setSignals(window.__sb?.signals || []);
      }
    };
    loadSignals();

    // Load wallets
    base44.auth.me().then(me => {
      if (me) base44.entities.Wallet.filter({ owner_id: me.id }, '-created_date', 20).then(setWallets).catch(() => {});
    }).catch(() => {});

    // Listen for new in-memory signals
    const onSignal = () => setSignals([...(window.__sb?.signals || [])]);
    window.addEventListener('sb-signal', onSignal);
    return () => window.removeEventListener('sb-signal', onSignal);
  }, []);

  const handleDisconnect = () => {
    localStorage.removeItem('soulbridge_identity');
    if (window.__sb) window.__sb.signals = [];
    navigate('/');
  };

  const shortDid = identity?.did
    ? identity.did.slice(0, 18) + '…' + identity.did.slice(-10)
    : 'Not connected';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* ── HEADER ── */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge" className="w-8 h-8 rounded-lg object-contain" />
            <div className="hidden sm:block">
              <h1 className="text-white font-semibold text-base leading-tight">SoulBridge Command</h1>
              <p className="text-white/30 text-xs">Production · XRPL Live</p>
            </div>
          </div>

          {/* Live Braid — compact indicator */}
          <div className="flex-1 flex justify-center">
            <ConstitutionalBraidLive compact />
          </div>

          <div className="flex items-center gap-2">
            <Link to="/Home" className="text-xs text-white/50 hover:text-white border border-white/15 rounded-lg px-3 py-1.5 transition">
              <Home className="w-3.5 h-3.5 inline mr-1" />Home
            </Link>
            <button onClick={handleDisconnect}
              className="text-xs text-red-400 border border-red-500/30 hover:border-red-400/60 rounded-lg px-3 py-1.5 transition">
              <LogOut className="w-3.5 h-3.5 inline mr-1" />Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Identity Banner */}
        <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${identity ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${identity ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
            {identity ? <CheckCircle className="w-6 h-6 text-green-400" /> : <AlertTriangle className="w-6 h-6 text-amber-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold uppercase tracking-wider ${identity ? 'text-green-400' : 'text-amber-400'}`}>
                {identity ? 'Identity Active' : 'No Identity Connected'}
              </span>
              {identity && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            </div>
            <p className="font-mono text-sm text-white/60 truncate">{identity ? shortDid : 'Connect your DID from the Landing page'}</p>
          </div>
          <Link to="/SovereignID" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-medium px-4 py-2 rounded-lg transition flex-shrink-0">
            <Key className="w-3.5 h-3.5" /> Sovereign ID <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Main 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Column 1: Constitutional Braid (full) ── */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
            <ConstitutionalBraidLive compact={false} />
          </div>

          {/* ── Column 2: Live Signal Log ── */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-semibold text-sm">Live Signal Log</h3>
              <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-72">
              {signals.length === 0 ? (
                <p className="text-white/20 text-xs py-4 text-center">No signals yet…</p>
              ) : signals.map((sig, i) => (
                <div key={sig.id || i}
                className="flex items-center gap-2 py-1.5 border-b border-white/5 text-xs animate-[fadeIn_0.3s_ease-out]">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white/20" />
                <span className="text-white/60 flex-1 truncate">{sig.type || sig.signal_type}</span>
                {sig.page_name && <span className="text-white/30 truncate hidden sm:block">{sig.page_name}</span>}
                <span className="text-white/25 flex-shrink-0">
                  {sig.time || (sig.created_date ? new Date(sig.created_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')}
                </span>
              </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Wallets row ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" /> Registered Wallets
            </h3>
            <div className="flex items-center gap-2">
              <Link to="/newcomer" className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition">
                <Plus className="w-3 h-3" /> Create Wallet
              </Link>
              <Link to="/SovereignID" className="text-xs text-purple-400 hover:text-purple-300 transition">Manage →</Link>
            </div>
          </div>
          {wallets.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-4">No wallets found. <Link to="/SovereignID" className="text-purple-400 underline">Create one</Link>.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {wallets.map(w => (
                <div key={w.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate">{w.name || 'Wallet'}</div>
                    <div className="text-white/30 text-xs font-mono truncate">{w.classic_address?.slice(0, 12)}…</div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <div className="text-white text-sm font-semibold">{w.balance ?? 0} XRP</div>
                    {w.is_published ? (
                      <div className="text-xs text-green-400">DID Active</div>
                    ) : (
                      <Link to="/SovereignID" className="flex items-center gap-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md transition">
                        <Globe className="w-3 h-3" /> Publish DID
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Octagon Mill ── */}
        <OctagonMillUI />

        {/* ── Meet Axi ── */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/40 border border-purple-500/30 rounded-2xl p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-2 border-slate-950" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg leading-tight">Meet Axi</h3>
              <p className="text-purple-300/70 text-xs">Your personal SoulBridge guide · Always online</p>
            </div>
            <span className="ml-auto text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 rounded-full px-2.5 py-1">● Online</span>
          </div>

          {/* Axi intro message bubble */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
              <p className="text-white/80 text-sm leading-relaxed">
                Hi{user?.full_name ? ` ${user.full_name.split(' ')[0]}` : ''}! 👋 I'm Axi — your personal AI guide to the SoulBridge Village. I can help you navigate governance, manage your identity, track your agents, and understand everything happening on-chain. Ready to begin?
              </p>
            </div>
          </div>

          {/* Suggested openers */}
          <div className="space-y-2">
            <p className="text-white/30 text-xs uppercase tracking-widest">Start a conversation</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: 'Give me a personal welcome 🌟', msg: `Hi Axi! I'm ${user?.full_name || 'a new member'}. Can you give me a personal welcome to SoulBridge and tell me what I should do first?` },
                { label: 'What can I do here? 🦭', msg: 'What are all the things I can do in SoulBridge? Give me a quick tour of the platform.' },
                { label: 'How does governance work? 📜', msg: 'Can you explain how governance works in SoulBridge and how I can participate?' },
              ].map(({ label, msg }) => (
                <button
                  key={label}
                  onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }))}
                  className="text-left bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400/40 rounded-xl px-3 py-2.5 text-xs text-white/60 hover:text-white transition-all"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Main CTA */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: `Hi Axi! I'm ${user?.full_name || 'here'} — I've just connected my identity to SoulBridge. Can you give me a personal welcome and walk me through what I can do today?` } }))}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl py-3 transition-all shadow-lg shadow-purple-500/20"
          >
            <Sparkles className="w-4 h-4" /> Open chat with Axi
          </button>
          <p className="text-white/20 text-xs text-center">After this first chat, reach Axi anytime via the ✨ floating button on every page</p>
        </div>
      </div>
    </div>
  );
}