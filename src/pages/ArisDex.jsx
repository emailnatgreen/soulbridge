import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import MarketSidebar from '@/components/dex/MarketSidebar';
import TradingChart from '@/components/dex/TradingChart';
import OrderPanel from '@/components/dex/OrderPanel';
import { TrendingUp, TrendingDown, Activity, Wifi, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ArisDex() {
  const [selectedPairId, setSelectedPairId] = useState(null);

  const { data: pairs = [] } = useQuery({
    queryKey: ['tradingPairs'],
    queryFn: () => base44.entities.TradingPair.filter({ is_active: true }, '-volume_24h'),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['tradeOrders'],
    queryFn: () => base44.entities.TradeOrder.list('-created_date', 100),
  });

  const selectedPair = pairs.find(p => p.id === selectedPairId) || pairs[0];
  const isUp = (selectedPair?.price_change_24h || 0) >= 0;

  return (
    <div className="h-screen bg-[#0a0e1a] text-white flex flex-col overflow-hidden font-mono">

      {/* ── Top Bar ── */}
      <header className="border-b border-gray-800 px-4 py-2 flex items-center gap-4 bg-[#0d1226] shrink-0">
        {/* Brand */}
        <a href={createPageUrl('Home')} className="text-gray-600 hover:text-gray-300 transition-colors mr-1">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            ⚡ Ari's DEX
          </span>
          <span className="flex items-center gap-1 bg-green-900/40 text-green-400 text-xs border border-green-800 rounded px-1.5 py-0.5">
            <Wifi className="w-2.5 h-2.5" /> LIVE
          </span>
        </div>

        {/* Selected pair stats */}
        {selectedPair && (
          <div className="hidden lg:flex items-center gap-5 ml-4 pl-4 border-l border-gray-800 text-sm">
            <span className="text-gray-400 text-xs">{selectedPair.symbol}</span>
            <span className="text-xl font-bold text-white">
              {selectedPair.current_price?.toLocaleString(undefined, { maximumFractionDigits: 5 })}
            </span>
            <span className={`flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? '+' : ''}{selectedPair.price_change_24h?.toFixed(2) || '0.00'}%
            </span>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>H: <span className="text-gray-300">{selectedPair.high_24h?.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span></span>
              <span>L: <span className="text-gray-300">{selectedPair.low_24h?.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span></span>
              <span>Vol: <span className="text-gray-300">{selectedPair.volume_24h?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
            </div>
          </div>
        )}

        {/* Right info */}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-600">
          <Activity className="w-3.5 h-3.5 text-purple-500" />
          <span>MetaTrader + Exchange APIs: Tomorrow</span>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Market Sidebar */}
        <MarketSidebar
          pairs={pairs}
          selectedPair={selectedPair}
          onSelect={p => setSelectedPairId(p.id)}
        />

        {/* Center + Bottom: Chart + Order Panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TradingChart pair={selectedPair} />
          <OrderPanel pair={selectedPair} orders={orders} />
        </div>
      </div>
    </div>
  );
}