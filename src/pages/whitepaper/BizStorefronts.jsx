import React from 'react';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Store, ShoppingCart, Star, CreditCard } from 'lucide-react';

export default function BizStorefronts() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">6</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Storefront Marketplace</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 6 · Sovereign Commerce</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The Storefront system enables any DID-verified user to create their own marketplace — selling products, 
            services, digital assets, NFTs, and subscriptions. Each storefront is a sovereign commercial entity 
            tied to the owner's DID, with built-in payment processing, order lifecycle management, and the 
            constitutionally mandated 1% Village fee (Law 6: Exchange).
          </p>
        </div>

        {/* Storefront Entity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Store className="w-5 h-5 text-amber-400" /><h2 className="text-white font-semibold text-lg">Storefront Structure</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { f: 'owner_did', d: 'DID-anchored ownership — cryptographically verifiable' },
              { f: 'payment_methods', d: 'Array: RLUSD_ON_XRPL and/or PAYPAL_FIAT — dual rails' },
              { f: 'honor_score_at_creation', d: 'Snapshot of owner honour when storefront was created — trust signal' },
              { f: 'total_sales / total_revenue_rlusd', d: 'Lifetime performance metrics — public credibility' },
              { f: 'average_rating / total_reviews', d: 'Buyer feedback system — reputation-linked' },
              { f: 'status', d: 'active / paused / suspended / archived — governance-controlled' },
            ].map(i => (
              <div key={i.f} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                <code className="text-amber-300 text-[11px]">{i.f}</code>
                <p className="text-white/40 text-[10px] mt-0.5">{i.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Listing Types */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-400" /><h2 className="text-white font-semibold text-lg">Listing Types</h2></div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {['product', 'service', 'digital_asset', 'nft', 'subscription'].map(t => (
              <div key={t} className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-center">
                <code className="text-blue-300 text-xs">{t}</code>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">Each listing supports configurable delivery methods: digital_download, api_key, manual_transfer, instant_access, or physical_shipping.</p>
        </div>

        {/* Order Lifecycle */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Order Lifecycle</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {['pending', 'paid', 'fulfilled', 'completed', 'cancelled', 'refunded', 'disputed'].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className="px-2 py-1 rounded bg-white/10 text-white/70 font-mono">{s}</span>
                {i < 6 && <span className="text-white/20">→</span>}
              </div>
            ))}
          </div>
          <p className="text-white/60 text-sm mt-2">Each order records:</p>
          <ul className="text-white/50 text-xs space-y-1">
            <li>• <strong className="text-white/70">Price snapshot</strong> at time of purchase (immutable)</li>
            <li>• <strong className="text-white/70">Village fee</strong> — 1% automatically calculated (Law 6)</li>
            <li>• <strong className="text-white/70">Seller receives</strong> — total minus Village fee</li>
            <li>• <strong className="text-white/70">Payment reference</strong> — XRPL tx hash or PayPal ID</li>
            <li>• <strong className="text-white/70">Buyer review</strong> — rating (1-5) and text review</li>
          </ul>
        </div>

        {/* 1% Village Fee */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-green-400" /><h3 className="text-green-300 font-semibold text-sm">The 1% Village Fee (Law 6: Exchange)</h3></div>
          <p className="text-white/60 text-sm leading-relaxed">
            Every storefront transaction carries a constitutionally mandated 1% Village fee, configured via 
            <code className="text-amber-300 bg-amber-500/10 px-1 rounded ml-1">village_fee_percent</code> on each listing. 
            This fee sustains collective infrastructure — it is not a platform extraction but a constitutional contribution. 
            The fee is automatically calculated on every <code className="text-amber-300 bg-amber-500/10 px-1 rounded">StorefrontOrder</code> and 
            recorded in <code className="text-amber-300 bg-amber-500/10 px-1 rounded">village_fee_rlusd</code>.
          </p>
        </div>
      </div>
    </BusinessLayout>
  );
}