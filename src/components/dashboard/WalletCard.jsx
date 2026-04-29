import React, { useState, useEffect } from 'react';
import { Wallet, RefreshCw, Copy, Check, ExternalLink, ArrowUpRight, ArrowDownLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function WalletCard({ wallets = [], transactions = [], isLoading: externalLoading = false }) {
  const [liveBalances, setLiveBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [internalWallets, setInternalWallets] = useState(wallets);

  // Sync with prop changes
  useEffect(() => { setInternalWallets(wallets); }, [wallets]);

  // If no wallets from props, try fetching directly
  useEffect(() => {
    if (wallets.length > 0) return;
    const fetchWallets = async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!me?.id) return;
      const fetched = await base44.entities.Wallet.filter({ owner_id: me.id }, '-created_date', 20).catch(() => []);
      if (fetched.length > 0) setInternalWallets(fetched);
    };
    fetchWallets();
  }, [wallets.length]);

  const validWallets = internalWallets.filter(w => w.classic_address);
  const primaryWallet = validWallets.find(w => w.is_published) || validWallets[0];

  const allAddresses = [...new Set(validWallets.map(w => w.classic_address))];

  const fetchBalances = async () => {
    if (allAddresses.length === 0) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('xrplProxy', { addresses: allAddresses });
      setLiveBalances(res?.data?.balances || {});
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { if (allAddresses.length > 0) fetchBalances(); }, [allAddresses.join(',')]);

  const copyAddress = () => {
    if (!primaryWallet?.classic_address) return;
    navigator.clipboard.writeText(primaryWallet.classic_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!primaryWallet) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-semibold text-sm">My Wallet</h3>
        </div>
        {externalLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <p className="text-white/40 text-xs">Loading wallets…</p>
          </div>
        ) : (
          <>
            <p className="text-white/40 text-xs">No wallet found. Create one via Seed Golden Acorn or Sovereign ID.</p>
            <Link to="/seed-golden-acorn" className="mt-3 inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition">
              Create wallet <ChevronRight className="w-3 h-3" />
            </Link>
          </>
        )}
      </div>
    );
  }

  // Aggregate balances across all wallets
  const totalXRP = allAddresses.reduce((sum, addr) => {
    const live = liveBalances[addr];
    const bal = live?.balance != null ? live.balance : (validWallets.find(w => w.classic_address === addr)?.balance || 0);
    return sum + Number(bal);
  }, 0);

  const recentTxs = (transactions || []).slice(0, 4);

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-purple-950/40 border border-purple-500/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-white font-semibold text-sm">My Wallet</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBalances} disabled={loading} className="text-white/30 hover:text-white/60 transition p-1" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link to="/wallets" className="text-[10px] text-purple-300 hover:text-purple-200 flex items-center gap-0.5 transition">
            Manage <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Balance */}
      <div className="px-5 pb-4">
        <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Total Balance</p>
        <p className="text-white font-bold text-2xl tabular-nums">{totalXRP.toFixed(2)} <span className="text-sm text-white/40 font-medium">XRP</span></p>
        {validWallets.length > 1 && (
          <p className="text-white/30 text-[10px] mt-0.5">Across {validWallets.length} wallets</p>
        )}
      </div>

      {/* Primary Address */}
      <div className="mx-5 mb-4 bg-black/30 border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white/30 text-[9px] uppercase tracking-wider mb-0.5">
            {primaryWallet.name || 'Primary Address'}
            {primaryWallet.is_published && <span className="text-green-400/60 ml-1">· DID Published</span>}
          </p>
          <p className="text-purple-200/70 font-mono text-[11px] truncate">{primaryWallet.classic_address}</p>
        </div>
        <button onClick={copyAddress} className="flex-shrink-0 text-white/30 hover:text-white/60 transition p-1" title="Copy address">
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a href={`https://livenet.xrpl.org/accounts/${primaryWallet.classic_address}`} target="_blank" rel="noopener noreferrer"
          className="flex-shrink-0 text-white/30 hover:text-white/60 transition p-1" title="View on explorer">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Multi-wallet breakdown (if more than 1) */}
      {validWallets.length > 1 && (
        <div className="mx-5 mb-4 space-y-1.5">
          <p className="text-white/25 text-[9px] uppercase tracking-wider">All Wallets</p>
          {validWallets.map(w => {
            const live = liveBalances[w.classic_address];
            const bal = live?.balance != null ? live.balance : (w.balance || 0);
            return (
              <div key={w.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-white/60 text-[10px] font-medium truncate">{w.name || w.classic_address?.slice(0, 12) + '…'}</p>
                </div>
                <p className="text-white/80 text-xs font-semibold tabular-nums flex-shrink-0">{Number(bal).toFixed(2)} XRP</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Transactions */}
      {recentTxs.length > 0 && (
        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-white/30 text-[10px] uppercase tracking-widest">Recent Activity</p>
            <Link to="/TransactionHistory" className="text-[10px] text-purple-300/60 hover:text-purple-200 flex items-center gap-0.5">
              All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {recentTxs.map(tx => {
              const isSend = !!tx.from_wallet_id;
              return (
                <div key={tx.id} className="flex items-center gap-2.5 py-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSend ? 'bg-pink-500/15' : 'bg-emerald-500/15'}`}>
                    {isSend ? <ArrowUpRight className="w-3.5 h-3.5 text-pink-400" /> : <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-[11px] font-medium truncate">{tx.recipient_name || tx.recipient_address || 'Transaction'}</p>
                    <p className="text-white/25 text-[9px]">{tx.created_date ? new Date(tx.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[11px] font-semibold tabular-nums ${isSend ? 'text-pink-300' : 'text-emerald-300'}`}>
                      {isSend ? '-' : '+'}{tx.amount || '0'} XRP
                    </p>
                    <span className={`text-[8px] px-1 py-0.5 rounded-full border ${
                      tx.status === 'completed' ? 'bg-green-500/15 text-green-400 border-green-500/20' :
                      tx.status === 'failed' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                      'bg-amber-500/15 text-amber-400 border-amber-500/20'
                    }`}>{tx.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentTxs.length === 0 && (
        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-white/20 text-xs text-center">No transactions yet</p>
        </div>
      )}
    </div>
  );
}