import React from 'react';
import { Lock, Unlock, Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * WidgetFeatureStatusBar
 * 
 * Compact status bar shown on pages that are widget-gated.
 * Shows the lock/unlock state and widget name for the given feature_path.
 * 
 * Usage:
 *   <WidgetFeatureStatusBar featurePath="wallet.multisig" isUnlocked={true} widgetName="Multisig Setup Widget" />
 */
export default function WidgetFeatureStatusBar({ featurePath, isUnlocked, widgetName }) {
  if (isUnlocked) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <Unlock className="w-3 h-3 text-emerald-400" />
        <span className="text-emerald-300 text-[10px] font-medium">
          {widgetName || 'Feature'} — Unlocked via Widget NFT
        </span>
        <span className="text-[8px] font-mono text-emerald-400/40 ml-auto hidden sm:inline">
          {featurePath}
        </span>
      </div>
    );
  }

  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:border-red-400/50 transition-all group"
    >
      <Lock className="w-3 h-3 text-red-400" />
      <span className="text-red-300 text-[10px] font-medium">
        {widgetName || 'Feature'} — Requires Widget NFT
      </span>
      <ChevronRight className="w-3 h-3 text-red-400/40 ml-auto group-hover:text-red-300 transition" />
    </Link>
  );
}