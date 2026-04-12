import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Sparkles, LogOut, Home, ArrowRight, Globe, Wallet,
  ArrowDownUp, Users, Vote, BookOpen, ShoppingBag, Zap, ChevronRight
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { hasAdminAccess } from '@/lib/adminAccess';

// Admin-only components — lazy loaded to keep new user experience clean
import DIDManagementPanel from '@/components/dashboard/DIDManagementPanel';
import CoreDIDStatusModule from '@/components/dashboard/CoreDIDStatusModule';
import MemorySynthesisTrigger from '@/components/dashboard/MemorySynthesisTrigger';
import ConstitutionalBraidLive from '@/components/ConstitutionalBraidLive';
import DexSwapPanel from '@/components/dex/DexSwapPanel';
import SendPanel from '@/components/wallet/SendPanel';
import ReceivePanel from '@/components/wallet/ReceivePanel';
import UniversalDashboardStatus from '@/components/dashboard/UniversalDashboardStatus';
import IdentityRecognitionModal from '@/components/dashboard/IdentityRecognitionCard';

if (typeof window !== 'undefined') {
  window.__sb = window.__sb || { signals: [] };
  window.__sb.emit = (type, meta = {}) => {
    const s = { id: Date.now(), type, time: new Date().toLocaleTimeString('en-GB'), ...meta };
    window.__sb.signals.unshift(s);
    if (window.__sb.signals.length > 50) window.__sb.signals.pop();
    window.dispatchEvent(new CustomEvent('sb-signal', { detail: s }));
  };
}

