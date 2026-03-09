import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MarketSidebar from '@/components/dex/MarketSidebar';
import TradingChart from '@/components/dex/TradingChart';
import OrderPanel from '@/components/dex/OrderPanel';
import SignalsPanel from '@/components/dex/SignalsPanel';
import OrderBook from '@/components/dex/OrderBook';
import PortfolioPanel from '@/components/dex/PortfolioPanel';
import { TrendingUp, TrendingDown, Activity, Wifi, ArrowLeft, Zap, BookOpen, RefreshCw, PieChart } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const REFRESH_INTERVAL = 3 * 60 * 1000; // 3 min auto-refresh prices

export default function ArisDex() {
  const [selectedPairId, setSelectedPairId] = useState(null);
  const [rightTab, setRightTab] = useState('book'); // 'book' | 'signals' | 'portfolio'
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: pairs = [], refetch: refetchPairs } = useQuery({
    queryKey: ['tradingPairs'],
    queryFn: () => base44.entities.TradingPair.filter({ is_active: true }, '-volume_24h'),
    refetchInterval: REFRESH_INTERVAL,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['tradeOrders'],
    queryFn: () => base44.entities.TradeOrder.list('-created_date', 100),
  });

  const selectedPair = pairs.find(p => p.id === selectedPairId) || pairs[0];
  const isUp = (selectedPair?.price_change_24h || 0) >= 0;

  // Auto-fetch real market data on mount
  useEffect(() => {
    base44.functions.invoke('fetchMarketData', {})
      .then(() => queryClient.invalidateQueries({ queryKey: ['tradingPairs'] }))
      .catch(() => {});
  }, []);

  // Periodic price refresh
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        await base44.functions.invoke('fetchMarketData', {});
        queryClient.invalidateQueries({ queryKey: ['tradingPairs'] });
      } catch (_) {}
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke('fetchMarketData', {});
      await queryClient.invalidateQueries({ queryKey: ['tradingPairs'] });
      toast.success(`Updated ${res.data?.updated || 0} pairs`);
    } catch {
      toast.error('Refresh failed');
    }
    setRefreshing(false);
  };

  return (
    <div className="h-screen bg-[#0a0e1a] text-white flex flex-col overflow-hidden font-mono">

      {/* ── Top Bar ── */}
      <header className="border-b border-gray-800 px-4 py-2 flex items-center gap-4 bg-[#0d1226] shrink-0">
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
              {selectedPair.current_price?.toLocaleString(undefined, {
                maximumFractionDigits: selectedPair.current_price > 100 ? 2 : 5
              })}
            </span>
            <span className={`flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? '+' : ''}{selectedPair.price_change_24h?.toFixed(2) || '0.00'}%
            </span>
            <div className="flex gap-3 text-xs text-gray-500">
              <span>H: <span className="text-gray-300">{selectedPair.high_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
              <span>L: <span className="text-gray-300">{selectedPair.low_24h?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
              <span>Vol: <span className="text-gray-300">{selectedPair.volume_24h >= 1e9
                ? `$${(selectedPair.volume_24h / 1e9).toFixed(2)}B`
                : selectedPair.volume_24h >= 1e6
                  ? `$${(selectedPair.volume_24h / 1e6).toFixed(1)}M`
                  : selectedPair.volume_24h?.toLocaleString()
              }</span></span>
            </div>
          </div>
        )}

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            title="Refresh prices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Activity className="w-3.5 h-3.5 text-purple-500" />
            <span>Exchange APIs: Tomorrow</span>
          </div>
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

        {/* Center: Chart + Order Panel */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <TradingChart pair={selectedPair} />
          <OrderPanel pair={selectedPair} orders={orders} />
        </div>

        {/* Right: Order Book + Signals Panel */}
        <div className="hidden xl:flex w-64 border-l border-gray-800 flex-col overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-800 shrink-0">
            <button
              onClick={() => setRightTab('book')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
                rightTab === 'book' ? 'text-white border-b-2 border-purple-500 bg-gray-900/40' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <BookOpen className="w-3 h-3" /> Book
            </button>
            <button
              onClick={() => setRightTab('signals')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
                rightTab === 'signals' ? 'text-white border-b-2 border-yellow-500 bg-gray-900/40' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Zap className="w-3 h-3" /> Signals
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === 'book' ? (
              <OrderBook pair={selectedPair} />
            ) : (
              <SignalsPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}