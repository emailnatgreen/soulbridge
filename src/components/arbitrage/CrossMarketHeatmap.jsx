import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutGrid } from 'lucide-react';

const MARKETS = [
  { id: 'xrp', label: 'XRP/USD', category: 'Crypto' },
  { id: 'doge', label: 'DOGE/USDT', category: 'Crypto' },
  { id: 'vet', label: 'VET/USDT', category: 'Crypto' },
  { id: 'gbpusd', label: 'GBP/USD', category: 'FX' },
  { id: 'eurusd', label: 'EUR/USD', category: 'FX' },
  { id: 'xauusd', label: 'XAU/USD', category: 'Commodity' },
];

function getColor(change) {
  if (change === null) return { bg: 'bg-gray-800', text: 'text-gray-500', label: 'N/A' };
  if (change > 0.5) return { bg: 'bg-green-700', text: 'text-green-100', label: `+${change.toFixed(2)}%` };
  if (change > 0.1) return { bg: 'bg-green-900', text: 'text-green-300', label: `+${change.toFixed(2)}%` };
  if (change > -0.1) return { bg: 'bg-gray-700', text: 'text-gray-300', label: `${change.toFixed(2)}%` };
  if (change > -0.5) return { bg: 'bg-red-900', text: 'text-red-300', label: `${change.toFixed(2)}%` };
  return { bg: 'bg-red-700', text: 'text-red-100', label: `${change.toFixed(2)}%` };
}

export default function CrossMarketHeatmap({ xrpPrice, multiPrices, priceHistory, multiPriceHistory }) {
  return (
    <div className="space-y-4">
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-blue-400" />
            Cross-Market Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MARKETS.map(market => {
              const price = market.id === 'xrp' ? xrpPrice : multiPrices?.[market.id];
              const hist = market.id === 'xrp' ? priceHistory : (multiPriceHistory?.[market.id] || []);
              const change = hist.length >= 2
                ? ((hist[hist.length - 1]?.price - hist[0]?.price) / hist[0]?.price) * 100
                : null;
              const { bg, text, label } = getColor(price ? change : null);
              return (
                <div key={market.id} className={`${bg} rounded-xl p-4 flex flex-col gap-1 transition-colors duration-500`}>
                  <div className="text-xs text-gray-400 font-medium">{market.category}</div>
                  <div className={`text-base font-bold ${text}`}>{market.label}</div>
                  <div className={`text-2xl font-black ${text}`}>{label}</div>
                  <div className="text-xs text-gray-400">
                    {price
                      ? (price < 0.01 ? `$${price.toFixed(6)}` : price > 1000 ? `$${price.toFixed(0)}` : `$${price.toFixed(4)}`)
                      : 'Pending'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400 pt-2 border-t border-gray-700/50">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-700 inline-block" /> Strong up (&gt;+0.5%)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-900 inline-block" /> Mild up</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-700 inline-block" /> Neutral</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900 inline-block" /> Mild down</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-700 inline-block" /> Strong down (&lt;-0.5%)</span>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Table */}
      <Card className="bg-gray-900/60 border-gray-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm">Session Change Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-1.5">
            {MARKETS.map(market => {
              const price = market.id === 'xrp' ? xrpPrice : multiPrices?.[market.id];
              const hist = market.id === 'xrp' ? priceHistory : (multiPriceHistory?.[market.id] || []);
              const change = hist.length >= 2
                ? ((hist[hist.length - 1]?.price - hist[0]?.price) / hist[0]?.price) * 100
                : null;
              const isUp = change !== null && change >= 0;
              return (
                <div key={market.id} className="flex items-center justify-between p-2 bg-gray-800/40 rounded-lg text-sm">
                  <span className="text-gray-300 font-medium w-32">{market.label}</span>
                  <div className="flex-1 mx-4 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    {change !== null && (
                      <div
                        className={`h-full rounded-full ${isUp ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.abs(change) * 50, 100)}%` }}
                      />
                    )}
                  </div>
                  <span className={`w-20 text-right font-mono text-xs ${change === null ? 'text-gray-600' : isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {change === null ? 'N/A' : `${isUp ? '+' : ''}${change.toFixed(3)}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}