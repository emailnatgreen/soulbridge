import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wallet, Globe, ExternalLink, RefreshCw, Loader2, CheckCircle, CircleDashed, Pencil, Users, Shield, QrCode, Key, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import TrustlineActivateButton from '@/components/wallet/TrustlineActivateButton';
import MultiSigPanel from './MultiSigPanel';
import WalletQRCodes from '@/components/vip/WalletQRCodes';
import DIDWalletEditPanel from './DIDWalletEditPanel';
import AssignSeedPanel from './AssignSeedPanel';
import XummDIDSignPanel from './XummDIDSignPanel';

function parseNotes(notes) {
  if (!notes) return {};
  try {
    const p = JSON.parse(notes);
    return p && typeof p === 'object' ? p : {};
  } catch { return {}; }
}

const roleColors = {
  citizen: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  guardian: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  creator: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  trader: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  teacher: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  healer: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  scout: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  elder: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  master: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

export default function DIDWalletCard({ wallet, agents, onRefresh, liveXrpBalance, liveRlusdBalance, hasRlusdTrustline }) {
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [liveBalance, setLiveBalance] = useState(liveXrpBalance ?? wallet.balance);
  const [rlusdBalance, setRlusdBalance] = useState(liveRlusdBalance ?? null);
  const [hasTrustline, setHasTrustline] = useState(hasRlusdTrustline ?? null);
  const [publishResult, setPublishResult] = useState(wallet.is_published && wallet.published_txid ? 'published' : null);
  const [editing, setEditing] = useState(false);
  const [assigningSeed, setAssigningSeed] = useState(false);
  const [xummSign, setXummSign] = useState(false);
  const [showMultiSig, setShowMultiSig] = useState(false);

  useEffect(() => {
    if (liveXrpBalance !== undefined) setLiveBalance(liveXrpBalance);
  }, [liveXrpBalance]);
  useEffect(() => {
    if (liveRlusdBalance !== undefined) setRlusdBalance(liveRlusdBalance);
  }, [liveRlusdBalance]);
  useEffect(() => {
    if (hasRlusdTrustline !== undefined) setHasTrustline(hasRlusdTrustline);
  }, [hasRlusdTrustline]);

  const parsed = parseNotes(wallet.notes);
  const walletColor = parsed.color || '#a855f7';
  const walletRole = parsed.role || null;
  const linkedAgentId = parsed.linkedAgent;
  const linkedNodeDid = parsed.linkedNodeDid;
  const linkedAgent = linkedAgentId ? (agents || []).find(a => a.id === linkedAgentId) : null;
  const hasSeed = !!wallet.encrypted_seed;
  const isFakeAddress = wallet.classic_address && (wallet.classic_address.startsWith('rAxi') || wallet.classic_address.startsWith('rZoe'));

  const handlePublishDID = async () => {
    setPublishing(true);
    try {
      const res = await base44.functions.invoke('publishDIDAuto', { wallet_id: wallet.id });
      const data = res?.data;
      if (data?.success) {
        setPublishResult('published');
        toast.success(`DID published! TX: ${data.txid?.slice(0, 12)}...`);
      } else {
        setPublishResult('error');
        toast.error(data?.message || data?.error || 'Publication failed');
      }
      onRefresh?.();
    } catch (e) {
      setPublishResult('error');
      toast.error(e?.response?.data?.error || e.message || 'Publication failed');
    }
    setPublishing(false);
  };

  const handleRefreshBalance = async () => {
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke('getBalanceEnhanced', { wallet_id: wallet.id });
      const data = res?.data;
      setLiveBalance(data?.xrp ?? liveBalance);
      setRlusdBalance(data?.rlusd ?? 0);
      setHasTrustline(data?.has_rlusd_trustline ?? hasTrustline);
    } catch (_) {}
    setRefreshing(false);
  };

  const isPublished = (wallet.is_published && wallet.published_txid) || publishResult === 'published';
  const explorerBase = 'https://xrpscan.com';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3" style={{ borderTopColor: walletColor, borderTopWidth: '3px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: walletColor + '33' }}>
            <Wallet className="w-5 h-5" style={{ color: walletColor }} />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{wallet.name || 'Unnamed Wallet'}</p>
            <p className="text-white/30 text-[10px]">{wallet.network === 'testnet' ? 'Testnet' : 'Mainnet'} · {wallet.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {walletRole && (
            <span className={`text-[9px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${roleColors[walletRole] || roleColors.citizen}`}>
              <Shield className="w-2.5 h-2.5" /> {walletRole.charAt(0).toUpperCase() + walletRole.slice(1)}
            </span>
          )}
          {isPublished ? (
            <span className="text-[9px] bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="w-2.5 h-2.5" /> DID Live
            </span>
          ) : (
            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CircleDashed className="w-2.5 h-2.5" /> Unpublished
            </span>
          )}
          <button onClick={() => setShowQR(!showQR)} className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${showQR ? 'text-cyan-400' : 'text-white/30 hover:text-white'}`}>
            <QrCode className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setEditing(!editing)} className="text-white/30 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Linked Agent & Node DID */}
      {(linkedAgent || linkedNodeDid) && (
        <div className="flex flex-wrap gap-2">
          {linkedAgent && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-1 rounded-lg">
              <Users className="w-3 h-3" /> {linkedAgent.name}
            </span>
          )}
          {linkedNodeDid && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2 py-1 rounded-lg">
              <Globe className="w-3 h-3" /> {linkedNodeDid.length > 30 ? linkedNodeDid.slice(0, 30) + '…' : linkedNodeDid}
            </span>
          )}
        </div>
      )}

      {/* QR Codes Panel */}
      {showQR && <WalletQRCodes wallet={wallet} />}

      {/* Edit Panel */}
      {editing && (
        <DIDWalletEditPanel
          wallet={wallet}
          agents={agents}
          onSave={() => { setEditing(false); onRefresh?.(); }}
          onClose={() => setEditing(false)}
        />
      )}

      {/* Assign Seed Panel */}
      {assigningSeed && (
        <AssignSeedPanel
          wallet={wallet}
          onComplete={() => { setAssigningSeed(false); onRefresh?.(); }}
          onClose={() => setAssigningSeed(false)}
        />
      )}

      {/* Missing Seed Warning */}
      {!hasSeed && !isFakeAddress && !assigningSeed && (
        <button onClick={() => setAssigningSeed(true)}
          className="flex items-center gap-2 w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl px-3 py-2.5 text-xs text-red-300 font-semibold transition">
          <AlertTriangle className="w-4 h-4" /> Missing Seed — Click to Assign
        </button>
      )}

      {/* Placeholder Address Warning */}
      {isFakeAddress && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300 text-xs">Placeholder address — not a real XRPL wallet</span>
        </div>
      )}

      {/* Address */}
      <div className="bg-black/30 border border-white/10 rounded-xl px-3 py-2.5">
        <p className="text-white/30 text-[9px] uppercase tracking-widest mb-0.5">XRPL Address</p>
        <p className="text-purple-300 font-mono text-xs break-all select-all cursor-pointer hover:text-purple-200">{wallet.classic_address}</p>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
          <p className="text-white/30 text-[9px] uppercase tracking-widest">XRP Balance</p>
          <p className="text-white font-bold text-base sm:text-lg">{typeof liveBalance === 'number' ? liveBalance.toFixed(4) : '—'} <span className="text-white/40 text-xs">XRP</span></p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
          <p className="text-white/30 text-[9px] uppercase tracking-widest">RLUSD Balance</p>
          {hasTrustline === false ? (
            <p className="text-amber-400/70 text-xs mt-1">No trustline</p>
          ) : (
            <p className="text-white font-bold text-base sm:text-lg">{rlusdBalance !== null ? rlusdBalance.toFixed(2) : '—'} <span className="text-white/40 text-xs">RLUSD</span></p>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={handleRefreshBalance} disabled={refreshing}
          className="text-white/40 hover:text-white hover:bg-white/10 h-7 gap-1.5 text-[10px]">
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Balances
        </Button>
      </div>

      {/* RLUSD Trustline */}
      <TrustlineActivateButton wallet={wallet} />

      {/* DID Status */}
      {/* Multi-Sig Panel */}
      {showMultiSig && isPublished && (
        <MultiSigPanel
          wallet={wallet}
          onClose={() => setShowMultiSig(false)}
          onRefresh={onRefresh}
        />
      )}

      {isPublished ? (
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-300 text-xs font-semibold">DID Published on XRPL {wallet.network === 'testnet' ? 'Testnet' : 'Mainnet'}</span>
          </div>
          {wallet.published_txid && (
            <p className="text-white/30 text-[10px] font-mono break-all">{wallet.published_txid}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            <a href={`${explorerBase}/account/${wallet.classic_address}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
              <ExternalLink className="w-3 h-3" /> Verify on XRPScan
            </a>
            {wallet.published_txid && (
              <a href={`${explorerBase}/tx/${wallet.published_txid}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
                <ExternalLink className="w-3 h-3" /> View TX on XRPScan
              </a>
            )}
          </div>
          {!showMultiSig && (
            <button onClick={() => setShowMultiSig(true)}
              className="flex items-center gap-1.5 mt-1.5 text-[10px] text-purple-400 hover:text-purple-300 transition">
              <Shield className="w-3 h-3" /> Manage Multi-Sig Security
            </button>
          )}
        </div>
      ) : xummSign ? (
        <XummDIDSignPanel
          wallet={wallet}
          onComplete={() => { setXummSign(false); onRefresh?.(); }}
          onClose={() => setXummSign(false)}
        />
      ) : (
        <div className="space-y-2">
          {hasSeed && (
            <Button onClick={handlePublishDID} disabled={publishing}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white gap-2 text-sm">
              {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing DID on-chain…</> : <><Globe className="w-4 h-4" /> Auto-Publish DID</>}
            </Button>
          )}
          <Button onClick={() => setXummSign(true)} variant="outline"
            className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-2 text-sm">
            <Globe className="w-4 h-4" /> Sign DIDSet via Xaman
          </Button>
        </div>
      )}
    </div>
  );
}