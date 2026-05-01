import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Shield, Unlock, Loader2, ShoppingBag, Layers, ChevronRight, Sparkles } from 'lucide-react';

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

function VipNFTCard({ widget }) {
  const cat = CATEGORY_COLORS[widget.category] || CATEGORY_COLORS.other;

  return (
    <div className={`bg-gradient-to-br from-slate-900/80 to-slate-950/60 border ${cat.border} rounded-2xl p-4 text-left hover:scale-[1.01] transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
          {widget.image_url ? (
            <img src={widget.image_url} alt={widget.name} className="w-8 h-8 object-contain rounded" />
          ) : (
            <Shield className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-white font-semibold text-sm truncate">{widget.name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge className="text-[9px] bg-white/10 text-white/50 border-white/10 font-mono">
              {widget.nft_id}
            </Badge>
            <span className="flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
              <Unlock className="w-2 h-2" /> VIP Access
            </span>
          </div>
        </div>
      </div>

      <p className="text-white/40 text-xs mt-3 leading-relaxed line-clamp-3">
        {widget.description}
      </p>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
        <span className="text-emerald-300/60 text-[10px] font-medium flex items-center gap-1">
          <Unlock className="w-3 h-3" /> Full Access Granted
        </span>
        <div className="flex items-center gap-1.5">
          {widget.widget_type && (
            <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded border bg-blue-500/10 border-blue-500/30 text-blue-300">
              <Layers className="w-2 h-2" /> {widget.widget_type}
            </span>
          )}
          <span className="text-white/30 text-[9px]">
            {(widget.category || '').replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Service widget details */}
      {widget.widget_type === 'service' && widget.cost_per_stream_interval && (
        <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-1.5">
          <p className="text-purple-300/70 text-[9px]">
            Streaming: {widget.cost_per_stream_interval} RLUSD / {widget.stream_interval_unit}
          </p>
        </div>
      )}
    </div>
  );
}

export default function VipNFTShowcase({ inviteTokenId }) {
  const [widgets, setWidgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWidgets = async () => {
      try {
        const res = await base44.functions.invoke('vipDashboardProxy', {
          action: 'listWidgets',
          invite_token_id: inviteTokenId,
        });
        setWidgets(res.data?.widgets || []);
      } catch (e) {
        console.error('VIP widget fetch failed:', e);
      }
      setLoading(false);
    };
    fetchWidgets();
  }, [inviteTokenId]);

  const HIDDEN_IDS = ['69e60cadaccafe13cef86af7', '69e4fe836df0fe16012698bd'];
  const visibleWidgets = widgets.filter(w => !HIDDEN_IDS.includes(w.id));

  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Infrastructure NFTs</h3>
            <p className="text-purple-400/60 text-[10px]">All platform capabilities · VIP full access</p>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium">
          {visibleWidgets.length} NFTs · All Unlocked
        </span>
      </div>

      {/* VIP Access Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <div>
            <p className="text-amber-300 text-xs font-semibold">VIP Reviewer Access</p>
            <p className="text-white/50 text-[10px] mt-0.5">
              All NFT-gated features are unlocked for your review. Each NFT below represents a soul-bound token on XRPL that normally gates access to platform capabilities.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className="text-white/30 text-xs ml-2">Loading NFTs…</span>
        </div>
      ) : visibleWidgets.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-white/30 text-xs">No NFTs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleWidgets.map(widget => (
            <VipNFTCard key={widget.id} widget={widget} />
          ))}
        </div>
      )}

      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
        <p className="text-purple-300/60 text-[9px] leading-relaxed">
          Each NFT is a soul-bound token on XRPL that gates access to platform features via the Widget Economy. 
          Service NFTs stream micro-payments in RLUSD · Unlock NFTs grant permanent feature access · Governed by the 11 Laws of Honour.
        </p>
      </div>
    </div>
  );
}