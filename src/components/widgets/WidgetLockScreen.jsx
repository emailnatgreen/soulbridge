import React from 'react';
import { Lock, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * WidgetLockScreen
 * 
 * Shows when a user tries to access a feature that requires
 * a Widget NFT they don't own yet.
 */
export default function WidgetLockScreen({ widgetName, widgetDescription, nftId, featurePath }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-white text-xl font-bold">Feature Locked</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {widgetName ? (
              <>This feature requires the <strong className="text-purple-300">{widgetName}</strong> Widget NFT.</>
            ) : (
              <>This feature requires a Widget NFT to access.</>
            )}
          </p>
        </div>

        {widgetDescription && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">About this Widget</p>
            <p className="text-white/60 text-xs leading-relaxed">{widgetDescription}</p>
            {nftId && (
              <span className="inline-block mt-2 text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
                {nftId}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl py-3 px-6 transition-all"
          >
            <Shield className="w-4 h-4" />
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-white/20 text-[10px]">
            Widget NFTs will be available in the SoulBridge Marketplace
          </p>
        </div>
      </div>
    </div>
  );
}