import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, XCircle, Zap } from 'lucide-react';

const statusConfig = {
  open: { icon: <Clock className="w-3 h-3 text-yellow-400" />, color: 'text-yellow-400' },
  filled: { icon: <CheckCircle className="w-3 h-3 text-green-400" />, color: 'text-green-400' },
  partial: { icon: <Zap className="w-3 h-3 text-blue-400" />, color: 'text-blue-400' },
  cancelled: { icon: <XCircle className="w-3 h-3 text-red-400" />, color: 'text-red-400' },
};

export default function OrderPanel({ pair, orders }) {
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('open');
  const queryClient = useQueryClient();

  const effectivePrice = orderType !== 'market' && limitPrice
    ? parseFloat(limitPrice)
    : (pair?.current_price || 0);

  const totalValue = amount ? (parseFloat(amount) * effectivePrice).toFixed(2) : '0.00';

  const handleSubmit = async () => {
    if (!pair || !amount) return;
    setSubmitting(true);
    const user = await base44.auth.me();
    await base44.entities.TradeOrder.create({
      agent_id: user?.id || 'anon',
      trading_pair_id: pair.id,
      symbol: pair.symbol,
      order_type: orderType,
      side,
      amount: parseFloat(amount),
      price: effectivePrice,
      status: 'open',
      total_value: parseFloat(totalValue),
    });
    queryClient.invalidateQueries({ queryKey: ['tradeOrders'] });
    setAmount('');
    setLimitPrice('');
    setSubmitting(false);
  };

  const filteredOrders = orders.filter(o =>
    activeTab === 'open' ? o.status === 'open' : o.status !== 'open'
  );

  return (
    <div className="flex flex-1 border-t border-gray-800 bg-[#0d1226] overflow-hidden">
      {/* Order Form */}
      <div className="w-64 border-r border-gray-800 p-3 flex flex-col gap-3 shrink-0 overflow-y-auto">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
          {pair ? pair.symbol : 'Select a Pair'}
        </div>

        {/* Buy / Sell Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-gray-900 rounded p-1">
          {['buy', 'sell'].map(s => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                side === s
                  ? s === 'buy' ? 'bg-green-600 text-white shadow' : 'bg-red-600 text-white shadow'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Order Type */}
        <div className="flex gap-1">
          {[['market', 'Market'], ['limit', 'Limit'], ['stop_limit', 'Stop']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setOrderType(val)}
              className={`flex-1 text-xs py-1 rounded transition-colors border ${
                orderType === val
                  ? 'border-purple-600 bg-purple-600/20 text-purple-300'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Price Input */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Price (USDT)</label>
          <input
            value={orderType === 'market'
              ? `Market ≈ ${pair?.current_price?.toLocaleString(undefined, { maximumFractionDigits: 5 }) || '—'}`
              : limitPrice}
            onChange={e => orderType !== 'market' && setLimitPrice(e.target.value)}
            disabled={orderType === 'market'}
            className="w-full bg-gray-900 border border-gray-700 rounded text-xs text-white px-3 py-2 focus:outline-none focus:border-purple-500 disabled:text-gray-500 disabled:cursor-not-allowed font-mono"
          />
        </div>

        {/* Amount Input */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Amount ({pair?.base_asset || '—'})</label>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            type="number"
            min="0"
            className="w-full bg-gray-900 border border-gray-700 rounded text-xs text-white px-3 py-2 focus:outline-none focus:border-purple-500 font-mono"
          />
          {/* Quick % buttons */}
          <div className="flex gap-1 mt-1.5">
            {['25%', '50%', '75%', '100%'].map(pct => (
              <button
                key={pct}
                className="flex-1 text-xs py-0.5 rounded bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                {pct}
              </button>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-900/50 border border-gray-800 rounded p-2 flex justify-between items-center">
          <span className="text-xs text-gray-500">Total</span>
          <span className="text-sm text-white font-mono font-semibold">${parseFloat(totalValue).toLocaleString()}</span>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!pair || !amount || submitting}
          className={`w-full text-sm font-bold py-2 disabled:opacity-40 ${
            side === 'buy'
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
        >
          {submitting ? '⏳ Placing...' : `${side === 'buy' ? '▲ Buy' : '▼ Sell'} ${pair?.base_asset || ''}`}
        </Button>

        <div className="text-center text-xs text-gray-700 border-t border-gray-800 pt-2">
          ⚡ Live exchange routing coming tomorrow
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center border-b border-gray-800 px-4 gap-0">
          {[['open', 'Open Orders'], ['history', 'Trade History']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={`py-2.5 px-3 text-xs transition-colors border-b-2 mr-1 ${
                activeTab === val
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
              {val === 'open' && orders.filter(o => o.status === 'open').length > 0 && (
                <span className="ml-1 bg-purple-600 text-white text-xs rounded-full px-1.5 py-0.5">
                  {orders.filter(o => o.status === 'open').length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
              <div className="text-3xl opacity-30">📋</div>
              <div className="text-xs">{activeTab === 'open' ? 'No open orders' : 'No trade history'}</div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d1226]">
                <tr className="border-b border-gray-800">
                  {['Pair', 'Side', 'Type', 'Amount', 'Price', 'Total', 'Status'].map(h => (
                    <th key={h} className={`px-4 py-2 text-gray-600 font-normal ${h === 'Side' || h === 'Pair' || h === 'Type' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const sc = statusConfig[order.status] || statusConfig.open;
                  return (
                    <tr key={order.id} className="border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors">
                      <td className="px-4 py-2 text-white font-mono font-semibold">{order.symbol}</td>
                      <td className={`px-4 py-2 font-bold ${order.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {order.side?.toUpperCase()}
                      </td>
                      <td className="px-4 py-2 text-gray-400 capitalize">{order.order_type?.replace('_', ' ')}</td>
                      <td className="px-4 py-2 text-right text-white font-mono">{order.amount}</td>
                      <td className="px-4 py-2 text-right text-white font-mono">{order.price?.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                      <td className="px-4 py-2 text-right text-white font-mono">${order.total_value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '—'}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`flex items-center justify-end gap-1 ${sc.color}`}>
                          {sc.icon}
                          <span className="capitalize">{order.status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}