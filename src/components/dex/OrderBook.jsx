import React, { useState, useEffect, useCallback } from 'react';

const SPREAD_BY_CLASS = { fx: 0.00015, crypto: 0.0008, defi: 0.0015, commodity: 0.001 };

function buildBook(basePrice, assetClass) {
  if (!basePrice) return { bids: [], asks: [], spreadPct: 0, midPrice: 0 };
  const spread = SPREAD_BY_CLASS[assetClass] || 0.001;
  const halfSpread = basePrice * spread / 2;
  const tickStep = basePrice * 0.0003;

  const bids = [];
  const asks = [];
  let bidP = basePrice - halfSpread;
  let askP = basePrice + halfSpread;

  for (let i = 0; i < 16; i++) {
    const bidSize = parseFloat((Math.random() * 4 + 0.15).toFixed(3));
    const askSize = parseFloat((Math.random() * 4 + 0.15).toFixed(3));
    bids.push({ price: bidP, size: bidSize });
    asks.push({ price: askP, size: askSize });
    bidP -= tickStep * (0.7 + Math.random() * 0.8);
    askP += tickStep * (0.7 + Math.random() * 0.8);
  }

  // Cumulative
  let cumBid = 0, cumAsk = 0;
  const totalBid = bids.reduce((s, b) => s + b.size, 0);
  const totalAsk = asks.reduce((s, a) => s + a.size, 0);
  const maxCum = Math.max(totalBid, totalAsk);

  return {
    bids: bids.map(b => ({ ...b, cum: parseFloat((cumBid += b.size).toFixed(3)), depthPct: (cumBid / maxCum) * 100 })),
    asks: asks.reverse().map(a => ({ ...a, cum: parseFloat((cumAsk += a.size).toFixed(3)), depthPct: (cumAsk / maxCum) * 100 })).reverse(),
    spreadAbs: (asks[asks.length - 1]?.price - bids[0]?.price) || 0,
    spreadPct: ((basePrice * spread) / basePrice * 100).toFixed(4),
    midPrice: basePrice,
  };
}

function formatPrice(p, basePrice) {
  if (!p) return '—';
  if (basePrice > 10000) return p.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (basePrice > 100) return p.toFixed(2);
  if (basePrice > 1) return p.toFixed(4);
  return p.toFixed(6);
}

function BookRow({ row, side }) {
  const isAsk = side === 'ask';
  const color = isAsk ? 'text-red-400' : 'text-emerald-400';
  const bgColor = isAsk ? 'bg-red-500' : 'bg-emerald-500';

  return (
    <div className="relative flex items-center text-xs font-mono py-[3px] px-3 hover:bg-white/5 cursor-default">
      {/* Depth bar background */}
      <div
        className={`absolute ${isAsk ? 'right-0' : 'right-0'} top-0 bottom-0 ${bgColor} opacity-[0.08]`}
        style={{ width: `${row.depthPct}%` }}
      />
      <span className={`flex-1 ${color}`}>{formatPrice(row.price, row.price)}</span>
      <span className="flex-1 text-center text-gray-300">{row.size.toFixed(3)}</span>
      <span className="flex-1 text-right text-gray-500">{row.cum.toFixed(3)}</span>
    </div>
  );
}

export default function OrderBook({ pair }) {
  const [book, setBook] = useState({ bids: [], asks: [], spreadPct: 0, midPrice: 0 });

  const refresh = useCallback(() => {
    if (!pair?.current_price) return;
    setBook(prev => {
      // Subtle update: only tweak sizes, keep prices stable
      const newBook = buildBook(pair.current_price, pair.asset_class);
      if (prev.bids.length === 0) return newBook;
      // Mix old prices with new sizes for smooth animation
      return {
        ...newBook,
        bids: newBook.bids.map((b, i) => ({ ...b, price: prev.bids[i]?.price ?? b.price })),
        asks: newBook.asks.map((a, i) => ({ ...a, price: prev.asks[i]?.price ?? a.price })),
      };
    });
  }, [pair?.current_price, pair?.asset_class]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [refresh]);

  if (!pair) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-xs">
        Select a pair
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-white">Order Book</span>
        <span className="text-xs text-gray-600">{pair.symbol}</span>
      </div>

      {/* Column headers */}
      <div className="flex text-xs font-mono text-gray-600 px-3 py-1 border-b border-gray-800/50 shrink-0">
        <span className="flex-1">Price</span>
        <span className="flex-1 text-center">Size</span>
        <span className="flex-1 text-right">Total</span>
      </div>

      {/* Asks */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end">
        <div className="flex flex-col-reverse overflow-hidden">
          {book.asks.slice(0, 12).map((row, i) => (
            <BookRow key={i} row={row} side="ask" />
          ))}
        </div>
      </div>

      {/* Mid price / spread */}
      <div className="px-3 py-1.5 border-y border-gray-800 bg-gray-900/60 shrink-0 flex items-center justify-between">
        <span className="text-sm font-bold font-mono text-white">
          {formatPrice(pair.current_price, pair.current_price)}
        </span>
        <span className="text-xs text-gray-500">
          Spread <span className="text-yellow-500">{book.spreadPct}%</span>
        </span>
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden">
        {book.bids.slice(0, 12).map((row, i) => (
          <BookRow key={i} row={row} side="bid" />
        ))}
      </div>

      {/* Footer note */}
      <div className="px-3 py-1 border-t border-gray-800 shrink-0">
        <span className="text-[10px] text-gray-700">Indicative depth · Live book tomorrow</span>
      </div>
    </div>
  );
}