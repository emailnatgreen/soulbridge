import React from 'react';
import { CheckCircle, AlertTriangle, Loader2, Wallet as WalletIcon } from 'lucide-react';

export default function WalletTrustlineCard({ wallet, checkData, loading, selected, onSelect }) {
  const address = wallet.classic_address || '—';
  const shortAddr = address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;
  const hasTrustline = checkData?.has_trustline;
  const needsXrp = checkData?.needs_xrp;

  return (
    <button
      onClick={() => onSelect(wallet)}
      disabled={hasTrustline}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        hasTrustline
          ? 'bg-emerald-500/10 border-emerald-500/30 cursor-default'
          : selected
            ? 'bg-cyan-500/15 border-cyan-400/40 ring-1 ring-cyan-400/30'
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg ${hasTrustline ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
            <WalletIcon className={`w-4 h-4 ${hasTrustline ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{wallet.name || 'Unnamed Wallet'}</p>
            <p className="text-xs text-slate-400 font-mono">{shortAddr}</p>
          </div>
        </div>

        <div className="flex-shrink-0">
          {loading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : hasTrustline ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] text-emerald-300 font-semibold">Active</span>
            </div>
          ) : needsXrp ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-amber-300">Need XRP</span>
            </div>
          ) : (
            <span className="text-[10px] text-cyan-400 font-semibold">Select →</span>
          )}
        </div>
      </div>

      {checkData && !hasTrustline && (
        <div className="mt-2 pt-2 border-t border-white/5 flex gap-4 text-[10px] text-slate-500">
          <span>XRP: {checkData.xrp_balance?.toFixed(2) || '0'}</span>
          {needsXrp && <span className="text-amber-400">Need {checkData.xrp_needed} more XRP</span>}
        </div>
      )}
    </button>
  );
}