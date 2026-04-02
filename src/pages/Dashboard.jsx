import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Sparkles, LogOut, Home, ArrowRight, CheckCircle, Plus, Globe, Copy, Users, Zap, Wallet } from 'lucide-react';
import DIDManagementPanel from '@/components/dashboard/DIDManagementPanel';
import { base44 } from '@/api/base44Client';
import ConstitutionalBraidLive from '@/components/ConstitutionalBraidLive';

import UniversalDashboardHero from '@/components/dashboard/UniversalDashboardHero';
import UniversalDashboardQuickActions from '@/components/dashboard/UniversalDashboardQuickActions';
import UniversalDashboardStatus from '@/components/dashboard/UniversalDashboardStatus';
import IdentityRecognitionModal from '@/components/dashboard/IdentityRecognitionCard';
import { hasAdminAccess } from '@/lib/adminAccess';

// ── Signal emitter (global, shared) ──────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.__sb = window.__sb || { signals: [] };
  window.__sb.emit = (type, meta = {}) => {
    const s = { id: Date.now(), type, time: new Date().toLocaleTimeString('en-GB'), ...meta };
    window.__sb.signals.unshift(s);
    if (window.__sb.signals.length > 50) window.__sb.signals.pop();
    window.dispatchEvent(new CustomEvent('sb-signal', { detail: s }));
  };
}



