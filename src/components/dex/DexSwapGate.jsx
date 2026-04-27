import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowDownUp, ShoppingBag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DexSwapPanel from './DexSwapPanel';

const DEX_FEATURE_PATH = '/dex-swap';

export default function DexSwapGate({ wallets, isUnlocked, getWidgetForPath }) {
  const unlocked = isUnlocked(DEX_FEATURE_PATH);
  const widget = getWidgetForPath(DEX_FEATURE_PATH);

  if (unlocked) {
    return <DexSwapPanel wallets={wallets} />;
  }

  return (
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
  );
}