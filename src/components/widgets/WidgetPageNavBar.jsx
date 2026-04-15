import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Shield, Unlock, Lock } from 'lucide-react';

/**
 * WidgetPageNavBar
 * 
 * Shared navigation bar for all widget-gated pages.
 * Shows back-to-dashboard, home link, page title, and widget unlock status.
 * 
 * Props:
 *   title - Page title
 *   subtitle - Optional subtitle text
 *   icon - Lucide icon component
 *   isUnlocked - Whether the widget for this page is owned
 *   widgetName - Name of the required widget NFT
 *   nftId - NFT identifier
 */
export default function WidgetPageNavBar({
  title,
  subtitle,
  icon: Icon = Shield,
  isUnlocked,
  widgetName,
  nftId,
}) {
  return (
    <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-3 sm:px-6 py-2.5 sticky top-0 z-20">
      <div className="flex items-center justify-between gap-2 max-w-6xl mx-auto">
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-xs sm:text-base truncate">{title}</h1>
            {subtitle && (
              <p className="text-purple-400/60 text-[9px] sm:text-xs truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Navigation + Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Widget status badge */}
          {isUnlocked !== undefined && (
            <span className={`hidden sm:inline-flex items-center gap-1 text-[9px] px-2 py-1 rounded-full border ${
              isUnlocked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {isUnlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {widgetName || (isUnlocked ? 'Unlocked' : 'Locked')}
            </span>
          )}

          <Link to="/dashboard"
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 h-7 sm:h-8 px-2 sm:px-3 rounded-md transition-colors">
            <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <Link to="/home"
            className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs border border-white/20 bg-white/5 text-white hover:bg-white/10 h-7 sm:h-8 px-2 sm:px-3 rounded-md transition-colors">
            <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}