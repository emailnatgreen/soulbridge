import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Unlock, Layers, Tag, Zap, ArrowRight, Wallet } from 'lucide-react';
import WidgetPurchaseDialog from '@/components/marketplace/WidgetPurchaseDialog';

const CATEGORY_COLORS = {
  wallet_management: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300' },
  did_management: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300' },
  governance: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300' },
  agent_creation: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300' },
  skill: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300' },
  environment: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-300' },
  training: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300' },
  other: { bg: 'bg-white/5', border: 'border-white/15', text: 'text-white/50' },
};

export default function WidgetMarketplaceCard({ widget }) {
  const owned = widget.is_owned;
  const catColor = CATEGORY_COLORS[widget.category] || CATEGORY_COLORS.other;
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  return (
    <Link
      to={`/widget-marketplace/${widget.id}`}
      className={`group block rounded-2xl border p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
        owned
          ? 'bg-gradient-to-br from-emerald-900/20 to-teal-900/10 border-emerald-500/30 hover:border-emerald-400/50'
          : 'bg-white/5 border-white/10 hover:border-purple-500/40'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        {widget.image_url ? (
          <img src={widget.image_url} alt={widget.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-white/10" />
        ) : (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            owned ? 'bg-emerald-500/20' : 'bg-purple-500/15'
          }`}>
            <Shield className={`w-5 h-5 ${owned ? 'text-emerald-400' : 'text-purple-400'}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate group-hover:text-purple-200 transition-colors">
            {widget.name}
          </h3>
          <p className="text-white/40 text-[10px] mt-0.5 font-mono">{widget.nft_id}</p>
        </div>
        {owned ? (
          <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex-shrink-0">
            <Unlock className="w-2.5 h-2.5" /> Owned
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/40 flex-shrink-0">
            <Lock className="w-2.5 h-2.5" /> Available
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-white/50 text-xs leading-relaxed line-clamp-2 mb-3">
        {widget.description}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {widget.category && (
          <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded ${catColor.bg} border ${catColor.border} ${catColor.text}`}>
            <Tag className="w-2.5 h-2.5" /> {widget.category.replace(/_/g, ' ')}
          </span>
        )}
        {widget.widget_type && (
          <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
            <Layers className="w-2.5 h-2.5" /> {widget.widget_type}
          </span>
        )}
        {widget.feature_path && (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/25">
            <Zap className="w-2.5 h-2.5" /> {widget.feature_path}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {!owned ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPurchaseOpen(true); }}
            className="flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold transition-all"
          >
            <Wallet className="w-2.5 h-2.5" /> Buy with RLUSD
          </button>
        ) : (
          <p className="text-white/30 text-[10px]">
            Unlocks: <span className="text-white/50">{widget.feature_path || 'Feature access'}</span>
          </p>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-purple-400 transition-colors" />
      </div>

      {/* Purchase Dialog */}
      <WidgetPurchaseDialog
        widget={widget}
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
      />
    </Link>
  );
}