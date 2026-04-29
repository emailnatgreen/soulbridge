import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ShoppingBag, Shield, Lock, Unlock, Loader2, Wallet } from 'lucide-react';
import { useWidgetUnlock } from '@/hooks/useWidgetUnlock';
import WidgetPurchaseDialog from '@/components/marketplace/WidgetPurchaseDialog';

const CATEGORY_COLORS = {
  wallet_management: { color: 'from-indigo-600 to-purple-600', border: 'border-indigo-500/30' },
  did_management: { color: 'from-blue-600 to-cyan-600', border: 'border-blue-500/30' },
  governance: { color: 'from-amber-600 to-yellow-600', border: 'border-amber-500/30' },
  agent_creation: { color: 'from-purple-600 to-pink-600', border: 'border-purple-500/30' },
  skill: { color: 'from-rose-600 to-pink-600', border: 'border-rose-500/30' },
  environment: { color: 'from-teal-600 to-cyan-600', border: 'border-teal-500/30' },
  training: { color: 'from-green-600 to-emerald-600', border: 'border-green-500/30' },
  other: { color: 'from-orange-600 to-red-600', border: 'border-orange-500/30' },
};

function NFTCard({ widget, navigate }) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const owned = widget.is_owned;
  const cat = CATEGORY_COLORS[widget.category] || CATEGORY_COLORS.other;

  return (
    <>
      <button
        onClick={() => navigate(`/widget-marketplace/${widget.id}`)}
        className={`bg-gradient-to-br from-slate-900/80 to-slate-950/60 border ${cat.border} rounded-lg sm:rounded-2xl p-3 sm:p-4 text-left hover:scale-[1.02] hover:shadow-lg transition-all group`}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            {widget.image_url ? (
              <img src={widget.image_url} alt={widget.name} className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded" />
            ) : (
              <Shield className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="text-white font-semibold text-[10px] sm:text-sm truncate group-hover:text-purple-300 transition-colors">{widget.name}</h4>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="text-[7px] sm:text-[9px] bg-white/10 text-white/50 border-white/10 font-mono">
                {widget.nft_id}
              </Badge>
              {owned ? (
                <span className="flex items-center gap-0.5 text-[7px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                  <Unlock className="w-2 h-2" /> Owned
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[7px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/40">
                  <Lock className="w-2 h-2" />
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-white/40 text-[8px] sm:text-xs mt-2 sm:mt-3 leading-relaxed line-clamp-3">
          {widget.description}
        </p>

        <div className="flex items-center justify-between mt-2.5 sm:mt-3 pt-2 border-t border-white/5">
          {!owned ? (
            <span
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPurchaseOpen(true); }}
              className="flex items-center gap-1 text-[8px] sm:text-[10px] px-2 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold cursor-pointer hover:from-purple-500 hover:to-pink-500 transition-all"
            >
              <Wallet className="w-2.5 h-2.5" /> Buy with RLUSD
            </span>
          ) : (
            <span className="text-emerald-300/60 text-[8px] sm:text-[10px] font-medium">Unlocked</span>
          )}
          <span className="text-white/30 text-[7px] sm:text-[9px]">
            {(widget.category || '').replace(/_/g, ' ')}
          </span>
        </div>
      </button>

      <WidgetPurchaseDialog
        widget={widget}
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
      />
    </>
  );
}

export default function InfrastructureNFTShowcase() {
  const navigate = useNavigate();
  const { widgets, loading } = useWidgetUnlock();

  // Filter out test/seed widgets that shouldn't appear on the home page
  const HIDDEN_IDS = ['69e60cadaccafe13cef86af7', '69e4fe836df0fe16012698bd'];
  const mintedWidgets = widgets.filter(w => !HIDDEN_IDS.includes(w.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white/60 text-[8px] sm:text-xs uppercase tracking-widest flex items-center gap-2">
            <ShoppingBag className="w-3 h-3" /> Infrastructure NFTs
          </h3>
          <p className="text-white/30 text-[7px] sm:text-[10px] mt-0.5">
            {mintedWidgets.length} soul-bound NFTs that power the SoulBridge economy
          </p>
        </div>
        <Button
          onClick={() => navigate('/widget-marketplace')}
          variant="ghost"
          className="text-purple-400 hover:text-purple-300 text-[8px] sm:text-xs gap-1 h-7 sm:h-8 px-2"
        >
          Marketplace <ChevronRight className="w-3 h-3" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className="text-white/30 text-xs ml-2">Loading NFTs…</span>
        </div>
      ) : mintedWidgets.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-white/30 text-xs">No minted NFTs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {mintedWidgets.map(widget => (
            <NFTCard key={widget.id} widget={widget} navigate={navigate} />
          ))}
        </div>
      )}

      <div className="text-center pt-2">
        <Button
          onClick={() => navigate('/widget-marketplace')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-8 sm:h-10 gap-1.5 text-[9px] sm:text-xs px-4 sm:px-6"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Browse Full Marketplace
        </Button>
      </div>
    </div>
  );
}