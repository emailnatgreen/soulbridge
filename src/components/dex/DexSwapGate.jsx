import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowDownUp, ShoppingBag, Zap, ExternalLink, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DexSwapPanel from './DexSwapPanel';

const DEX_FEATURE_PATH = '/dex-swap';

function DiditsStoreNotice() {
  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20 rounded-xl p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-4 h-4 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-xs">DEX Swap & PayPal Payments</p>
          <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">
            For DEX token swaps and PayPal payment options, please visit our store.
          </p>
          <a
            href="https://didits.store"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 bg-blue-600/80 hover:bg-blue-500/80 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-all"
          >
            Visit didits.store <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function DexSwapGate({ wallets, isUnlocked, getWidgetForPath }) {
  const unlocked = isUnlocked(DEX_FEATURE_PATH);
  const widget = getWidgetForPath(DEX_FEATURE_PATH);

  if (unlocked) {
    return (
      <div className="space-y-3">
        <DiditsStoreNotice />
        <DexSwapPanel wallets={wallets} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DiditsStoreNotice />
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-cyan-400" />
            <h3 className="text-white font-semibold text-sm">DEX Swap</h3>
          </div>
          <span className="flex items-center gap-1 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> NFT Required
          </span>
        </div>

        <div className="text-center py-4 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto">
            <ArrowDownUp className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">DEX Swap Access NFT</p>
            <p className="text-white/40 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
              Swap XRP ↔ RLUSD directly on the XRPL DEX via Xaman. One-time purchase of <span className="text-cyan-300 font-bold">20 RLUSD</span> with a 1% Village fee on each swap.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 text-[10px] text-white/30">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Requires RLUSD Trustline</span>
            <span>•</span>
            <span>1% fee → Treasury</span>
          </div>
          <Link to="/widget-marketplace">
            <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white gap-2 text-xs h-9 px-4">
              <ShoppingBag className="w-3.5 h-3.5" /> Get DEX Swap NFT — 20 RLUSD
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}