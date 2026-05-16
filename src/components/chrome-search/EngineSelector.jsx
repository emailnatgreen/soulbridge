import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Search, TrendingUp, Shield, BarChart3 } from 'lucide-react';
import EngineVisualState, { getEngineVisualState, stateConfig } from './EngineVisualState';

function EngineCard({ nft, isSelected, onSelect }) {
  const state = getEngineVisualState(nft);
  const config = stateConfig[state];
  const biasIndex = nft.bias_index ?? 0;
  const safetyIntegrity = nft.safety_integrity ?? 100;
  const alignment = nft.result_alignment_score ?? 0;
  const totalSearches = nft.total_searches ?? 0;

  return (
    <motion.button
      onClick={() => onSelect(nft)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-200',
        isSelected
          ? 'bg-slate-800/80 border-teal-500/50 shadow-lg shadow-teal-500/10'
          : 'bg-slate-900/40 border-slate-700/40 hover:border-slate-600/60'
      )}
    >
      <div className="flex items-center gap-3">
        <EngineVisualState nft={nft} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{nft.token_id}</span>
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', config.textColor, `bg-slate-800`)}>
              {config.label}
            </span>
            {isSelected && <Check className="w-4 h-4 text-teal-400 ml-auto shrink-0" />}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {nft.owner_did?.slice(0, 12)}...{nft.owner_did?.slice(-6)}
          </p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-700/40">
        <div className="text-center">
          <TrendingUp className="w-3 h-3 text-teal-400 mx-auto mb-0.5" />
          <p className="text-xs text-slate-400">{Math.round(alignment * 100)}%</p>
          <p className="text-[10px] text-slate-600">Alignment</p>
        </div>
        <div className="text-center">
          <Shield className="w-3 h-3 text-emerald-400 mx-auto mb-0.5" />
          <p className="text-xs text-slate-400">{Math.round(safetyIntegrity)}</p>
          <p className="text-[10px] text-slate-600">Safety</p>
        </div>
        <div className="text-center">
          <BarChart3 className="w-3 h-3 text-amber-400 mx-auto mb-0.5" />
          <p className="text-xs text-slate-400">{biasIndex.toFixed(2)}</p>
          <p className="text-[10px] text-slate-600">Bias</p>
        </div>
        <div className="text-center">
          <Search className="w-3 h-3 text-slate-400 mx-auto mb-0.5" />
          <p className="text-xs text-slate-400">{totalSearches}</p>
          <p className="text-[10px] text-slate-600">Searches</p>
        </div>
      </div>
    </motion.button>
  );
}

export default function EngineSelector({ engines, selectedEngine, onSelect, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-28 bg-slate-900/40 border border-slate-700/30 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!engines?.length) {
    return (
      <div className="text-center py-8 px-4 bg-slate-900/40 border border-slate-700/30 rounded-xl">
        <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No Search Engine NFTs found.</p>
        <p className="text-xs text-slate-500 mt-1">You need an ES-NFT to use the search engine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Your Search Engines</p>
      {engines.map(nft => (
        <EngineCard
          key={nft.id}
          nft={nft}
          isSelected={selectedEngine?.id === nft.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}