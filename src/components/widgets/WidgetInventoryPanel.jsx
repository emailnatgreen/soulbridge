import React from 'react';
import { Lock, Unlock, Shield, Wallet, Globe, Link2, Server, KeyRound, PenTool, ArrowRight, Tag, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

const FEATURE_ICONS = {
  'wallet.multisig': Shield,
  'wallet.custom_signatures': PenTool,
  'wallet.trustlines': KeyRound,
  'wallet.publish_mainnet': Globe,
  'wallet.create': Wallet,
  'wallet.node_setup': Server,
  'wallet.did_linking': Link2,
};

function WidgetCard({ widget, routeMap }) {
  const Icon = FEATURE_ICONS[widget.feature_path] || Shield;
  const owned = widget.is_owned;
  const routeInfo = routeMap?.[widget.feature_path];
  const route = routeInfo?.route;

  const CardContent = (
    <div className={`relative rounded-xl border p-3 sm:p-4 transition-all ${
      owned
        ? 'bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border-emerald-500/40 hover:border-emerald-400/60'
        : 'bg-white/5 border-white/10 hover:border-white/20 opacity-70'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          owned ? 'bg-emerald-500/20' : 'bg-white/10'
        }`}>
          <Icon className={`w-4 h-4 ${owned ? 'text-emerald-400' : 'text-white/40'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-xs font-semibold truncate ${owned ? 'text-white' : 'text-white/50'}`}>
              {widget.name}
            </h4>
            {owned ? (
              <Unlock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            ) : (
              <Lock className="w-3 h-3 text-white/30 flex-shrink-0" />
            )}
          </div>
          <p className={`text-[10px] mt-0.5 leading-relaxed line-clamp-2 ${owned ? 'text-white/50' : 'text-white/30'}`}>
            {widget.description}
          </p>
        </div>
        {owned && route && (
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400/50 flex-shrink-0 mt-1" />
        )}
      </div>

      {/* Metadata tags */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
          owned
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-white/5 border-white/10 text-white/30'
        }`}>
          {widget.nft_id}
        </span>
        {widget.widget_type && (
          <span className={`inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded border ${
            owned ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-white/5 border-white/10 text-white/25'
          }`}>
            <Layers className="w-2 h-2" /> {widget.widget_type}
          </span>
        )}
        <span className={`text-[8px] px-1.5 py-0.5 rounded border ${
          owned
            ? 'bg-green-500/20 border-green-500/30 text-green-300'
            : 'bg-slate-500/20 border-slate-500/30 text-slate-400'
        }`}>
          {owned ? 'Unlocked' : 'Locked'}
        </span>
      </div>
    </div>
  );

  // If owned and has a route, make it clickable
  if (owned && route) {
    return <Link to={route}>{CardContent}</Link>;
  }
  return CardContent;
}

export default function WidgetInventoryPanel({ widgets, loading, routeMap }) {
  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          <span className="text-white/40 text-xs">Loading widgets…</span>
        </div>
      </div>
    );
  }

  const owned = widgets.filter(w => w.is_owned);
  const locked = widgets.filter(w => !w.is_owned);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Widget NFT Inventory</h3>
            <p className="text-white/40 text-[10px]">Wallet Management · Unlock Class</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
            {owned.length} owned
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/40">
            {locked.length} locked
          </span>
        </div>
      </div>

      {/* Unlocked Widgets */}
      {owned.length > 0 && (
        <div>
          <p className="text-emerald-300/60 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1">
            <Unlock className="w-3 h-3" /> Unlocked Features
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {owned.map(w => <WidgetCard key={w.id} widget={w} routeMap={routeMap} />)}
          </div>
        </div>
      )}

      {/* Locked Widgets */}
      {locked.length > 0 && (
        <div>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Requires Widget NFT
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {locked.map(w => <WidgetCard key={w.id} widget={w} routeMap={routeMap} />)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {widgets.length === 0 && (
        <div className="text-center py-6">
          <Shield className="w-8 h-8 text-white/15 mx-auto mb-2" />
          <p className="text-white/30 text-xs">No widgets available yet.</p>
        </div>
      )}

      {/* Info footer */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
        <p className="text-purple-300/60 text-[9px] leading-relaxed">
          Widget NFTs grant access to advanced dashboard features. Own the NFT → unlock the page. 
          Powered by XRPL · Governed by the 11 Laws of Honour.
        </p>
      </div>
    </div>
  );
}