import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useIdentity } from '@/hooks/useIdentity';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, ShoppingCart, Filter, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import NFTCatalogueCard from '@/components/mysoulbridge/NFTCatalogueCard';
import BadgeShowcase from '@/components/mysoulbridge/BadgeShowcase';
import DashboardProgressRing from '@/components/mysoulbridge/DashboardProgressRing';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All NFTs' },
  { value: 'owned', label: 'Owned' },
  { value: 'locked', label: 'Locked' },
  { value: 'did_management', label: 'Identity' },
  { value: 'wallet_management', label: 'Wallet' },
  { value: 'skill', label: 'Skills' },
  { value: 'agent_creation', label: 'Agents' },
  { value: 'governance', label: 'Governance' },
];

export default function MySoulBridge() {
  const { isRecognized, isAdmin, isLoading: identityLoading, user } = useIdentity();
  const [filter, setFilter] = useState('all');

  // Fetch all widgets via the backend engine
  const { data: widgetData, isLoading: widgetsLoading } = useQuery({
    queryKey: ['my-soulbridge-widgets'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getOwnedWidgets', {});
      return res.data;
    },
    enabled: isRecognized,
  });

  // Fetch user's agent for badge showcase
  const { data: myAgents = [] } = useQuery({
    queryKey: ['my-agents-for-badges', user?.email],
    queryFn: () => base44.entities.Agent.filter({ created_by: user?.email }, '-created_date', 5),
    enabled: !!user?.email,
  });

  const allWidgets = widgetData?.all_widgets || [];
  const ownedPaths = new Set(widgetData?.unlocked_paths || []);

  // Filter out test widgets for non-admin, sort owned first
  const filteredWidgets = useMemo(() => {
    let list = allWidgets.filter(w => {
      // Hide test widgets for non-admin
      if (!isAdmin && (w.name?.toLowerCase().includes('test') || w.nft_id === 'WIDGET-TST-001')) return false;
      // Hide badge-only widgets (no feature_path and badge ui_behavior)
      if (w.ui_behavior === 'badge' && !isAdmin) return false;
      return true;
    });

    if (filter === 'owned') list = list.filter(w => w.is_owned);
    else if (filter === 'locked') list = list.filter(w => !w.is_owned);
    else if (!['all', 'owned', 'locked'].includes(filter)) list = list.filter(w => w.category === filter);

    // Sort: owned first, then by name
    return list.sort((a, b) => {
      if (a.is_owned !== b.is_owned) return a.is_owned ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [allWidgets, filter, isAdmin]);

  const ownedCount = allWidgets.filter(w => w.is_owned && w.ui_behavior !== 'badge').length;
  const totalCount = allWidgets.filter(w => w.ui_behavior !== 'badge' && !(w.name?.toLowerCase().includes('test') || w.nft_id === 'WIDGET-TST-001')).length;

  if (identityLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isRecognized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Lock className="w-12 h-12 text-purple-500/50 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Connect to View</h1>
          <p className="text-slate-400 text-sm mb-4">Connect your DID on the landing page to see your personalised SoulBridge dashboard.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
            Go to Landing Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/home" className="text-slate-400 hover:text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                My SoulBridge
                <Sparkles className="w-5 h-5 text-purple-400" />
              </h1>
              <p className="text-slate-400 text-xs">Your NFT inventory · Build your personalised dashboard</p>
            </div>
          </div>
          <Link
            to="/widget-marketplace"
            className="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold px-3 py-2 rounded-xl transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Marketplace
          </Link>
        </div>

        {/* Progress Ring */}
        {!widgetsLoading && (
          <DashboardProgressRing owned={ownedCount} total={totalCount} />
        )}

        {/* Badge Showcase */}
        <BadgeShowcase agentId={myAgents?.[0]?.id} />

        {/* Explanation */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
          <p className="text-white text-sm font-medium mb-1">How it works</p>
          <p className="text-white/50 text-xs leading-relaxed">
            Each NFT below unlocks a specific feature of SoulBridge. The <strong className="text-amber-300">Sovereign Seed</strong> is the master key — 
            it unlocks everything. Or you can build your dashboard piece by piece, choosing only the features you need. 
            All infrastructure NFTs are <strong className="text-purple-300">soul-bound</strong> (non-transferable) and minted on XRPL mainnet.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
          <Filter className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition ${
                filter === opt.value
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
              }`}
            >
              {opt.label}
              {opt.value === 'owned' && ownedCount > 0 && (
                <span className="ml-1 text-green-300">{ownedCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* NFT Catalogue */}
        {widgetsLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredWidgets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <Lock className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No NFTs match this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWidgets.map(widget => (
              <NFTCatalogueCard
                key={widget.id}
                widget={widget}
                isOwned={widget.is_owned}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-white/15 text-[10px]">SoulBridge Living Republic · XRPL Mainnet · Soul-Bound NFTs</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/widget-marketplace" className="text-purple-400/50 hover:text-purple-300 text-[10px] transition">Marketplace</Link>
            <span className="text-white/10">·</span>
            <Link to="/dashboard" className="text-purple-400/50 hover:text-purple-300 text-[10px] transition">Dashboard</Link>
            <span className="text-white/10">·</span>
            <Link to="/home" className="text-purple-400/50 hover:text-purple-300 text-[10px] transition">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}