import React from 'react';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Globe, CreditCard, Smartphone, ArrowRight } from 'lucide-react';

export default function BizDIDit() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">8</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">DIDit & Fiat Payment Rails</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 8 · The Retail Gateway</p>
        </div>

        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">SoulBridge is the Infrastructure. DIDit is the Storefront.</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            DIDit is the public, consumer-facing sister application that provides a simplified interface for 
            onboarding, wallet creation, DID activation, service browsing, purchasing, agent activation, and 
            subscription management. It is designed for non-technical users and retail customers who may have 
            no prior experience with blockchain technology.
          </p>
        </div>

        {/* DIDit Functional Scope */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">DIDit Functional Scope</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-blue-400" /><h3 className="text-white/90 font-semibold text-sm">Wallet & Identity</h3></div>
              <ul className="text-white/50 text-xs space-y-1">
                <li>• XRPL wallet creation</li>
                <li>• RLUSD trustline setup</li>
                <li>• DID generation and verification</li>
                <li>• Multi-wallet management</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-green-400" /><h3 className="text-white/90 font-semibold text-sm">Payments</h3></div>
              <ul className="text-white/50 text-xs space-y-1">
                <li>• PayPal fiat payments</li>
                <li>• RLUSD on-chain payments</li>
                <li>• Service and widget purchases</li>
                <li>• Subscription billing</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-purple-400" /><h3 className="text-white/90 font-semibold text-sm">Marketplace</h3></div>
              <ul className="text-white/50 text-xs space-y-1">
                <li>• Browse services and widgets</li>
                <li>• Purchase with fiat or RLUSD</li>
                <li>• Activate agents</li>
                <li>• Manage subscriptions</li>
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-amber-400" /><h3 className="text-white/90 font-semibold text-sm">Dashboard</h3></div>
              <ul className="text-white/50 text-xs space-y-1">
                <li>• View balances and purchases</li>
                <li>• Manage micro-companies</li>
                <li>• Track revenue (for creators)</li>
                <li>• View transaction history</li>
              </ul>
            </div>
          </div>
        </div>

        {/* PayPal Rail */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 space-y-4">
          <h2 className="text-green-300 font-semibold text-lg">PayPal Fiat Rail</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            The PayPal rail enables users to purchase services, subscriptions, and widgets using fiat currency, 
            without requiring crypto knowledge, RLUSD holdings, XRPL familiarity, or wallet management. 
            This dramatically expands the accessible user base.
          </p>
          <div className="space-y-3">
            <h3 className="text-white/80 text-sm font-medium">Purchase Flow</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {['User browses DIDit', 'Selects product/service', 'Pays via PayPal (GBP/USD/EUR)', 'DIDit generates ActivationCode', 'Code redeemed in SoulBridge', 'Widget NFT activated'].map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className="px-2 py-1 rounded bg-green-500/10 text-green-300 border border-green-500/20">{s}</span>
                  {i < 5 && <span className="text-white/20">→</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg px-3 py-2">
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Key Principle</p>
            <p className="text-white/60 text-xs">The user never needs to interact with cryptocurrency directly. DIDit abstracts all blockchain complexity behind familiar PayPal checkout flows, whilst SoulBridge maintains full on-chain audit trails.</p>
          </div>
        </div>

        {/* Integration Architecture */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Technical Integration</h2>
          <p className="text-white/60 text-sm">The DIDit ↔ SoulBridge bridge is implemented through dedicated backend functions:</p>
          <div className="space-y-2">
            {[
              { fn: 'diditInitiatePurchase', desc: 'Initiates a purchase flow from DIDit with PayPal payment' },
              { fn: 'diditDeliverPurchase', desc: 'Delivers the purchased asset (generates ActivationCode or direct NFT)' },
              { fn: 'diditGetMarketplaceListings', desc: 'Syncs available listings from SoulBridge to DIDit' },
              { fn: 'diditGetTransactionHistory', desc: 'Returns purchase history for a DIDit user' },
              { fn: 'diditGetAgentProfile', desc: 'Exposes agent data to the retail interface' },
              { fn: 'generateActivationCode', desc: 'Creates SB-XXXX-XXXX-XXXX codes for fiat purchases' },
              { fn: 'redeemActivationCode', desc: 'Validates and activates codes in SoulBridge' },
            ].map(f => (
              <div key={f.fn} className="bg-black/20 border border-white/10 rounded-lg px-4 py-2">
                <code className="text-amber-300 text-xs">{f.fn}</code>
                <p className="text-white/40 text-[11px] mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}