import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, ShoppingBag, ArrowRight, Sparkles, Users, Vote, BookOpen, Wallet, Zap, Unlock } from 'lucide-react';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import WidgetMarketplaceCard from '@/components/marketplace/WidgetMarketplaceCard';
import WidgetMarketplaceFilters from '@/components/marketplace/WidgetMarketplaceFilters';

const LOCKED_FEATURES = [
  { icon: Users, label: 'AI Agents', desc: 'Deploy sovereign AI agents' },
  { icon: Vote, label: 'Governance', desc: 'Vote & propose changes' },
  { icon: BookOpen, label: 'Skills Hub', desc: 'Develop expertise' },
  { icon: Wallet, label: 'Wallets', desc: 'Send & receive XRP' },
  { icon: Zap, label: 'Kinetic Grid', desc: 'Energy & motion' },
  { icon: Shield, label: 'Sovereign ID', desc: 'Your DID hub' },
];

export default function CitizenshipGate({ identityDid, firstName }) {
  const { widgets, loading: widgetsLoading } = useWidgetUnlock();

  // Marketplace filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [widgetType, setWidgetType] = useState('all');
  const [sort, setSort] = useState('name_asc');
  const [viewMode, setViewMode] = useState('grid');

  const filteredWidgets = useMemo(() => {
    let list = widgets.filter(w =>
      !(w.nft_id || '').includes('TST') &&
      w.mint_status !== 'failed'
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q) ||
        (w.nft_id || '').toLowerCase().includes(q)
      );
    }
    if (category !== 'all') list = list.filter(w => w.category === category);
    if (widgetType !== 'all') list = list.filter(w => w.widget_type === widgetType);
    list.sort((a, b) => {
      switch (sort) {
        case 'name_asc': return (a.name || '').localeCompare(b.name || '');
        case 'name_desc': return (b.name || '').localeCompare(a.name || '');
        case 'owned_first': return (b.is_owned ? 1 : 0) - (a.is_owned ? 1 : 0);
        case 'locked_first': return (a.is_owned ? 1 : 0) - (b.is_owned ? 1 : 0);
        default: return 0;
      }
    });
    return list;
  }, [widgets, search, category, widgetType, sort]);

  const ownedCount = widgets.filter(w => w.is_owned).length;
  const lockedCount = widgets.filter(w => !w.is_owned).length;

  return (
    <div className="space-y-5">
      {/* DID Active Banner */}
      <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-green-300 font-semibold text-sm">DID Published ✓</h3>
            <p className="text-green-200/40 text-xs">Your identity is live on XRPL</p>
          </div>
        </div>
        {identityDid && (
          <p className="text-green-200/30 font-mono text-[10px] truncate bg-black/20 px-3 py-1.5 rounded-lg border border-green-500/10">
            {identityDid}
          </p>
        )}
      </div>

      {/* Become a Citizen CTA */}
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/30 border border-purple-500/40 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">
              {firstName ? `Welcome, ${firstName}` : 'Welcome to SoulBridge'} 🌟
            </h2>
            <p className="text-white/50 text-sm mt-1 leading-relaxed">
              Your DID is published — you're recognised. To become a <strong className="text-purple-300">full citizen</strong> and unlock the Village Home &amp; features, acquire the <strong className="text-purple-300">Citizenship Widget NFT</strong> from the marketplace below.
            </p>
          </div>
        </div>

        <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-2">
          <p className="text-white/40 text-[10px] uppercase tracking-widest">What citizenship unlocks</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LOCKED_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2.5 opacity-50">
                <Icon className="w-4 h-4 text-white/30 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white/40 text-[10px] font-semibold">{label}</p>
                  <p className="text-white/20 text-[8px] truncate">{desc}</p>
                </div>
                <Lock className="w-3 h-3 text-white/20 flex-shrink-0 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Inline Marketplace ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <h3 className="text-white font-semibold text-sm">Widget Marketplace</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <Unlock className="w-2.5 h-2.5" /> {ownedCount} owned
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/40">
              <Lock className="w-2.5 h-2.5" /> {lockedCount} available
            </span>
          </div>
        </div>

        <WidgetMarketplaceFilters
          search={search} onSearchChange={setSearch}
          category={category} onCategoryChange={setCategory}
          widgetType={widgetType} onWidgetTypeChange={setWidgetType}
          sort={sort} onSortChange={setSort}
          viewMode={viewMode} onViewModeChange={setViewMode}
        />

        {widgetsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <span className="ml-3 text-white/40 text-sm">Loading widgets…</span>
          </div>
        ) : filteredWidgets.length === 0 ? (
          <div className="text-center py-10">
            <Shield className="w-8 h-8 text-white/15 mx-auto mb-2" />
            <p className="text-white/30 text-xs">No widgets match your filters.</p>
            <button onClick={() => { setSearch(''); setCategory('all'); setWidgetType('all'); }}
              className="mt-2 text-xs text-purple-300 hover:text-purple-200 underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredWidgets.map(w => (
              <WidgetMarketplaceCard key={w.id} widget={w} />
            ))}
          </div>
        )}
      </div>

      {/* Ask Axi */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Need help?</p>
          <p className="text-white/40 text-xs">Ask Axi about becoming a citizen</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', {
            detail: { message: 'Hi Axi! I\'ve just published my DID. How do I become a full citizen of SoulBridge? What is the Citizenship Widget NFT and how do I get it?' }
          }))}
          className="flex-shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
        >
          Ask Axi
        </button>
      </div>
    </div>
  );
}