// ── Village navigation links for published members ──────────────────────────
const VILLAGE_LINKS = [
  { label: 'Agents', desc: 'Meet the Village', path: '/agents', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  { label: 'Governance', desc: 'Vote & propose', path: '/governance', icon: Vote, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  { label: 'Skills', desc: 'Grow & develop', path: '/skills', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  { label: 'Marketplace', desc: 'Trade services', path: '/marketplace', icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  { label: 'Wallets', desc: 'XRP & RLUSD', path: '/wallets', icon: Wallet, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/30' },
  { label: 'Kinetic Grid', desc: 'Energy & motion', path: '/KineticCompass', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();

  const [identity] = useState(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed?.connected ? parsed : null;
    } catch (_) { return null; }
  });

  const [invite] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_invite_session') || 'null'); } catch (_) { return null; }
  });

  const [inviteWallet, setInviteWallet] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_invite_wallet') || 'null'); } catch (_) { return null; }
  });

  const [wallets, setWallets] = useState([]);
  const [treasuryAddresses, setTreasuryAddresses] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [publishingDid, setPublishingDid] = useState(false);
  const [publishingWalletId, setPublishingWalletId] = useState(null);
  const [publishError, setPublishError] = useState('');
  const [publishTxid, setPublishTxid] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_invite_wallet') || 'null')?.published_txid || null; } catch (_) { return null; }
  });
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [walletCreated] = useState(() => !!localStorage.getItem('sb_invite_wallet'));

  // ── Data loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      const me = await base44.auth.me().catch(() => null);
      let localIdentity = null;
      try { localIdentity = JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch (_) {}
      const localDid = localIdentity?.did;
      const isAdminUser = me?.role === 'admin' || user?.role === 'admin' || hasAdminAccess({ user: me || user, identityDid: localDid });
      const didAddress = localDid ? String(localDid).split(':').pop() : null;

      const treasuries = await base44.entities.Treasury.list('-created_date', 20).catch(() => []);
      setTreasuryAddresses((treasuries || []).map(t => t.classic_address).filter(a => a && a !== 'N/A - Legacy Record'));

      let myWallets = [];
      if (isAdminUser) {
        myWallets = await base44.entities.Wallet.list('-created_date', 50).catch(() => []);
      } else {
        const [ownerWallets, didWallets] = await Promise.all([
          me?.id ? base44.entities.Wallet.filter({ owner_id: me.id }, '-created_date', 20).catch(() => []) : Promise.resolve([]),
          didAddress ? base44.entities.Wallet.filter({ classic_address: didAddress }, '-created_date', 5).catch(() => []) : Promise.resolve([]),
        ]);
        myWallets = [...(ownerWallets || []), ...(didWallets || [])].filter(
          (w, i, arr) => arr.findIndex(x => x.id === w.id) === i
        );
      }
      setWallets(myWallets);

      if (isAdminUser) {
        setMyTransactions(await base44.entities.Transaction.list('-created_date', 10).catch(() => []));
      } else if (myWallets.length > 0) {
        setMyTransactions(await base44.entities.Transaction.filter({ from_wallet_id: myWallets[0].id }, '-created_date', 10).catch(() => []));
      }
    };
    loadAll();

    // Sync invite wallet from DB
    if (inviteWallet?.classic_address) {
      base44.entities.Wallet.filter({ classic_address: inviteWallet.classic_address }, '-created_date', 1)
        .then(res => {
          const record = res?.[0];
          if (!record || Number(record.balance || 0) <= 0) {
            localStorage.removeItem('sb_invite_session');
            localStorage.removeItem('sb_invite_wallet');
            setInviteWallet(null);
            return;
          }
          const updated = { ...inviteWallet, ...record };
          localStorage.setItem('sb_invite_wallet', JSON.stringify(updated));
          setInviteWallet(updated);
          if (record.published_txid) setPublishTxid(record.published_txid);
        }).catch(() => {});
    }
  }, []);

  // ── Publish DID handler ─────────────────────────────────────────────────────
  const handlePublishDID = async (walletId) => {
    const targetId = walletId || inviteWallet?.id || wallets[0]?.id;
    if (!targetId) return;
    setPublishingDid(true);
    setPublishingWalletId(targetId);
    setPublishError('');
    try {
      const res = await base44.functions.invoke('publishDID', { wallet_id: targetId });
      const txid = res?.data?.txid || res?.data?.tx_hash || null;
      if (inviteWallet?.id === targetId) {
        const updated = { ...inviteWallet, is_published: true, published_txid: txid };
        localStorage.setItem('sb_invite_wallet', JSON.stringify(updated));
        localStorage.removeItem('sb_invite_session');
        setInviteWallet(updated);
        if (txid) setPublishTxid(txid);
      }
      // Refresh wallets
      const me = await base44.auth.me().catch(() => null);
      let refreshed = [];
      if (me?.id) {
        refreshed = await base44.entities.Wallet.filter({ owner_id: me.id }, '-created_date', 20).catch(() => []);
      } else if (identity?.did) {
        const addr = String(identity.did).split(':').pop();
        refreshed = await base44.entities.Wallet.filter({ classic_address: addr }, '-created_date', 20).catch(() => []);
      }
      setWallets(refreshed);
    } catch (e) {
      setPublishError(e?.response?.data?.error || 'Failed to publish DID. Please try again.');
    } finally {
      setPublishingDid(false);
      setPublishingWalletId(null);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('soulbridge_identity');
    localStorage.removeItem('sb_invite_session');
    localStorage.removeItem('sb_invite_wallet');
    if (window.__sb) window.__sb.signals = [];
    navigate('/');
    window.location.reload();
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const profileName = (() => { try { return JSON.parse(localStorage.getItem('sb_identity_profile') || 'null')?.name; } catch (_) { return null; } })();
  const displayName = user?.full_name || profileName || invite?.recipient_nickname || '';
  const firstName = displayName ? displayName.split(' ')[0] : '';

  const identityDid = identity?.did
    || (inviteWallet?.classic_address ? `did:xrpl:1:${inviteWallet.classic_address}` : null)
    || (wallets?.[0]?.classic_address ? `did:xrpl:1:${wallets[0].classic_address}` : null);

  const isAdmin = hasAdminAccess({ user, identityDid });

  // Invite session = has invite wallet with balance, not admin
  const hasInviteSession = !!(invite && inviteWallet && Number(inviteWallet.balance || 0) > 0) && !isAdmin;

  // New user = has wallet(s) but none are published, not an invite session, not admin
  const hasPublishedWallet = wallets.some(w => w.is_published);
  const hasUnpublishedWallet = wallets.length > 0 && !hasPublishedWallet;
  const isNewUserNeedsPublish = hasUnpublishedWallet && !hasInviteSession && !isAdmin;

  const userWallets = wallets.filter(w => !treasuryAddresses.includes(w.classic_address));

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !identity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center px-6 text-white">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center space-y-4">
          <Shield className="w-10 h-10 text-purple-300 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold">DID required</h2>
            <p className="text-sm text-white/50 mt-2">Connect your DID on the landing page first, then enter the Village from there.</p>
          </div>
          <button onClick={() => navigate('/')} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-semibold text-white">
            Return to landing page
          </button>
        </div>
      </div>
    );
  }

  // ── Shared Header ───────────────────────────────────────────────────────────
  const Header = () => (
    <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 sm:px-6 py-3 sticky top-0 z-20">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
            alt="SoulBridge" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm leading-tight">SoulBridge Village</h1>
            {identityDid ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[9px] text-green-200 max-w-[200px] sm:max-w-none mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
                <span className="truncate font-mono">{identityDid.slice(0, 22)}…</span>
              </span>
            ) : (
              <p className="text-white/30 text-[10px]">XRPL Live · Production</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasInviteSession && (
            <Link to="/Home" className="text-xs text-white/50 hover:text-white border border-white/15 rounded-lg px-2.5 py-1.5 transition hidden sm:flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> Home
            </Link>
          )}
          <button onClick={handleDisconnect}
            className="text-xs text-red-400 border border-red-500/30 hover:border-red-400/60 rounded-lg px-2.5 py-1.5 transition flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 1: INVITE ONBOARDING (3-step flow)
  // ══════════════════════════════════════════════════════════════════════════
  if (hasInviteSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/40">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Welcome{invite?.recipient_nickname ? `, ${invite.recipient_nickname}` : ''}! 🎉</h2>
            <p className="text-white/50 text-sm">Activate your on-chain identity to enter SoulBridge.</p>
          </div>

          {/* Step 1 */}
          <div className={`rounded-2xl border p-4 flex items-center gap-4 ${inviteWallet ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/5'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${inviteWallet ? 'bg-green-500/20' : 'bg-white/10'}`}>
              {inviteWallet ? '✅' : '⏳'}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Step 1 — Wallet Created</p>
              <p className="text-white/40 text-xs mt-0.5">{inviteWallet ? `${inviteWallet.classic_address?.slice(0, 16)}… · Live wallet ready` : 'Pending…'}</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`rounded-2xl border p-4 ${inviteWallet?.is_published ? 'border-green-500/30 bg-green-500/5' : inviteWallet ? 'border-purple-500/40 bg-purple-500/10' : 'border-white/10 bg-white/5 opacity-50'}`}>
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${inviteWallet?.is_published ? 'bg-green-500/20' : 'bg-purple-500/20'}`}>
                {inviteWallet?.is_published ? '✅' : <Globe className="w-5 h-5 text-purple-300" />}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Step 2 — Publish Your DID</p>
                <p className="text-white/40 text-xs mt-0.5">{inviteWallet?.is_published ? 'Your identity is live on XRPL!' : 'Anchor your identity on-chain — one click'}</p>
              </div>
            </div>
            {publishError && <p className="text-red-400 text-xs mb-2">{publishError}</p>}
            {!inviteWallet?.is_published && inviteWallet && (
              <button onClick={() => handlePublishDID(inviteWallet.id)} disabled={publishingDid}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm rounded-xl py-4 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60">
                {publishingDid ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing…</> : <><Globe className="w-5 h-5" /> Publish My DID Now <ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
            {inviteWallet?.is_published && publishTxid && (
              <div className="bg-black/30 border border-green-500/20 rounded-xl px-4 py-3 space-y-1">
                <p className="text-green-400 text-xs font-semibold">✅ Published on XRPL</p>
                <p className="text-white/30 text-[10px] font-mono break-all">{publishTxid}</p>
                <a href={`https://livenet.xrpl.org/transactions/${publishTxid}`} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 underline">View on XRPL Explorer →</a>
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div className={`rounded-2xl border p-4 ${inviteWallet?.is_published ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/10 bg-white/5 opacity-40'}`}>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0 text-lg">🏡</div>
              <div>
                <p className="text-white font-semibold text-sm">Step 3 — Enter the Village</p>
                <p className="text-white/40 text-xs mt-0.5">Explore governance, agents, and the Kinetic Grid</p>
              </div>
            </div>
            {inviteWallet?.is_published && (
              <button onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-sm rounded-xl py-3 transition-all">
                Enter SoulBridge Village <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-white/20 text-xs text-center">Issued by SoulBridge · XRPL Live · Secure &amp; Encrypted</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 2: NEW USER — has wallet but DID not yet published
  // ══════════════════════════════════════════════════════════════════════════
  if (isNewUserNeedsPublish) {
    const unpublishedWallet = wallets.find(w => !w.is_published) || wallets[0];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

          {/* Welcome */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/40">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Welcome to SoulBridge{firstName ? `, ${firstName}` : ''}! 🌟</h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
              Your XRPL wallet is ready. The next step is to <strong className="text-purple-300">publish your DID</strong> — this anchors your identity on-chain and unlocks the full Village.
            </p>
          </div>

          {/* DID Address */}
          {unpublishedWallet?.classic_address && (
            <div className="bg-white/5 border border-white/15 rounded-2xl p-4 space-y-2">
              <p className="text-white/40 text-[10px] uppercase tracking-widest">Your XRPL Wallet Address</p>
              <p className="text-purple-200 font-mono text-xs break-all">{unpublishedWallet.classic_address}</p>
              <p className="text-white/30 text-[10px]">Balance: {unpublishedWallet.balance || 0} XRP · Network: {unpublishedWallet.network || 'mainnet'}</p>
            </div>
          )}

          {/* Publish CTA */}
          <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-semibold text-sm">Publish Your DID to XRPL</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">
                  Publishing writes your Decentralised Identity to the XRP Ledger. It's permanent, sovereign, and only you control it. This is the foundation of everything in SoulBridge.
                </p>
              </div>
            </div>
            {publishError && <p className="text-red-400 text-xs">{publishError}</p>}
            <button
              onClick={() => handlePublishDID(unpublishedWallet?.id)}
              disabled={publishingDid || !unpublishedWallet}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm rounded-xl py-4 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
            >
              {publishingDid
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing your DID…</>
                : <><Globe className="w-5 h-5" /> Publish My DID Now <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>

          {/* What happens next */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <p className="text-white/40 text-xs uppercase tracking-widest">After publishing you can</p>
            {[
              { icon: '🤝', text: 'Meet and interact with Village Agents' },
              { icon: '🗳️', text: 'Vote on governance proposals' },
              { icon: '💎', text: 'Earn XRP and RLUSD for contributions' },
              { icon: '📜', text: 'Build your on-chain reputation & skills' },
              { icon: '⚡', text: 'Participate in the Kinetic Grid' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-white/60 text-sm">
                <span className="text-base">{icon}</span>
                {text}
              </div>
            ))}
          </div>

          {/* Talk to Axi */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">Questions? Talk to Axi</p>
              <p className="text-white/40 text-xs">Your AI guide — here to help with every step</p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: `Hi Axi! I'm a new member and I'm about to publish my DID. Can you explain what this means and what I can do in SoulBridge once it's published?` } }))}
              className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              Ask Axi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 3: ADMIN DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

          <button onClick={() => setIdentityModalOpen(true)}
            className="w-full rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-4 hover:border-purple-400/50 transition text-left">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Recognition details</p>
                <h3 className="text-white font-semibold text-sm">View identity, DIDs &amp; agents</h3>
              </div>
              <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
            </div>
          </button>
          <IdentityRecognitionModal user={user} isOpen={identityModalOpen} onClose={() => setIdentityModalOpen(false)} />

          <UniversalDashboardStatus
            hasInviteSession={false}
            inviteWallet={inviteWallet}
            onPublish={handlePublishDID}
            publishingDid={publishingDid}
            publishingWalletId={publishingWalletId}
            isAdmin={isAdmin}
            identityDid={identityDid}
            wallets={wallets}
            myTransactions={myTransactions}
          />

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <ConstitutionalBraidLive compact />
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-semibold text-sm">Your DID Identity</h3>
              {identityDid && <span className="ml-auto flex items-center gap-1 text-green-300 text-[10px] bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Active</span>}
            </div>
            {identityDid && <p className="text-purple-200/50 text-[10px] font-mono truncate mb-3 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">{identityDid}</p>}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sovereign ID', path: '/SovereignID', icon: Shield, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
                { label: 'DID Health', path: '/DIDHealthDashboard', icon: ArrowDownUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
                { label: 'DID Credentials', path: '/DidCredentials', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
              ].map(item => (
                <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1.5 border rounded-xl p-3 transition-all ${item.bg} hover:opacity-80`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-white text-[10px] font-medium text-center">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <CoreDIDStatusModule wallets={wallets} identityDid={identityDid} />
          <DIDManagementPanel />

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SendPanel wallets={userWallets} />
              <ReceivePanel wallets={userWallets} />
            </div>
            <DexSwapPanel wallets={userWallets} />
          </div>

          <MemorySynthesisTrigger />

          <TransactionHistory transactions={myTransactions} wallets={wallets} />
          <AxiChatSection displayName={displayName} firstName={firstName} hasInviteSession={false} invite={null} inviteWallet={null} />
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW 4: PUBLISHED MEMBER DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Welcome banner */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {firstName ? `Welcome back, ${firstName}` : 'Welcome to the Village'} 🌟
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-300 text-xs">DID Active · Published on XRPL</span>
              </div>
            </div>
          </div>
          {identityDid && (
            <p className="text-purple-200/40 font-mono text-[10px] truncate bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              {identityDid}
            </p>
          )}
        </div>

        {/* Village Navigation */}
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2.5">Explore the Village</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {VILLAGE_LINKS.map(({ label, desc, path, icon: Icon, color, bg }) => (
              <Link key={path} to={path}
                className={`flex items-center gap-3 border rounded-xl p-3 sm:p-3.5 transition-all hover:scale-[1.02] active:scale-[0.98] ${bg} hover:opacity-90`}>
                <Icon className={`w-5 h-5 flex-shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold">{label}</p>
                  <p className="text-white/40 text-[10px] truncate">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Wallet quick access */}
        {userWallets.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-purple-400" /> My Wallet</h3>
              <Link to="/wallets" className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1">Manage <ChevronRight className="w-3 h-3" /></Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SendPanel wallets={userWallets} compact />
              <ReceivePanel wallets={userWallets} compact />
            </div>
          </div>
        )}

        {/* Axi chat section */}
        <AxiChatSection displayName={displayName} firstName={firstName} hasInviteSession={false} invite={null} inviteWallet={null} />

        {/* Recent transactions */}
        <TransactionHistory transactions={myTransactions} wallets={wallets} />

        {/* Quick links to manage identity */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Your Identity</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sovereign ID', path: '/SovereignID', icon: Shield, color: 'text-purple-400' },
              { label: 'DID Health', path: '/DIDHealthDashboard', icon: ArrowDownUp, color: 'text-green-400' },
              { label: 'Credentials', path: '/DidCredentials', icon: Sparkles, color: 'text-amber-400' },
            ].map(item => (
              <Link key={item.path} to={item.path}
                className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-3 transition-all text-center">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-white/70 text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

function AxiChatSection({ displayName, firstName }) {
  return (
    <div className="bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/40 border border-purple-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-slate-950" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-base">Chat with Axi</h3>
          <p className="text-purple-300/60 text-xs">Your AI guide · Always online</p>
        </div>
        <span className="ml-auto text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 rounded-full px-2.5 py-1">● Online</span>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-white/80 text-sm leading-relaxed">
            Hi{firstName ? ` ${firstName}` : ''}! 👋 I'm Axi — your personal guide to SoulBridge. I can help you navigate governance, manage your identity, track your agents, and understand everything happening on-chain. What would you like to explore?
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { label: 'Give me a personal welcome 🌟', msg: `Hi Axi! I'm ${displayName || 'a new member'}. Can you give me a personal welcome and tell me what I should do first?` },
          { label: 'What can I do here? 🗺️', msg: 'What are all the things I can do in SoulBridge? Give me a quick tour.' },
          { label: 'How does governance work? 📜', msg: 'Can you explain how governance works in SoulBridge and how I can participate?' },
        ].map(({ label, msg }) => (
          <button key={label}
            onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }))}
            className="text-left bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400/40 rounded-xl px-3 py-2.5 text-xs text-white/60 hover:text-white transition-all min-h-[52px]">
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: `Hi Axi! I'm ${displayName || 'here'} — can you give me a personal welcome and walk me through what I can do today?` } }))}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl py-3 transition-all">
        <Sparkles className="w-4 h-4" /> Open chat with Axi
      </button>
    </div>
  );
}

function TransactionHistory({ transactions, wallets }) {
  if (transactions.length === 0) return null;
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-purple-400" /> Recent Transactions</h3>
        <Link to="/TransactionHistory" className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>
      </div>
      <div className="space-y-2">
        {transactions.slice(0, 5).map((tx) => {
          const wallet = wallets.find(w => w.id === tx.from_wallet_id);
          return (
            <div key={tx.id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-3.5 h-3.5 text-purple-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium truncate">{tx.recipient_name || tx.recipient_address}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold flex-shrink-0 ${tx.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : tx.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                    {tx.status}
                  </span>
                </div>
                <p className="text-white/30 text-[10px] mt-0.5">{tx.amount} XRP {wallet?.name ? `· From ${wallet.name}` : ''}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}