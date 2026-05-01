import React from 'react';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Hexagon, Key, Repeat, ShoppingBag } from 'lucide-react';

export default function BizWidgetEconomy() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">7</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Widget NFT Economy</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 7 · Access Tokens as Economic Instruments</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            Widget NFTs serve dual roles in the SoulBridge economy: as <strong className="text-white/80">access tokens</strong> that 
            gate services and features, and as <strong className="text-white/80">economic instruments</strong> that generate 
            revenue through streaming micro-payments. The two widget classes — <code className="text-amber-300 bg-amber-500/10 px-1 rounded">service</code> and 
            <code className="text-amber-300 bg-amber-500/10 px-1 rounded ml-1">unlock</code> — create distinct economic models.
          </p>
        </div>

        {/* Two Classes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2"><Repeat className="w-5 h-5 text-amber-400" /><h3 className="text-amber-300 font-semibold text-sm">Service Widgets</h3></div>
            <p className="text-white/50 text-xs leading-relaxed">Active, streaming economic units that charge per interval. Owning the NFT grants access; the service continuously generates revenue through micro-payments.</p>
            <div className="space-y-1 text-[11px]">
              <p className="text-white/40"><strong className="text-white/60">cost_per_stream_interval</strong> — RLUSD per tick</p>
              <p className="text-white/40"><strong className="text-white/60">stream_interval_unit</strong> — second / minute / hour / day</p>
              <p className="text-white/40"><strong className="text-white/60">royalties_config</strong> — treasury / creator / referral split</p>
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2"><Key className="w-5 h-5 text-blue-400" /><h3 className="text-blue-300 font-semibold text-sm">Unlock Widgets</h3></div>
            <p className="text-white/50 text-xs leading-relaxed">Passive feature-access tokens. Owning the NFT unlocks a specific platform feature permanently (or until the NFT is burned). No recurring charges.</p>
            <div className="space-y-1 text-[11px]">
              <p className="text-white/40"><strong className="text-white/60">feature_path</strong> — internal feature identifier</p>
              <p className="text-white/40"><strong className="text-white/60">ui_behavior</strong> — toggle / unlock_page / badge / activate_feature</p>
              <p className="text-white/40"><strong className="text-white/60">One-time purchase</strong> — via marketplace or activation code</p>
            </div>
          </div>
        </div>

        {/* Purchase Channels */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-green-400" /><h2 className="text-white font-semibold text-lg">Purchase Channels</h2></div>
          <div className="space-y-2">
            {[
              { channel: 'Widget Marketplace', desc: 'In-platform marketplace where users browse, compare, and purchase Widget NFTs with RLUSD' },
              { channel: 'DIDit Bridge', desc: 'Retail-facing purchase via PayPal fiat — generates an ActivationCode for redemption in SoulBridge' },
              { channel: 'Activation Codes', desc: 'Pre-generated codes (SB-XXXX-XXXX-XXXX) that can be purchased externally and redeemed for NFT access' },
              { channel: 'Direct Minting', desc: 'Governance-authorised minting via the NFT Workshop — requires can_mint_widgets permission' },
            ].map(c => (
              <div key={c.channel} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                <p className="text-white/80 text-sm font-medium">{c.channel}</p>
                <p className="text-white/40 text-xs mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Activation Code Flow */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Activation Code Economy</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            The <code className="text-amber-300 bg-amber-500/10 px-1 rounded">ActivationCode</code> entity bridges 
            fiat payments to NFT access. When a user pays via PayPal through DIDit, the system generates a 
            unique code that can be redeemed in SoulBridge to unlock the corresponding Widget NFT:
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {['PayPal Payment → DIDit', 'Code Generated (SB-XXXX)', 'Code Delivered to Buyer', 'Buyer Redeems in SoulBridge', 'Widget NFT Activated', 'MarketplaceTransaction Logged'].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{s}</span>
                {i < 5 && <span className="text-white/20">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}