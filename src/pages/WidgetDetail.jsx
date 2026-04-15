import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Shield, ArrowLeft, Home, Lock, Unlock, Layers, Tag, Zap, Globe,
  ShoppingBag, Sparkles, ExternalLink, ChevronRight
} from 'lucide-react';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';

const FEATURE_ROUTE_MAP = {
  'wallet.multisig': '/ConstitutionalMultiSig',
  'wallet.custom_signatures': '/wallets',
  'wallet.trustlines': '/wallets',
  'wallet.publish_mainnet': '/DIDManager',
  'wallet.create': '/wallets',
  'wallet.node_setup': '/NodeCovenant',
  'wallet.did_linking': '/SovereignID',
};

export default function WidgetDetail() {
  const { id } = useParams();
  const { widgets, loading } = useWidgetUnlock();

  const widget = widgets.find(w => w.id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!widget) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <Shield className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white/40 text-sm">Widget not found.</p>
          <Link to="/widget-marketplace" className="text-xs text-purple-300 hover:text-purple-200 underline">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const owned = widget.is_owned;
  const featureRoute = FEATURE_ROUTE_MAP[widget.feature_path] || null;

  const axiMessage = `Hi Axi! I'm looking at the "${widget.name}" widget (${widget.nft_id}). Can you tell me more about what this widget does, how I can get it, and how it fits into the SoulBridge ecosystem? The feature path is ${widget.feature_path}.`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Nav */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-3 sm:px-6 py-2.5 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              owned ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-purple-500/20 border border-purple-500/30'
            }`}>
              <Shield className={`w-4 h-4 sm:w-5 sm:h-5 ${owned ? 'text-emerald-400' : 'text-purple-400'}`} />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-xs sm:text-base truncate">{widget.name}</h1>
              <p className="text-white/30 text-[9px] sm:text-xs font-mono truncate">{widget.nft_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Link to="/widget-marketplace"
              className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 h-7 sm:h-8 px-2 sm:px-3 rounded-md transition-colors">
              <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Marketplace</span>
            </Link>
            <Link to="/dashboard"
              className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs border border-white/20 bg-white/5 text-white hover:bg-white/10 h-7 sm:h-8 px-2 sm:px-3 rounded-md transition-colors">
              <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Status banner */}
        <div className={`rounded-2xl border p-5 ${
          owned
            ? 'bg-gradient-to-br from-emerald-900/30 to-teal-900/15 border-emerald-500/30'
            : 'bg-gradient-to-br from-purple-900/30 to-pink-900/15 border-purple-500/30'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              owned ? 'bg-emerald-500/20' : 'bg-purple-500/20'
            }`}>
              <Shield className={`w-7 h-7 ${owned ? 'text-emerald-400' : 'text-purple-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-white font-bold text-xl">{widget.name}</h2>
                {owned ? (
                  <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex-shrink-0">
                    <Unlock className="w-3 h-3" /> Owned
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex-shrink-0">
                    <Lock className="w-3 h-3" /> Not Owned
                  </span>
                )}
              </div>
              <p className="text-white/60 text-sm leading-relaxed">{widget.description}</p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Properties */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-400" /> Widget Properties
            </h3>
            <div className="space-y-2.5">
              <DetailRow label="Name" value={widget.name} />
              <DetailRow label="NFT ID" value={widget.nft_id} mono />
              <DetailRow label="Category" value={(widget.category || '').replace(/_/g, ' ')} />
              <DetailRow label="Widget Type" value={widget.widget_type} />
              <DetailRow label="Widget Class" value={widget.widget_class || widget.widget_type} />
              <DetailRow label="UI Behavior" value={widget.ui_behavior} />
              <DetailRow label="Feature Path" value={widget.feature_path} mono />
            </div>
          </div>

          {/* Access info */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" /> Access Information
            </h3>
            <div className="space-y-2.5">
              <DetailRow label="Status" value={owned ? 'Owned — Unlocked' : 'Not Owned — Locked'} highlight={owned ? 'emerald' : 'amber'} />
              <DetailRow label="Unlocks" value={widget.feature_path || 'Feature access'} />
              <DetailRow label="Requires" value="None (Phase 1)" />
              <DetailRow label="Deprecation" value={widget.deprecation_status || 'none'} />
              <DetailRow label="Minted By" value="Village Treasury" />
            </div>

            {/* Action: go to feature if owned */}
            {owned && featureRoute && (
              <Link
                to={featureRoute}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl py-2.5 mt-2 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Go to Feature <ChevronRight className="w-3 h-3" />
              </Link>
            )}

            {/* Locked CTA */}
            {!owned && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2.5 mt-2">
                <p className="text-purple-300/70 text-[10px] leading-relaxed">
                  This widget can be earned through contributions, governance participation, or traded in the SoulBridge Marketplace when the Service Engine goes live.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* How Widget NFTs Work */}
        <div className="bg-gradient-to-br from-indigo-950/50 via-purple-950/40 to-pink-950/30 border border-purple-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">How Widget NFTs Work</h3>
              <p className="text-white/30 text-[10px]">Sovereign access tokens on the XRP Ledger</p>
            </div>
          </div>
          <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-2">
            {[
              'Your DID must be published on XRPL mainnet — this is your sovereign identity anchor.',
              'Widget NFTs are minted by the Village Treasury and bound to your DID address.',
              'Each Widget NFT grants access to a specific feature or capability.',
              'Once owned, the Widget Unlock Engine verifies your ownership each time you visit.',
              'Widgets can be earned through contributions, governance, or traded in the Marketplace.',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] text-purple-300 font-bold">
                  {i + 1}
                </span>
                <p className="text-white/50 text-xs leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ask Axi */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: axiMessage } }))}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl py-3 transition-all"
          >
            <Sparkles className="w-4 h-4" /> Ask Axi About This Widget
          </button>
          <Link
            to="/widget-marketplace"
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-purple-400/40 hover:bg-purple-500/10 text-white/70 hover:text-white text-sm rounded-xl py-3 px-6 transition-all"
          >
            <ShoppingBag className="w-4 h-4" /> Browse All Widgets
          </Link>
        </div>

        <p className="text-purple-300/20 text-[9px] text-center">
          Widget NFTs are sovereign access tokens on the XRP Ledger · Governed by the 11 Laws of Honour · Powered by XRPL
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono, highlight }) {
  const colorClass = highlight === 'emerald'
    ? 'text-emerald-300'
    : highlight === 'amber'
      ? 'text-amber-300'
      : 'text-white/70';

  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-white/40 text-xs flex-shrink-0">{label}</span>
      <span className={`text-xs text-right ${colorClass} ${mono ? 'font-mono' : ''} break-all`}>
        {value || '—'}
      </span>
    </div>
  );
}