import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Shield, Globe, Plus, CheckCircle, AlertTriangle,
  Loader2, ExternalLink, ArrowRight, QrCode, RefreshCw, Copy, Wallet
} from 'lucide-react';
import DIDWalletEditor from '@/components/dashboard/DIDWalletEditor';

// Modes: idle | creating | publish_select | publish_qr | done
export default function DIDManagementPanel() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('idle');

  // Create wallet
  const [walletName, setWalletName] = useState('');
  const [creating, setCreating] = useState(false);

  // Publish DID
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishData, setPublishData] = useState(null); // { qr_png, qr_link, uuid }
  const [publishResult, setPublishResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [fundingId, setFundingId] = useState(null);
  const [fundWallet, setFundWallet] = useState(null); // wallet being funded
  const [fundMode, setFundMode] = useState(null); // 'options' | 'xumm'
  const [xummFundData, setXummFundData] = useState(null);
  const [xummFundLoading, setXummFundLoading] = useState(false);
  const [xummFundResult, setXummFundResult] = useState(null);

  const startXummFunding = async (wallet) => {
    setFundWallet(wallet);
    setFundMode('xumm');
    setXummFundData(null);
    setXummFundLoading(true);
    setXummFundResult(null);
    try {
      const res = await base44.functions.invoke('fundWalletXumm', {
        classic_address: wallet.classic_address,
        amount: 12,
      });
      setXummFundData(res.data);
    } catch (e) {
      setXummFundResult({ error: e?.response?.data?.error || e.message });
    }
    setXummFundLoading(false);
  };
  const [copied, setCopied] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);

  const refreshBalance = async (wallet) => {
    setRefreshingId(wallet.id);
    try {
      const res = await base44.functions.invoke('getBalance', { wallet_id: wallet.id });
      const liveBalance = res?.data?.balance;
      if (typeof liveBalance === 'number') {
        setWallets(prev => prev.map(w => w.id === wallet.id ? { ...w, balance: liveBalance } : w));
      }
      await loadWallets();
    } catch (_) {}
    setRefreshingId(null);
  };

  const loadWallets = async () => {
    try {
      const me = await base44.auth.me();
      if (me) {
        const ws = await base44.entities.Wallet.filter({ owner_id: me.id }, '-created_date', 20);
        setWallets(ws || []);
      }
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { loadWallets(); }, []);

  const handleCreateWallet = async () => {
    if (!walletName.trim()) return;
    setCreating(true);
    try {
      await base44.functions.invoke('createWallet', { name: walletName, network: 'testnet' });
      await loadWallets();
      setMode('idle');
      setWalletName('');
    } catch (_) {}
    setCreating(false);
  };

  const handleStartPublish = async () => {
    if (!selectedWalletId) return;
    setPublishing(true);
    setPublishData(null);
    setPublishResult(null);
    try {
      const res = await base44.functions.invoke('publishDID', { wallet_id: selectedWalletId });
      setPublishData(res.data);
      setMode('publish_qr');
    } catch (e) {
      setPublishResult({ error: e?.response?.data?.error || e.message });
    }
    setPublishing(false);
  };

  const handleCheckStatus = async () => {
    if (!publishData?.uuid) return;
    setChecking(true);
    try {
      const res = await base44.functions.invoke('publishDID', {
        action: 'check_status',
        uuid: publishData.uuid,
        wallet_id: selectedWalletId,
      });
      if (res.data?.signed) {
        setPublishResult({ success: true, txid: res.data.txid });
        await loadWallets();
      } else {
        setPublishResult({ pending: true });
      }
    } catch (e) {
      setPublishResult({ error: e?.response?.data?.error || e.message });
    }
    setChecking(false);
  };

  const reset = () => {
    setMode('idle');
    setPublishData(null);
    setPublishResult(null);
    setSelectedWalletId('');
  };

  const publishedWallets = wallets.filter(w => w.is_published);
  const unpublishedWallets = wallets.filter(w => !w.is_published);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" /> Sovereign Identity & DIDs
        </h3>
        <button onClick={loadWallets} className="text-white/30 hover:text-white/60 transition">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── No wallets — Discovery state ── */}
          {wallets.length === 0 && mode === 'idle' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto">
                <Shield className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">No Sovereign Identity Yet</p>
                <p className="text-white/40 text-xs mt-1">Create an XRPL wallet and anchor your DID to the ledger.</p>
              </div>
              <button
                onClick={() => setMode('creating')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                <Plus className="w-4 h-4" /> Create My XRPL Wallet
              </button>
            </div>
          )}

          {/* ── Published DIDs ── */}
          {publishedWallets.length > 0 && mode === 'idle' && (
            <div className="space-y-2">
              <p className="text-white/40 text-xs uppercase tracking-widest">Active DIDs</p>
              {publishedWallets.map(w => (
                <div key={w.id} className="bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{w.name || 'Wallet'}</p>
                        <p className="text-white/40 text-xs font-mono truncate">{w.classic_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full">{w.balance ?? 0} XRP</span>
                      <button
                        onClick={() => refreshBalance(w)}
                        disabled={refreshingId === w.id}
                        title="Refresh balance"
                        className="text-white/30 hover:text-white/70 transition disabled:opacity-40"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshingId === w.id ? 'animate-spin' : ''}`} />
                      </button>
                      <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full">DID Active</span>
                      <a
                        href={`https://${w.network === 'mainnet' ? 'livenet' : 'testnet'}.xrpl.org/accounts/${w.classic_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white/70 transition"
                        title="View wallet on XRPL Explorer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  <DIDWalletEditor wallet={w} onSaved={loadWallets} onDeleted={loadWallets} />
                </div>
              ))}
            </div>
          )}

          {/* ── Unpublished wallets ── */}
          {unpublishedWallets.length > 0 && mode === 'idle' && (
            <div className="space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-widest">Wallets Awaiting DID Publication</p>
              {unpublishedWallets.map(w => {
                const isFunded = (w.balance ?? 0) >= 12;
                const isThisFundOpen = fundWallet?.id === w.id;
                return (
                  <div key={w.id} className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 space-y-3">
                    {/* Wallet header row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{w.name || 'Wallet'}</p>
                          <p className="text-white/40 text-xs font-mono truncate">{w.classic_address?.slice(0, 22)}…</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          isFunded ? 'bg-green-500/10 text-green-300 border-green-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'
                        }`}>{w.balance ?? 0} XRP</span>
                        <button
                          onClick={() => refreshBalance(w)}
                          disabled={refreshingId === w.id}
                          title="Refresh balance"
                          className="text-white/30 hover:text-white/70 transition disabled:opacity-40"
                        >
                          <RefreshCw className={`w-3 h-3 ${refreshingId === w.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <DIDWalletEditor wallet={w} onSaved={loadWallets} onDeleted={loadWallets} />

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {!isFunded && (
                        <button
                          onClick={() => {
                            if (isThisFundOpen && (fundMode === 'options' || fundMode === 'xumm')) {
                              setFundWallet(null); setFundMode(null); setXummFundData(null); setXummFundResult(null);
                            } else {
                              setFundWallet(w); setFundMode('options'); setXummFundData(null); setXummFundResult(null);
                            }
                          }}
                          className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition flex-1 justify-center ${
                            isThisFundOpen ? 'bg-amber-600/40 border-amber-400/50 text-amber-200' : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <Wallet className="w-3 h-3" /> {isThisFundOpen ? 'Close Funding' : 'Fund Wallet'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!isFunded) {
                            setFundWallet(w); setFundMode('options'); setXummFundData(null); setXummFundResult(null);
                          } else {
                            setSelectedWalletId(w.id); setMode('publish_select');
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition flex-1 justify-center"
                      >
                        <Globe className="w-3 h-3" /> {isFunded ? 'Publish DID' : 'Fund to Publish'}
                      </button>
                    </div>

                    {/* Inline funding panel */}
                    {isThisFundOpen && fundMode === 'options' && (
                      <div className="bg-black/30 border border-amber-500/20 rounded-xl p-4 space-y-2">
                        <p className="text-white/40 text-[10px] font-mono">{w.classic_address}</p>
                        {/* Testnet Faucet */}
                        <button
                          onClick={async () => {
                            setFundingId(w.id + '_testnet');
                            try {
                              await base44.functions.invoke('autoFundWallet', { classic_address: w.classic_address, network: w.network || 'testnet' });
                              await loadWallets();
                              setFundMode(null); setFundWallet(null);
                            } catch (e) {
                              setXummFundResult({ error: e?.response?.data?.error || e.message });
                            }
                            setFundingId(null);
                          }}
                          disabled={fundingId === w.id + '_testnet'}
                          className="w-full flex items-center gap-3 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 rounded-xl px-3 py-2.5 text-left transition disabled:opacity-50"
                        >
                          <span className="text-lg">⚡</span>
                          <div className="flex-1">
                            <p className="text-amber-300 text-xs font-medium">{fundingId === w.id + '_testnet' ? 'Requesting funds…' : 'Testnet Faucet'}</p>
                            <p className="text-white/30 text-[10px]">Free, instant — XRPL Testnet only</p>
                          </div>
                          {fundingId === w.id + '_testnet' && <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin" />}
                        </button>

                        <button
                          onClick={() => startXummFunding(w)}
                          disabled={xummFundLoading}
                          className="w-full flex items-center gap-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl px-3 py-2.5 text-left transition disabled:opacity-50"
                        >
                          <span className="text-lg">📱</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-blue-300 text-xs font-medium">Open in Xumm / Xaman app</p>
                            <p className="text-white/30 text-[10px] mb-1">Create a Xumm-compatible payment request for 12 XRP</p>
                          </div>
                          {xummFundLoading ? <Loader2 className="w-3.5 h-3.5 text-blue-300 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5 text-blue-300" />}
                        </button>

                        {isThisFundOpen && fundMode === 'xumm' && (
                          <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 text-center space-y-3">
                            <p className="text-blue-300 text-xs font-medium">Xumm / Xaman compatible funding request</p>
                            <p className="text-white/30 text-[10px]">Scan this QR code in Xumm/Xaman to send the required 12 XRP.</p>
                            {xummFundLoading && (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
                              </div>
                            )}
                            {xummFundData?.qr_png && (
                              <img src={xummFundData.qr_png} alt="Xumm funding QR" className="w-44 h-44 mx-auto rounded-xl border border-white/10 bg-white p-2" />
                            )}
                            {xummFundData?.qr_link && (
                              <a
                                href={xummFundData.qr_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-blue-300 hover:text-blue-200 text-xs underline"
                              >
                                Open in Xumm / Xaman App <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}

                        <div className="w-full flex items-start gap-3 bg-slate-700/20 border border-slate-500/20 rounded-xl px-3 py-2.5">
                          <span className="text-lg">🏦</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-xs font-medium">Wallet funding address</p>
                            <p className="text-white/30 text-[10px] mb-1">Send at least 12 XRP to this address before publishing each DID</p>
                            <p className="text-white/60 text-[10px] font-mono break-all">{w.classic_address}</p>
                          </div>
                        </div>

                        {/* Manual copy */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(w.classic_address);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-left transition"
                        >
                          {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/30" />}
                          <div>
                            <p className="text-white text-xs font-medium">{copied ? 'Address Copied!' : 'Copy funding address'}</p>
                            <p className="text-white/30 text-[10px]">Use this address in Xumm, another wallet, or an exchange transfer</p>
                          </div>
                        </button>

                        {/* After sending, refresh live balance */}
                        <button
                          onClick={async () => {
                            await refreshBalance(w);
                            setFundMode(null);
                            setFundWallet(null);
                          }}
                          disabled={refreshingId === w.id}
                          className="w-full flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 text-xs rounded-lg py-2 transition disabled:opacity-50"
                        >
                          {refreshingId === w.id ? <><Loader2 className="w-3 h-3 animate-spin" /> Checking balance…</> : <><RefreshCw className="w-3 h-3" /> I've sent XRP — Check Balance</>}
                        </button>

                        {xummFundResult?.error && <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{xummFundResult.error}</p>}
                        </div>
                        )}

                    {!isFunded && !isThisFundOpen && <p className="text-white/30 text-[10px]">This DID needs a minimum of 12 XRP before it can be published, so open funding first.</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Action buttons in idle ── */}
          {mode === 'idle' && wallets.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setMode('creating')}
                className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/15 text-white border border-white/15 px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3 h-3" /> New Wallet
              </button>
              {unpublishedWallets.length > 0 && (
                <button
                  onClick={() => setMode('publish_select')}
                  className="flex items-center gap-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg transition"
                >
                  <QrCode className="w-3 h-3" /> Publish a DID via Xaman
                </button>
              )}
            </div>
          )}

          {/* ── Create Wallet Mode ── */}
          {mode === 'creating' && (
            <div className="bg-black/20 border border-purple-500/20 rounded-xl p-5 space-y-4">
              <button onClick={() => setMode('idle')} className="text-white/40 hover:text-white text-xs transition">← Back</button>
              <h4 className="text-white font-semibold text-sm">Create New XRPL Wallet</h4>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Your wallet is generated server-side and the encrypted seed is stored securely. You will be able to export it from SovereignID.
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Wallet Name</label>
                <input
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/20 text-sm focus:outline-none focus:border-purple-400/60 transition"
                  placeholder="e.g. My SoulBridge Wallet"
                  value={walletName}
                  onChange={e => setWalletName(e.target.value)}
                />
              </div>
              <button
                onClick={handleCreateWallet}
                disabled={creating || !walletName.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl py-3 transition disabled:opacity-50"
              >
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Wallet…</> : <><Plus className="w-4 h-4" /> Create Wallet</>}
              </button>
            </div>
          )}

          {/* ── Publish Select Mode ── */}
          {mode === 'publish_select' && (
            <div className="bg-black/20 border border-purple-500/20 rounded-xl p-5 space-y-4">
              <button onClick={reset} className="text-white/40 hover:text-white text-xs transition">← Back</button>
              <h4 className="text-white font-semibold text-sm flex items-center gap-2"><QrCode className="w-4 h-4 text-purple-400" /> Publish DID via Xaman</h4>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Select Wallet to Publish</label>
                <select
                  value={selectedWalletId}
                  onChange={e => setSelectedWalletId(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400/60 transition"
                >
                  <option value="">-- Choose a wallet --</option>
                  {unpublishedWallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name || 'Unnamed'} · {w.classic_address?.slice(0, 14)}… ({w.network})</option>
                  ))}
                </select>
              </div>
              {selectedWalletId && (() => {
                const selectedWallet = unpublishedWallets.find(w => w.id === selectedWalletId);
                const currentBalance = selectedWallet?.balance ?? 0;
                const needsFunding = currentBalance < 12;
                return (
                  <div className={`rounded-xl border px-4 py-3 text-xs ${needsFunding ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-green-500/10 border-green-500/20 text-green-300'}`}>
                    {needsFunding
                      ? `This wallet currently has ${currentBalance} XRP. It needs a minimum of 12 XRP before signing the DID publish transaction.`
                      : `This wallet has ${currentBalance} XRP and is ready for DID publication.`}
                  </div>
                );
              })()}
              <button
                onClick={handleStartPublish}
                disabled={!selectedWalletId || publishing}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl py-3 transition disabled:opacity-50"
              >
                {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating QR…</> : <><QrCode className="w-4 h-4" /> Generate Xaman QR</>}
              </button>
              {publishResult?.error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{publishResult.error}</p>
              )}
            </div>
          )}

          {/* ── Xaman QR Mode ── */}
          {mode === 'publish_qr' && publishData && (
            <div className="bg-black/20 border border-purple-500/20 rounded-xl p-5 space-y-4">
              <button onClick={reset} className="text-white/40 hover:text-white text-xs transition">← Cancel</button>
              <h4 className="text-white font-semibold text-sm flex items-center gap-2"><QrCode className="w-4 h-4 text-purple-400" /> Scan with Xaman</h4>

              {!publishResult?.success ? (
                <>
                  <div className="bg-white/5 rounded-xl p-4 text-center space-y-3">
                    <p className="text-white/50 text-xs">Scan this QR code with your Xaman wallet to sign the DIDSet transaction</p>
                    {publishData.qr_png && (
                      <img src={publishData.qr_png} alt="Xaman QR" className="w-48 h-48 mx-auto rounded-xl border border-white/10" />
                    )}
                    {publishData.qr_link && (
                      <a href={publishData.qr_link} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs underline">
                        Open in Xaman App <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={handleCheckStatus}
                    disabled={checking}
                    className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl py-3 transition border border-white/15 disabled:opacity-50"
                  >
                    {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : <><RefreshCw className="w-4 h-4" /> Check Signing Status</>}
                  </button>
                  {publishResult?.pending && (
                    <p className="text-xs text-amber-400 text-center">Not yet signed — please scan the QR in Xaman, then check again.</p>
                  )}
                  {publishResult?.error && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{publishResult.error}</p>
                  )}
                </>
              ) : (
                <div className="text-center space-y-4 py-2">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                  <div>
                    <p className="text-white font-semibold">DID Published Successfully!</p>
                    <p className="text-white/40 text-xs mt-1">Your identity is now anchored on the XRPL ledger.</p>
                  </div>
                  {publishResult.txid && (
                    <div className="bg-black/30 border border-green-500/20 rounded-xl px-4 py-3 space-y-1 text-left">
                      <p className="text-green-400 text-xs font-semibold">Transaction ID</p>
                      <p className="text-white/40 text-xs font-mono break-all">{publishResult.txid}</p>
                      <a
                        href={`https://testnet.xrpl.org/transactions/${publishResult.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        View on XRPL Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  <button onClick={reset} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition">
                    <ArrowRight className="w-4 h-4" /> Done
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}