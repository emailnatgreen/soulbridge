import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Coins, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkshopBalanceGate({ nftType, children }) {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('workshopNFTCreate', { action: 'price_check', nft_type: nftType });
      setPricing(res.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { loadPricing(); }, [nftType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pricing & Balance Bar */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-semibold">Creation Cost: {pricing?.cost} RLUSD</p>
            <p className="text-white/40 text-[10px]">
              Balance: <span className={pricing?.can_afford ? 'text-green-300' : 'text-red-300'}>{pricing?.balance?.toFixed(2)} RLUSD</span>
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={loadPricing} className="text-white/30 hover:text-white gap-1 text-[10px] h-7">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {/* Insufficient balance warning — skip for zero-cost (admin infrastructure) mints */}
      {!pricing?.can_afford && pricing?.cost > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-300 text-xs font-semibold">Insufficient RLUSD Balance</p>
            <p className="text-red-200/50 text-[10px]">
              You need {pricing?.cost} RLUSD but have {pricing?.balance?.toFixed(2)}. Use the RLUSD Faucet to top up.
            </p>
          </div>
        </div>
      )}

      {/* Render the form, passing canAfford and pricing down */}
      {typeof children === 'function' 
        ? children({ canAfford: pricing?.can_afford || pricing?.cost === 0, cost: pricing?.cost, balance: pricing?.balance, refreshPricing: loadPricing })
        : children
      }
    </div>
  );
}