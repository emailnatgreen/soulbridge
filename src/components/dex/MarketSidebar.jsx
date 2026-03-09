import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Crypto', value: 'crypto' },
  { label: 'FX', value: 'fx' },
  { label: 'Commodity', value: 'commodity' },
  { label: 'DeFi', value: 'defi' },
];

export default function MarketSidebar({ pairs, selectedPair, onSelect }) {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = pairs.filter(p => {
    const matchesTab = activeTab === 'all' || p.asset_class === activeTab;
    const matchesSearch = p.symbol.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="w-52 border-r border-gray-800 bg-[#0d1226] flex flex-col overflow-hidden shrink-0">
      {/* Search */}
      <div className="p-2 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3 h-3 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="w-full bg-gray-900 border border-gray-700 rounded text-xs text-white pl-6 pr-2 py-1.5 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-800">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              activeTab === tab.value
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Column Headers */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-gray-800/50">
        <span className="text-xs text-gray-600">Pair</span>
        <span className="text-xs text-gray-600">Price / 24h</span>
      </div>

      {/* Pairs List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map(pair => {
          const isUp = (pair.price_change_24h || 0) >= 0;
          const isSelected = selectedPair?.id === pair.id;
          return (
            <button
              key={pair.id}
              onClick={() => onSelect(pair)}
              className={`w-full px-3 py-2 flex items-center justify-between hover:bg-gray-800/40 transition-colors text-left border-b border-gray-800/30 ${
                isSelected ? 'bg-purple-900/30 border-l-2 border-l-purple-500' : ''
              }`}
            >
              <div>
                <div className="text-xs font-semibold text-white font-mono">{pair.symbol}</div>
                <div className="text-xs text-gray-600 capitalize">{pair.asset_class}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white font-mono">
                  {pair.current_price?.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                </div>
                <div className={`text-xs flex items-center justify-end gap-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                  {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {isUp ? '+' : ''}{pair.price_change_24h?.toFixed(2) || '0.00'}%
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-gray-600 text-xs mt-8 px-4">No markets found</div>
        )}
      </div>
    </div>
  );
}