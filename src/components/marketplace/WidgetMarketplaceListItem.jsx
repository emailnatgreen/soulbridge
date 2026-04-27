import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Unlock, Layers, Tag, Zap, ArrowRight } from 'lucide-react';

export default function WidgetMarketplaceListItem({ widget }) {
  const owned = widget.is_owned;

  return (
    <Link
      to={`/widget-marketplace/${widget.id}`}
      className={`group flex items-center gap-4 rounded-xl border p-3 transition-all hover:scale-[1.01] ${
        owned
          ? 'bg-gradient-to-r from-emerald-900/15 to-teal-900/10 border-emerald-500/30 hover:border-emerald-400/50'
          : 'bg-white/5 border-white/10 hover:border-purple-500/40'
      }`}
    >
      {/* Icon */}
      {widget.image_url ? (
        <img src={widget.image_url} alt={widget.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-white/10" />
      ) : (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          owned ? 'bg-emerald-500/20' : 'bg-purple-500/15'
        }`}>
          <Shield className={`w-5 h-5 ${owned ? 'text-emerald-400' : 'text-purple-400'}`} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-white font-semibold text-sm truncate">{widget.name}</h3>
          <span className="text-white/20 text-[9px] font-mono flex-shrink-0">{widget.nft_id}</span>
        </div>
        <p className="text-white/40 text-xs truncate">{widget.description}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {widget.category && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
              {widget.category.replace(/_/g, ' ')}
            </span>
          )}
          {widget.widget_type && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
              {widget.widget_type}
            </span>
          )}
          {widget.feature_path && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/25">
              {widget.feature_path}
            </span>
          )}
        </div>
      </div>

      {/* Status + arrow */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {owned ? (
          <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
            <Unlock className="w-2.5 h-2.5" /> Owned
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/40">
            <Lock className="w-2.5 h-2.5" /> Available
          </span>
        )}
        <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-purple-400 transition-colors" />
      </div>
    </Link>
  );
}