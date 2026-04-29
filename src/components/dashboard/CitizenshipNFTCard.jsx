import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShoppingBag, Sparkles, ChevronRight } from 'lucide-react';
import WidgetPurchaseDialog from '@/components/marketplace/WidgetPurchaseDialog';

/**
 * Shows the Citizenship NFT (DID — Citizenship NFT) directly on the dashboard
 * for non-citizen users. Allows purchase or links to the marketplace.
 */

const CITIZENSHIP_NFT = {
  id: '69ef8c09637fa3b7f357d97b',
  name: 'DID — Citizenship NFT',
  nft_id: 'WIDGET-WM-007',
  description: 'The foundational entry point to SoulBridge civilisation. Unlocks the Sovereign Identity hub, governance, agents, skills, and the full Village.',
  image_url: 'https://base44.app/api/apps/699319649276f1077c1f2c81/files/mp/public/699319649276f1077c1f2c81/f4b0b95c3_1895.png',
  category: 'did_management',
  widget_type: 'unlock',
  feature_path: 'wallet.did_linking',
};

export default function CitizenshipNFTCard({ onPurchaseComplete }) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-500/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <img
            src={CITIZENSHIP_NFT.image_url}
            alt={CITIZENSHIP_NFT.name}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-amber-500/30"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-bold text-sm">{CITIZENSHIP_NFT.name}</h3>
              <span className="text-[8px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                Required
              </span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed">
              {CITIZENSHIP_NFT.description}
            </p>
            <p className="text-amber-300/50 text-[9px] font-mono mt-1">{CITIZENSHIP_NFT.nft_id}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setPurchaseOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm rounded-xl px-4 py-3 transition-all shadow-lg shadow-amber-500/20"
          >
            <Shield className="w-4 h-4" /> Acquire Citizenship NFT
          </button>
          <Link
            to="/widget-marketplace"
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white/70 hover:text-white text-sm rounded-xl px-4 py-3 transition-all"
          >
            <ShoppingBag className="w-4 h-4" /> Browse Marketplace <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <WidgetPurchaseDialog
        widget={CITIZENSHIP_NFT}
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
        onPurchaseComplete={onPurchaseComplete}
      />
    </>
  );
}