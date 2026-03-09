import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function PortfolioPanel({ pairs = [] }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['tradeOrders'],
    queryFn: () => base44.entities.TradeOrder.list('-created_date', 100),
  });

  const positions = useMemo(() => {
    return orders
      .filter(o => o.status === 'filled' || o.status === 'partial')
      .map(o => {
        const pair = pairs.find(p => p.id === o.trading_pair_id || p.symbol === o.symbol);
        const currentPrice = pair?.current_price || o.average_fill_price || o.price || 0;
        const entryPrice = o.average_fill_price || o.price || 0;
        const qty = o.filled_amount || o.amount || 0;
        const isBuy = o.side === 'buy';
        const pnlPct = entryPrice > 0
          ? ((currentPrice - entryPrice) / entryPrice * 100) * (isBuy ? 1 : -1)
          : 0;
        const pnlAbs = (currentPrice - entryPrice) * qty * (isBuy ? 1 : -1);
        return { ...o, currentPrice, entryPrice, pnlPct, pnlAbs, qty };
      });
  }, [orders, pairs]);

  const totalPnl = positions.reduce((s, p) => s + p.pnlAbs, 0);
  const winners = positions.filter(p => p.pnlPct > 0).length;
  const winRate = positions.length > 0 ? Math.round(winners / positions.length * 100) : 0;

  const openOrders = orders.filter(o => o.status === 'open');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs">
        Loading portfolio...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* Summary stats */}
      <div className="p-2.5 border-b border-gray-800 space-y-2 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-900 rounded p-2">
            <div className="text-gray-600 mb-0.5">Realised P&L</div>
            <div className={`font-bold font-mono text-sm ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(4)}
            </div>
          </div>
          <div className="bg-gray-900 rounded p-2">
            <div className="text-gray-600 mb-0.5">Win Rate</div>
            <div className="text-white font-bold text-sm">{winRate}%</div>
          </div>
        </div>
        <div className="flex justify-between text-gray-600 px-0.5">
          <span>Positions: <span className="text-gray-300">{positions.length}</span></span>
          <span>Open: <span className="text-yellow-500">{openOrders.length}</span></span>
        </div>
      </div>

      {/* Positions */}
      <div className="shrink-0 px-3 py-1.5 text-gray-600 font-semibold border-b border-gray-800/50 bg-gray-900/30">
        FILLED POSITIONS
      </div>
      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="p-4 text-center text-gray-700 text-xs">
            No filled positions yet.<br />
            <span className="text-gray-800">Execute a trade to see it here.</span>
          </div>
        ) : (
          positions.map(pos => {
            const isPos = pos.pnlPct >= 0;
            const Icon = pos.pnlPct > 0.01 ? TrendingUp : pos.pnlPct < -0.01 ? TrendingDown : Minus;
            return (
              <div key={pos.id} className="px-3 py-2.5 border-b border-gray-800/40 hover:bg-gray-900/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-semibold">{pos.symbol?.split('/')[0] || pos.symbol}</span>
                    <span className={`text-[10px] px-1 rounded ${pos.side === 'buy' ? 'bg-green-900/50 text-green-500' : 'bg-red-900/50 text-red-500'}`}>
                      {pos.side?.toUpperCase()}
                    </span>
                  </div>
                  <div className={`flex items-center gap-0.5 font-mono font-bold ${isPos ? 'text-green-400' : 'text-red-400'}`}>
                    <Icon className="w-3 h-3" />
                    {isPos ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                  </div>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Qty: <span className="text-gray-400">{pos.qty}</span></span>
                  <span>Entry: <span className="text-gray-400">{pos.entryPrice?.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span></span>
                </div>
                <div className="flex justify-between text-gray-600 mt-0.5">
                  <span>Now: <span className="text-gray-300">{pos.currentPrice?.toLocaleString(undefined, { maximumFractionDigits: 5 })}</span></span>
                  <span className={isPos ? 'text-green-500' : 'text-red-500'}>
                    {isPos ? '+' : ''}{pos.pnlAbs.toFixed(4)}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Open Orders section */}
        {openOrders.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-gray-600 font-semibold border-b border-t border-gray-800/50 bg-gray-900/30 mt-1">
              OPEN ORDERS
            </div>
            {openOrders.map(o => (
              <div key={o.id} className="px-3 py-2.5 border-b border-gray-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-300 font-semibold">{o.symbol?.split('/')[0] || o.symbol}</span>
                    <span className={`text-[10px] px-1 rounded ${o.side === 'buy' ? 'bg-green-900/50 text-green-500' : 'bg-red-900/50 text-red-500'}`}>
                      {o.side?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-yellow-600 text-[10px]">{o.order_type?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-gray-600 mt-0.5">
                  <span>Qty: <span className="text-gray-400">{o.amount}</span></span>
                  <span>@ <span className="text-gray-400">{o.price?.toLocaleString(undefined, { maximumFractionDigits: 5 }) || 'MKT'}</span></span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}