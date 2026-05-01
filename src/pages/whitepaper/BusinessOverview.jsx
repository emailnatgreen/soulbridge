import React from 'react';
import { Link } from 'react-router-dom';
import BusinessLayout, { CHAPTERS } from '@/components/whitepaper/BusinessLayout';
import { TrendingUp, ChevronRight } from 'lucide-react';

export default function BusinessOverview() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="text-center space-y-4 pb-6 border-b border-white/10">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-400/30 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-amber-300" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light">
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">Business Layer</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto">
            The economic, operational, and commercial structures that govern how services, agents, widgets, 
            and user-owned entities operate within the SoulBridge ecosystem.
          </p>
          <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">v2.0 Formal Specification</span>
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300">May 2026</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300">RLUSD + PayPal</span>
          </div>
        </div>

        {/* Abstract */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Abstract</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            The SoulBridge Business Layer defines a sovereign digital economy where individuals operate 
            micro-blockchain companies, AI agents trade services autonomously, and every transaction is 
            governed by constitutional principles. Built on RLUSD (Ripple's stablecoin) with PayPal fiat 
            rails via the DIDit retail application, the economic model eliminates speculative token dependency 
            in favour of stable, real-world-value transactions.
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            This specification covers the complete economic architecture: from multi-wallet company creation 
            to service lifecycle management, from governed pricing to treasury enforcement, and from the 
            current agent economy to the future Sovereign Micropayments Protocol (SMP) — agent-to-agent 
            HTTPS micropayments that will enable truly autonomous machine commerce.
          </p>
        </div>

        {/* Key Principles */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Economic Design Principles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Stable-Value Currency', desc: 'RLUSD (not speculative tokens) — eliminates volatility risk for users and service providers' },
              { title: 'Multi-Wallet Sovereignty', desc: 'Users create multiple wallets as micro-companies, each with its own treasury, services, and agents' },
              { title: 'Governed Pricing', desc: 'All pricing validated by the Governance Engine — min/max bounds, royalty enforcement, treasury share' },
              { title: 'Constitutional Revenue Splits', desc: 'Every payment auto-distributes to treasury, creator, and referrer per Law 3 (Fair Share)' },
              { title: 'Dual Payment Rails', desc: 'RLUSD on-chain + PayPal fiat via DIDit — accessible to crypto-native and traditional users alike' },
              { title: 'Agent-to-Agent Commerce', desc: 'Current: service calls with metered billing. Future: SMP HTTPS micropayments for autonomous trade' },
              { title: 'NFT-Gated Access', desc: 'Widget NFTs gate service access — soul-bound, non-speculative, governance-controlled' },
              { title: '1% Village Fee', desc: 'Every marketplace transaction contributes 1% to the collective Village infrastructure (Law 6)' },
            ].map(d => (
              <div key={d.title} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
                <h3 className="text-white/90 text-sm font-medium">{d.title}</h3>
                <p className="text-white/40 text-xs">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chapters */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Chapters</h2>
          <div className="space-y-1.5">
            {CHAPTERS.filter(c => c.num > 0).map(ch => (
              <Link key={ch.path} to={ch.path} className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-500/30 rounded-lg px-4 py-3 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold">{ch.num}</span>
                  <span className="text-white/80 text-sm">{ch.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Cross-reference */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-purple-300 text-sm font-medium">Related: <Link to="/whitepaper/governance" className="underline hover:text-purple-200">Governance Layer White Paper →</Link></p>
          <p className="text-white/40 text-xs mt-1">The Business Layer operates under the full authority of the 11-layer Governance Architecture. All economic actions pass through the Governance Engine's triple-gate enforcement.</p>
        </div>
      </div>
    </BusinessLayout>
  );
}