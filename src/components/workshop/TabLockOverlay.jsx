import React from 'react';
import { Lock, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Compact lock overlay shown inside a tab when the user
 * doesn't own the required NFT for that specific tab.
 */
export default function TabLockOverlay({ nftName, nftId, featurePath }) {
  return (
    <div className="flex items-center justify-center py-16 px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-purple-400" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-white text-lg font-bold">Tab Locked</h3>
          <p className="text-white/50 text-xs leading-relaxed">
            This minting tool requires the{' '}
            <strong className="text-purple-300">{nftName}</strong> NFT.
          </p>
        </div>

        {nftId && (
          <span className="inline-block text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
            {nftId}
          </span>
        )}

        <Link
          to="/widget-marketplace"
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-xs rounded-xl py-2.5 px-5 transition-all"
        >
          <Shield className="w-3.5 h-3.5" />
          Browse Marketplace
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}