export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [identity, setIdentity] = useState(() => {
    try {
      const stored = localStorage.getItem('soulbridge_identity');
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed?.connected ? parsed : null;
    } catch (_) {
      return null;
    }
  });
  const [wallets, setWallets] = useState([]);
  const [invite, setInvite] = useState(null);
  const [creatingWallet, setCreatingWallet] = useState(false);
  const [walletCreated, setWalletCreated] = useState(false);
  const [myInvites, setMyInvites] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteNickname, setInviteNickname] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [inviteWallet, setInviteWallet] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_invite_wallet') || 'null'); } catch(_) { return null; }
  });
  const [publishingDid, setPublishingDid] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishTxid, setPublishTxid] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_invite_wallet') || 'null')?.published_txid || null; } catch(_) { return null; }
  });
  const [identityModalOpen, setIdentityModalOpen] = useState(false);

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

    // Single consolidated load — one auth call, sequential to avoid rate limits
    const loadAll = async () => {
      const me = await base44.auth.me().catch(() => null);
      let localIdentity = null;
      try { localIdentity = JSON.parse(localStorage.getItem('soulbridge_identity') || 'null'); } catch (_) {}
      const localDid = localIdentity?.did;
      // Check admin from: platform user, auth context user, or DID address
      const isAdminUser = me?.role === 'admin' || user?.role === 'admin' || hasAdminAccess({ user: me || user, identityDid: localDid });

      // Resolve DID address from any available source
      const didAddress = localDid
        ? String(localDid).split(':').pop()
        : null;

      // Load wallets
      let myWallets = [];
      if (isAdminUser) {
        // Admin sees all wallets
        myWallets = await base44.entities.Wallet.list('-created_date', 50).catch(() => []);
      } else {
        // Non-admin: query by owner_id and/or DID address
        const [ownerWallets, didWallets] = await Promise.all([
          me?.id ? base44.entities.Wallet.filter({ owner_id: me.id }, '-created_date', 20).catch(() => []) : Promise.resolve([]),
          didAddress ? base44.entities.Wallet.filter({ classic_address: didAddress }, '-created_date', 5).catch(() => []) : Promise.resolve([]),
        ]);
        myWallets = [...(ownerWallets || []), ...(didWallets || [])].filter(
          (wallet, index, array) => array.findIndex(item => item.id === wallet.id) === index
        );
      }
      setWallets(myWallets || []);

      // Load transactions
      if (isAdminUser) {
        const allTx = await base44.entities.Transaction.list('-created_date', 10).catch(() => []);
        setMyTransactions(allTx || []);
      } else if (myWallets.length > 0) {
        const tx = await base44.entities.Transaction.filter(
          { from_wallet_id: myWallets[0].id }, '-created_date', 10
        ).catch(() => []);
        setMyTransactions(tx || []);
      }

      // Load invites — only for admin
      if (isAdminUser) {
        const invites = await base44.entities.InvitationToken.list('-created_date', 20).catch(() => []);
        setMyInvites(invites || []);
      }


    };
    loadAll();

    // Invited user — wallet is now created when the invite is claimed
    try {
      const stored = localStorage.getItem('sb_invite_session');
      const alreadyHasWallet = localStorage.getItem('sb_invite_wallet');
      if (stored) {
        const inv = JSON.parse(stored);
        setInvite(inv);
        if (alreadyHasWallet) {
          setInviteWallet(JSON.parse(alreadyHasWallet));
          setWalletCreated(true);
        }
      }
    } catch (_) {}


  }, []);

  const [publishingWalletId, setPublishingWalletId] = useState(null);

  const handlePublishDID = async (walletId) => {
    const targetId = walletId || inviteWallet?.id;
    if (!targetId) return;
    setPublishingDid(true);
    setPublishingWalletId(targetId);
    setPublishError('');
    try {
      const res = await base44.functions.invoke('publishDID', { wallet_id: targetId });
      const txid = res?.data?.txid || res?.data?.tx_hash || null;
      // If it's the invite wallet, update localStorage
      if (inviteWallet?.id === targetId) {
        const updated = { ...inviteWallet, is_published: true, published_txid: txid };
        localStorage.setItem('sb_invite_wallet', JSON.stringify(updated));
        localStorage.removeItem('sb_invite_session');
        setInviteWallet(updated);
        if (txid) setPublishTxid(txid);
      }
      // Refresh wallets list
      const me = await base44.auth.me().catch(() => null);
      let refreshedWallets = [];
      if (me?.id) {
        refreshedWallets = await base44.entities.Wallet.filter({ owner_id: me.id }, '-created_date', 20).catch(() => []);
      } else if (identity?.did) {
        const didAddress = String(identity.did).split(':').pop();
        refreshedWallets = await base44.entities.Wallet.filter({ classic_address: didAddress }, '-created_date', 20).catch(() => []);
      }
      setWallets(refreshedWallets || []);
      } catch (e) {
      setPublishError(e?.response?.data?.error || 'Failed to publish DID. Please try again.');
      }
      setPublishingDid(false);
      setPublishingWalletId(null);
      };

  const handleDisconnect = () => {
    localStorage.removeItem('soulbridge_identity');
    localStorage.removeItem('sb_invite_session');
    localStorage.removeItem('sb_invite_wallet');
    if (window.__sb) window.__sb.signals = [];
    navigate('/');
    window.location.reload();
  };

  const shortDid = identity?.did
    ? identity.did.slice(0, 18) + '…' + identity.did.slice(-10)
    : 'Not connected';

  // Resolve display name: platform user > localStorage profile > invite nickname
  const profileName = (() => {
    try { return JSON.parse(localStorage.getItem('sb_identity_profile') || 'null')?.name; } catch(_) { return null; }
  })();
  const displayName = user?.full_name || profileName || invite?.recipient_nickname || '';
  const firstName = displayName ? displayName.split(' ')[0] : '';

  // Invitee mode — admins always see the full dashboard, never the invite onboarding
  const rawInviteSession = !!(invite && inviteWallet && Number(inviteWallet.balance || 0) > 0);
  const isInviteePredid = !!(invite && inviteWallet && !inviteWallet.is_published);

  // Admin = Base44 admin role OR admin DID
  const identityDid = identity?.did || (inviteWallet?.classic_address ? `did:xrpl:1:${inviteWallet.classic_address}` : wallets?.[0]?.classic_address ? `did:xrpl:1:${wallets[0].classic_address}` : null);
  const isAdmin = hasAdminAccess({ user, identityDid });

  // Admins always see the full dashboard, never the invite onboarding view
  const hasInviteSession = rawInviteSession && !isAdmin;

  // Clear broken or completed invite sessions so admin/member dashboard can open normally
  useEffect(() => {
    if (!inviteWallet?.id) return;
    base44.entities.Wallet.filter({ classic_address: inviteWallet.classic_address }, '-created_date', 1)
      .then(res => {
        const walletRecord = res?.[0];
        if (!walletRecord || Number(walletRecord.balance || 0) <= 0) {
          localStorage.removeItem('sb_invite_session');
          localStorage.removeItem('sb_invite_wallet');
          setInvite(null);
          setInviteWallet(null);
          setWalletCreated(false);
          return;
        }

        if (walletRecord.id === inviteWallet?.id) {
          const updatedWallet = {
            ...inviteWallet,
            ...walletRecord,
          };
          localStorage.setItem('sb_invite_wallet', JSON.stringify(updatedWallet));
          setInviteWallet(updatedWallet);
          if (walletRecord.published_txid) setPublishTxid(walletRecord.published_txid);
        }
      }).catch(() => {});
  }, [inviteWallet?.classic_address]);

  function generateHash() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function generateTokenId() { return 'SB-' + Math.random().toString(36).substring(2, 6).toUpperCase(); }
  function getAppUrl() { return localStorage.getItem('sb_custom_domain') || window.location.origin; }

  const handleCreateInvite = async () => {
    if (!inviteNickname.trim()) return;
    setCreatingInvite(true);
    const me = await base44.auth.me().catch(() => null);
    await base44.entities.InvitationToken.create({
      token_id: generateTokenId(),
      hash: generateHash(),
      status: 'active',
      recipient_nickname: inviteNickname,
      kinetic_weight: 10,
      usage_type: 'single',
      max_claims: 1,
      claimed_count: 0,
      notes: inviteNotes || undefined,
      issued_by: me?.email,
    });
    const updated = await base44.entities.InvitationToken.filter({ issued_by: me?.email }, '-created_date', 50).catch(() => []);
    setMyInvites(updated);
    setInviteNickname('');
    setInviteNotes('');
    setShowInviteForm(false);
    setCreatingInvite(false);
  };

  const copyInviteLink = (tokenId) => {
    navigator.clipboard.writeText(`${getAppUrl()}/?invite=${tokenId}`);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center text-white">
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
          <button
            onClick={() => navigate('/')}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Return to landing page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* ── HEADER ── */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-4 sm:px-6 py-3 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img src="https://base44.app/api/apps/699319649276f1077c1f2c81/files/public/699319649276f1077c1f2c81/20b492e9e_1185.png"
              alt="SoulBridge" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-sm sm:text-base leading-tight">SoulBridge</h1>
              {(inviteWallet?.classic_address || identity?.did || wallets?.[0]?.classic_address) ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[9px] sm:text-[10px] text-green-200 max-w-full mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="truncate">DID: {identity?.did || (inviteWallet?.classic_address ? `did:xrpl:1:${inviteWallet.classic_address}` : wallets?.[0]?.classic_address ? `did:xrpl:1:${wallets[0].classic_address}` : '')}</span>
                </span>
              ) : (
                <p className="text-white/30 text-[10px] sm:text-xs">Production · XRPL Live</p>
              )}
            </div>
          </div>

          {/* Live Braid — compact indicator */}
          <div className="flex-1 flex justify-center">
            <ConstitutionalBraidLive compact />
          </div>

          <div className="flex items-center gap-2">
            {!hasInviteSession && (
              <Link to="/Home" className="text-xs text-white/50 hover:text-white border border-white/15 rounded-lg px-3 py-1.5 transition">
                <Home className="w-3.5 h-3.5 inline mr-1" />Home
              </Link>
            )}
            <button onClick={handleDisconnect}
              className="text-xs text-red-400 border border-red-500/30 hover:border-red-400/60 rounded-lg px-3 py-1.5 transition">
              <LogOut className="w-3.5 h-3.5 inline mr-1" />Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <button
          onClick={() => setIdentityModalOpen(true)}
          className="w-full rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-4 hover:border-purple-400/50 hover:bg-gradient-to-r hover:from-purple-900/30 hover:to-pink-900/30 transition text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Recognition details</p>
              <h3 className="text-white font-semibold text-sm">View identity, DIDs & agents</h3>
            </div>
            <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
          </div>
        </button>
        <IdentityRecognitionModal user={user} isOpen={identityModalOpen} onClose={() => setIdentityModalOpen(false)} />

        <UniversalDashboardStatus
          hasInviteSession={hasInviteSession}
          inviteWallet={inviteWallet}
          onPublish={handlePublishDID}
          publishingDid={publishingDid}
          publishingWalletId={publishingWalletId}
          isAdmin={isAdmin}
          identityDid={identityDid}
          wallets={wallets}
          myTransactions={myTransactions}
        />

        {/* ════════════════════════════════════════
            INVITED USER — clean onboarding view
            ════════════════════════════════════════ */}
        {hasInviteSession ? (
          <div className="max-w-lg mx-auto space-y-6 pt-4">

            {/* Private Dashboard Header */}
            <div className="bg-white/5 border border-purple-500/20 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Your Private Dashboard</p>
                  <p className="text-white/30 text-xs">Only you can see this</p>
                </div>
              </div>
              {inviteWallet?.classic_address && (
                <div className="text-right">
                  <p className="text-white/20 text-[10px] uppercase tracking-widest">Your DID Address</p>
                  <p className="text-purple-300 font-mono text-xs">{inviteWallet.classic_address.slice(0,16)}…</p>
                </div>
              )}
            </div>

            {/* Welcome card */}
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/40">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome{invite?.recipient_nickname ? `, ${invite.recipient_nickname}` : ''}! 🎉</h2>
              <p className="text-white/50 text-sm">Activate your on-chain identity to enter the public SoulBridge Village.</p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {/* Step 1 — Wallet */}
              <div className={`rounded-2xl border p-5 flex items-center gap-4 ${
                creatingWallet ? 'border-amber-500/30 bg-amber-500/5' :
                inviteWallet ? 'border-green-500/30 bg-green-500/5' :
                'border-white/10 bg-white/5'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
                  creatingWallet ? 'bg-amber-500/20' : inviteWallet ? 'bg-green-500/20' : 'bg-white/10'
                }`}>
                  {creatingWallet ? <div className="w-5 h-5 border-2 border-amber-400/40 border-t-amber-300 rounded-full animate-spin" /> : inviteWallet ? '✅' : '⏳'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Step 1 — Wallet Created</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {creatingWallet ? 'Creating your XRPL wallet…' : inviteWallet ? `${inviteWallet.classic_address?.slice(0,16)}… · Live wallet ready` : 'Pending…'}
                  </p>
                </div>
              </div>

              {/* Step 2 — Publish DID */}
              <div className={`rounded-2xl border p-5 ${
                inviteWallet?.is_published ? 'border-green-500/30 bg-green-500/5' :
                inviteWallet ? 'border-purple-500/40 bg-purple-500/8' :
                'border-white/10 bg-white/5 opacity-50'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${
                    inviteWallet?.is_published ? 'bg-green-500/20' : 'bg-purple-500/20'
                  }`}>
                    {inviteWallet?.is_published ? '✅' : <Globe className="w-5 h-5 text-purple-300" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">Step 2 — Publish Your DID</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {inviteWallet?.is_published ? 'Your identity is live on XRPL mainnet!' : 'Anchor your identity on the XRPL ledger — one click'}
                    </p>
                  </div>
                  {inviteWallet?.is_published && <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-1 rounded-full">Active</span>}
                </div>
                {inviteWallet?.is_published && publishTxid && (
                  <div className="mt-3 bg-black/30 border border-green-500/20 rounded-xl px-4 py-3 space-y-1">
                    <p className="text-green-400 text-xs font-semibold">✅ Published on XRPL Live</p>
                    <p className="text-white/30 text-[10px] font-mono break-all">{publishTxid}</p>
                    <a
                      href={`https://${inviteWallet?.network === 'testnet' ? 'testnet' : 'livenet'}.xrpl.org/transactions/${publishTxid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 underline"
                    >
                      View on XRPL {inviteWallet?.network === 'testnet' ? 'Testnet' : 'Live'} Explorer →
                    </a>
                  </div>
                )}
                {!inviteWallet?.is_published && inviteWallet && (
                  <button
                    onClick={() => handlePublishDID(inviteWallet.id)}
                    disabled={publishingDid}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm rounded-xl py-4 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-60"
                  >
                    {publishingDid
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing to XRPL…</>
                      : <><Globe className="w-5 h-5" /> Publish My DID Now <ArrowRight className="w-4 h-4" /></>}
                  </button>
                )}
              </div>

              {/* Step 3 — Enter the Village */}
              <div className={`rounded-2xl border p-5 ${
                inviteWallet?.is_published ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/10 bg-white/5 opacity-40'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0 text-lg">🏡</div>
                  <div>
                    <p className="text-white font-semibold text-sm">Step 3 — Enter the Village</p>
                    <p className="text-white/40 text-xs mt-0.5">Explore governance, agents, and the Kinetic Grid</p>
                  </div>
                </div>
                {inviteWallet?.is_published && (
                  <div className="space-y-3">
                    <div className="bg-black/30 border border-yellow-500/20 rounded-xl px-4 py-3 space-y-1">
                      <p className="text-yellow-300 text-xs font-semibold">Your DID is now visible to you here</p>
                      <p className="text-white/30 text-[10px] font-mono break-all">{inviteWallet.classic_address}</p>
                      {publishTxid && <p className="text-white/50 text-[10px] font-mono break-all">Testnet TX: {publishTxid}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-sm rounded-xl py-3 transition-all"
                    >
                      SoulBridge Village access unlocked <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-white/20 text-[10px] text-center">Your invited account remains visible in this private dashboard after publishing.</p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-white/20 text-xs text-center">Your invite was issued by SoulBridge · XRPL Live · Secure &amp; Encrypted</p>
          </div>

        ) : (
          /* ════════════════════════════════════════
             FULL ADMIN / MEMBER DASHBOARD
             ════════════════════════════════════════ */
          <>



            {/* Admin-only: Constitutional Braid — compact on dashboard */}
            {isAdmin && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <ConstitutionalBraidLive compact />
              </div>
            )}

            {/* DID Management Panel — all users */}
            <DIDManagementPanel />

            {/* My Transaction History */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-400" /> My Transaction History
                </h3>
                <Link to="/TransactionHistory" className="text-xs text-purple-300 hover:text-purple-200 transition">View all</Link>
              </div>
              {myTransactions.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <Wallet className="w-10 h-10 mx-auto text-white/20" />
                  <p className="text-white/40 text-sm">No transactions found for your wallets yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myTransactions.map((tx) => {
                    const wallet = wallets.find(w => w.id === tx.from_wallet_id);
                    return (
                      <div key={tx.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-4 h-4 text-purple-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-medium truncate">{tx.recipient_name || tx.recipient_address}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                              tx.status === 'completed'
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : tx.status === 'failed'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs text-white/30 mt-0.5 flex-wrap">
                            <span>{tx.amount} XRP</span>
                            {wallet?.name && <span>From {wallet.name}</span>}
                            {tx.created_date && <span>{new Date(tx.created_date).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                          </div>
                          {tx.note && <p className="text-xs text-white/40 mt-1 truncate">{tx.note}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* My Village Invitations */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" /> My Village Invitations
                </h3>
                {myInvites.length > 0 && !showInviteForm && (
                  <button onClick={() => setShowInviteForm(true)} className="flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition">
                    <Plus className="w-3 h-3" /> New Invite
                  </button>
                )}
              </div>
              {showInviteForm && (
                <div className="bg-white/5 border border-purple-500/30 rounded-xl p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Who are you inviting? *</label>
                      <input
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-400/60 transition"
                        placeholder="e.g. My colleague Sarah"
                        value={inviteNickname}
                        onChange={e => setInviteNickname(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Note (optional)</label>
                      <input
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-400/60 transition"
                        placeholder="e.g. Blockchain researcher"
                        value={inviteNotes}
                        onChange={e => setInviteNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateInvite} disabled={creatingInvite || !inviteNickname.trim()} className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition disabled:opacity-50">
                      {creatingInvite ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {creatingInvite ? 'Creating…' : 'Issue Invite'}
                    </button>
                    <button onClick={() => setShowInviteForm(false)} className="text-xs text-white/40 hover:text-white/70 transition px-3">Cancel</button>
                  </div>
                </div>
              )}
              {myInvites.length === 0 && !showInviteForm ? (
                <div className="text-center py-8 space-y-4">
                  <Users className="w-10 h-10 mx-auto text-white/20" />
                  <p className="text-white/40 text-sm">No invites yet. Invite someone to join SoulBridge.</p>
                  <button onClick={() => setShowInviteForm(true)} className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-medium px-5 py-2.5 rounded-lg transition mx-auto">
                    <Plus className="w-3 h-3" /> Create My First Invite
                  </button>
                </div>
              ) : myInvites.length > 0 ? (
                <div className="space-y-2">
                  {myInvites.map(t => (
                    <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-mono">{t.token_id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ t.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : t.status === 'claimed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30' }`}>
                            {t.status === 'claimed' ? '✓ Joined' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-white/30 mt-0.5">
                          <span>👤 {t.recipient_nickname || '—'}</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" />{t.kinetic_weight ?? 10} KU</span>
                        </div>
                      </div>
                      {t.status === 'active' && (
                        <button onClick={() => copyInviteLink(t.token_id)} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/15 text-white/60 hover:text-white border border-white/15 px-3 py-1.5 rounded-lg transition">
                          {copiedId === t.token_id ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          {copiedId === t.token_id ? 'Copied!' : 'Copy Link'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>



            {/* Meet Axi */}
            <div className="bg-gradient-to-br from-indigo-950/60 via-purple-950/60 to-pink-950/40 border border-purple-500/30 rounded-2xl p-4 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-2 border-slate-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-semibold text-lg leading-tight">Meet Axi</h3>
                  <p className="text-purple-300/70 text-xs">{hasInviteSession ? 'Your onboarding guide · Here to help you publish and enter' : 'Your personal SoulBridge guide · Always online'}</p>
                </div>
                <span className="self-start sm:self-auto text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 rounded-full px-2.5 py-1">● Online</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-2xl">
                  <p className="text-white/80 text-sm leading-relaxed">
                    {hasInviteSession
                      ? `Hi${invite?.recipient_nickname ? ` ${invite.recipient_nickname}` : ''}! 👋 I'm Axi — I can help you finish your DID setup, understand what happens next, and guide you into SoulBridge step by step.`
                      : `Hi${firstName ? ` ${firstName}` : ''}! 👋 I'm Axi — your personal AI guide to the SoulBridge Village. I can help you navigate governance, manage your identity, track your agents, and understand everything happening on-chain. Ready to begin?`}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white/30 text-xs uppercase tracking-widest">Start a conversation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(hasInviteSession
                    ? [
                        { label: 'Help me publish my DID', msg: `Hi Axi! I joined through an invite and I want help publishing my DID${inviteWallet?.classic_address ? ` for wallet ${inviteWallet.classic_address}` : ''}. Walk me through it simply.` },
                        { label: 'What happens after setup?', msg: 'Once my DID is published, what can I do next in SoulBridge? Give me a simple next-step guide.' },
                        { label: 'Explain my invite access', msg: 'Please explain what my invite gives me access to and what this private onboarding area is for.' },
                      ]
                    : [
                        { label: 'Give me a personal welcome 🌟', msg: `Hi Axi! I'm ${displayName || 'a new member'}. Can you give me a personal welcome to SoulBridge and tell me what I should do first?` },
                        { label: 'What can I do here? 🦭', msg: 'What are all the things I can do in SoulBridge? Give me a quick tour of the platform.' },
                        { label: 'How does governance work? 📜', msg: 'Can you explain how governance works in SoulBridge and how I can participate?' },
                      ]).map(({ label, msg }) => (
                    <button
                      key={label}
                      onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }))}
                      className="text-left bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400/40 rounded-xl px-3 py-2.5 text-xs text-white/60 hover:text-white transition-all min-h-[56px]"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: hasInviteSession ? `Hi Axi! I joined through an invite${invite?.recipient_nickname ? ` as ${invite.recipient_nickname}` : ''}. Please help me complete my DID onboarding and show me what to do next.` : `Hi Axi! I'm ${displayName || 'here'} — I've just connected my identity to SoulBridge. Can you give me a personal welcome and walk me through what I can do today?` } }))}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl py-3 transition-all shadow-lg shadow-purple-500/20"
              >
                <Sparkles className="w-4 h-4" /> {hasInviteSession ? 'Open onboarding chat with Axi' : 'Open chat with Axi'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}