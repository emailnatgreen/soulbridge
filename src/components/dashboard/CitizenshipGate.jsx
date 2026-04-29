import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, ShoppingBag, Sparkles, Unlock, Tag, Layers, Zap, Wallet, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import WidgetPurchaseDialog from '@/components/marketplace/WidgetPurchaseDialog';

export default function CitizenshipGate({ identityDid, firstName }) {
  const navigate = useNavigate();
  const { widgets, loading: widgetsLoading } = useWidgetUnlock();
  const [search, setSearch] = useState('');

  const filteredWidgets = useMemo(() => {
    let list = widgets.filter(w =>
      !(w.nft_id || '').includes('TST') && w.mint_status !== 'failed'
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q) ||
        (w.nft_id || '').toLowerCase().includes(q)
      );
    }
    // Sort: citizenship first, then owned first, then by name
    list.sort((a, b) => {
      const aCit = (a.nft_id || '').includes('CIT') ? -1 : 0;
      const bCit = (b.nft_id || '').includes('CIT') ? -1 : 0;
      if (aCit !== bCit) return aCit - bCit;
      if (a.is_owned !== b.is_owned) return a.is_owned ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    return list;
  }, [widgets, search]);

  const ownedCount = widgets.filter(w => w.is_owned).length;

  return (
    <div className="space-y-5">

      {/* ── Welcome + Axi Card ──────────────────────────────── */}
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-500/40 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-slate-950" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg">
              {firstName ? `Welcome, ${firstName}` : 'Welcome to SoulBridge'} 🌟
            </h2>
            <p className="text-white/50 text-sm mt-1.5 leading-relaxed">
              Your DID is live — you're recognised. To unlock the full Village, acquire the <strong className="text-purple-300">Citizenship NFT</strong> from the marketplace. Chat with Axi if you need help!
            </p>
          </div>
        </div>

        {/* Axi quick-chat prompts */}
        <div className="mt-4 space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <p className="text-white/80 text-sm leading-relaxed">
                Hi{firstName ? ` ${firstName}` : ''}! 👋 I'm <strong className="text-purple-300">Axi</strong> — your guide to SoulBridge. I can help you understand the marketplace, acquire your Citizenship NFT, and explore the Village. What would you like to know?
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 ml-10">
            {[
              { label: 'How do I become a citizen? 🏡', msg: 'Hi Axi! How do I become a full citizen of SoulBridge? What is the Citizenship Widget NFT?' },
              { label: 'What can citizens do? ⚡', msg: 'What features do I unlock as a citizen in SoulBridge?' },
              { label: 'Help me get started 🚀', msg: 'I just published my DID — walk me through the next steps to get fully set up in SoulBridge.' },
            ].map(({ label, msg }) => (
              <button
                key={label}
                onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }))}
                className="text-left bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-400/40 rounded-xl px-3 py-2.5 text-xs text-white/60 hover:text-white transition-all"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-10">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', {
                detail: { message: `Hi Axi! I'm new here and just published my DID. Can you give me a personal welcome and explain what I should do next?` }
              }))}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm rounded-xl px-4 py-2.5 transition-all"
            >
              <Sparkles className="w-4 h-4" /> Open chat with Axi
            </button>
          </div>
        </div>
      </div>

      {/* ── Widget Marketplace ──────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <h3 className="text-white font-semibold text-sm">Widget Marketplace</h3>
          </div>
          <Link to="/widget-marketplace" className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search widgets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
        />

        {/* Grid */}
        {widgetsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <span className="ml-3 text-white/40 text-sm">Loading widgets…</span>
          </div>
        ) : filteredWidgets.length === 0 ? (
          <div className="text-center py-10">
            <Shield className="w-8 h-8 text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-xs">No widgets match your search.</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-purple-300 hover:text-purple-200 underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredWidgets.map(w => (
              <CitizenshipWidgetCard key={w.id} widget={w} />
            ))}
          </div>
        )}

        <p className="text-center text-white/20 text-[10px]">{ownedCount} of {widgets.length} widgets activated</p>
      </div>
    </div>
  );
}

// ── Widget Card with clear Activated / Buy button ────────────

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

function CitizenshipWidgetCard({ widget }) {
  const owned = widget.is_owned;
  const catColor = CATEGORY_COLORS[widget.category] || CATEGORY_COLORS.other;
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const isCitizenship = (widget.nft_id || '').includes('CIT');

  return (
    <div className={`rounded-2xl border p-4 transition-all ${
      owned
        ? 'bg-gradient-to-br from-emerald-900/20 to-teal-900/10 border-emerald-500/30'
        : isCitizenship
          ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-purple-500/40 ring-1 ring-purple-500/20'
          : 'bg-white/5 border-white/10'
    }`}>
      {/* Citizenship highlight badge */}
      {isCitizenship && !owned && (
        <div className="mb-2">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold">
            ⭐ Required for Citizenship
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
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
          <h3 className="text-white font-semibold text-sm truncate">{widget.name}</h3>
          <p className="text-white/30 text-[10px] font-mono">{widget.nft_id}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-white/50 text-xs leading-relaxed line-clamp-2 mb-3">{widget.description}</p>

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
      </div>

      {/* Action Button — clear state */}
      <div className="flex items-center gap-2">
        {owned ? (
          <Link
            to={`/widget-marketplace/${widget.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold hover:bg-emerald-500/30 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Activated
          </Link>
        ) : (
          <>
            <button
              onClick={() => setPurchaseOpen(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold transition ${
                isCitizenship
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                  : 'bg-white/10 hover:bg-purple-500/20 text-white/70 hover:text-white border border-white/10 hover:border-purple-500/30'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" /> Buy with RLUSD
            </button>
            <Link
              to={`/widget-marketplace/${widget.id}`}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 text-white/30 hover:text-purple-300 transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        )}
      </div>

      <WidgetPurchaseDialog widget={widget} open={purchaseOpen} onOpenChange={setPurchaseOpen} />
    </div>
  );
}