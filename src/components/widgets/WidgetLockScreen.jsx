import React from 'react';
import { Lock, Shield, ArrowRight, Sparkles, Tag, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * WidgetLockScreen
 * 
 * Shows when a user tries to access a feature that requires
 * a Widget NFT they don't own yet. Displays full metadata
 * driven by the Unlock Engine (never hardcoded).
 */
export default function WidgetLockScreen({
  widgetName,
  widgetDescription,
  nftId,
  featurePath,
  widgetType,
  category,
  uiBehavior,
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-5">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>

        {/* Title */}
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

        {/* Widget metadata card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-3">
          <p className="text-white/40 text-[10px] uppercase tracking-widest">Widget Details</p>
          
          {widgetDescription && (
            <p className="text-white/60 text-xs leading-relaxed">{widgetDescription}</p>
          )}

          {/* Metadata tags */}
          <div className="flex flex-wrap gap-1.5">
            {nftId && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
                {nftId}
              </span>
            )}
            {widgetType && (
              <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
                <Layers className="w-2.5 h-2.5" /> {widgetType}
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <Tag className="w-2.5 h-2.5" /> {category.replace(/_/g, ' ')}
              </span>
            )}
            {featurePath && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/30">
                {featurePath}
              </span>
            )}
          </div>
        </div>

        {/* Unlock explanation */}
        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/10 border border-purple-500/20 rounded-xl p-4 text-left space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <p className="text-purple-300 text-xs font-semibold">How to Unlock</p>
          </div>
          <p className="text-white/40 text-[10px] leading-relaxed">
            Widget NFTs are sovereign access tokens on the XRPL. To unlock this feature, 
            you need to own the corresponding Widget NFT. Widgets can be minted by the Village 
            Treasury, earned through contributions, or traded in the SoulBridge Marketplace.
          </p>
        </div>

        {/* Actions */}
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
            Powered by XRPL · Governed by the 11 Laws of Honour
          </p>
        </div>
      </div>
    </div>
  );
}