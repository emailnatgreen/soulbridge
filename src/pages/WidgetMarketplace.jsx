import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShoppingBag, Sparkles, ArrowLeft, Home, Unlock, Lock } from 'lucide-react';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import WidgetMarketplaceCard from '@/components/marketplace/WidgetMarketplaceCard';
import WidgetMarketplaceListItem from '@/components/marketplace/WidgetMarketplaceListItem';
import WidgetMarketplaceFilters from '@/components/marketplace/WidgetMarketplaceFilters';

export default function WidgetMarketplace() {
  const { widgets, loading } = useWidgetUnlock();

  // Filter / search / sort state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [widgetType, setWidgetType] = useState('all');
  const [sort, setSort] = useState('name_asc');
  const [viewMode, setViewMode] = useState('grid');

  // Derived filtered + sorted list
  const filteredWidgets = useMemo(() => {
    let list = [...widgets];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(w =>
        (w.name || '').toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q) ||
        (w.nft_id || '').toLowerCase().includes(q) ||
        (w.feature_path || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (category !== 'all') {
      list = list.filter(w => w.category === category);
    }

    // Type filter
    if (widgetType !== 'all') {
      list = list.filter(w => w.widget_type === widgetType);
    }

    // Sort
    list.sort((a, b) => {
      switch (sort) {
        case 'name_asc': return (a.name || '').localeCompare(b.name || '');
        case 'name_desc': return (b.name || '').localeCompare(a.name || '');
        case 'category': return (a.category || '').localeCompare(b.category || '');
        case 'type': return (a.widget_type || '').localeCompare(b.widget_type || '');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Navigation Bar */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl px-3 sm:px-6 py-2.5 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-xs sm:text-base truncate">Widget Marketplace</h1>
              <p className="text-purple-400/60 text-[9px] sm:text-xs truncate">Browse and discover NFT capabilities</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-[9px] px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <Unlock className="w-2.5 h-2.5" /> {ownedCount} owned
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[9px] px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/40">
              <Lock className="w-2.5 h-2.5" /> {lockedCount} available
            </span>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero section */}
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-lg sm:text-xl">SoulBridge Widget Marketplace</h2>
              <p className="text-white/50 text-sm mt-1 leading-relaxed">
                Browse all available Widget NFTs that unlock capabilities across the SoulBridge ecosystem.
                Each widget is a sovereign access token on the XRP Ledger — own the NFT, unlock the feature.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-emerald-300">
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{ownedCount} Owned</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{lockedCount} Available</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-purple-300">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{widgets.length} Total</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <WidgetMarketplaceFilters
          search={search} onSearchChange={setSearch}
          category={category} onCategoryChange={setCategory}
          widgetType={widgetType} onWidgetTypeChange={setWidgetType}
          sort={sort} onSortChange={setSort}
          viewMode={viewMode} onViewModeChange={setViewMode}
        />

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <span className="ml-3 text-white/40 text-sm">Loading widgets…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredWidgets.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No widgets match your filters.</p>
            <button onClick={() => { setSearch(''); setCategory('all'); setWidgetType('all'); }}
              className="mt-3 text-xs text-purple-300 hover:text-purple-200 underline">
              Clear filters
            </button>
          </div>
        )}

        {/* Widget grid/list */}
        {!loading && filteredWidgets.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWidgets.map(w => (
                <WidgetMarketplaceCard key={w.id} widget={w} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWidgets.map(w => (
                <WidgetMarketplaceListItem key={w.id} widget={w} />
              ))}
            </div>
          )
        )}

        {/* Ask Axi CTA */}
        <div className="bg-gradient-to-br from-indigo-950/50 via-purple-950/40 to-pink-950/30 border border-purple-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-white font-semibold text-sm">Need guidance?</p>
            <p className="text-white/40 text-xs">Ask Axi about how Widget NFTs work, how to earn them, and what they unlock.</p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-axi-with-message', {
              detail: { message: 'Hi Axi! I\'m browsing the Widget Marketplace. Can you explain how Widget NFTs work, how I can earn or acquire them, and what each one unlocks in SoulBridge?' }
            }))}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex-shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> Ask Axi
          </button>
        </div>

        {/* Footer */}
        <p className="text-purple-300/20 text-[9px] text-center">
          Widget NFTs are sovereign access tokens on the XRP Ledger · Governed by the 11 Laws of Honour · Powered by XRPL
        </p>
      </div>
    </div>
  );
}