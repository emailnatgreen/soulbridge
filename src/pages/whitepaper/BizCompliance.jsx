import React from 'react';
import { Link } from 'react-router-dom';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Shield, FileText, Scale, Eye } from 'lucide-react';

export default function BizCompliance() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">10</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Compliance & Economic Audit</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 10 · Regulatory Alignment & Auditability</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The Business Layer operates within a comprehensive compliance framework that spans from constitutional 
            governance enforcement to regulatory alignment with the UK Financial Services & Markets Act 2026 (FSMA). 
            Every economic transaction is auditable, every pricing change is governed, and every treasury movement 
            is multi-sig protected.
          </p>
        </div>

        {/* FSMA Alignment */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" /><h2 className="text-blue-300 font-semibold text-lg">UK FSMA 2026 Alignment</h2></div>
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge operates within UK FSMA 2026 guidelines during its pre-authorisation technical testing phase. 
            Key compliance measures include:
          </p>
          <ul className="space-y-1.5 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span><strong className="text-white/80">Stablecoin usage</strong> — RLUSD provides regulatory clarity vs speculative tokens</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span><strong className="text-white/80">Consumer protection</strong> — spending rate limits, balance checks, and faucet abuse prevention</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span><strong className="text-white/80">Transparent pricing</strong> — all pricing governance-validated and publicly visible</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span><strong className="text-white/80">Multi-sig treasury</strong> — no single actor controls collective funds</li>
            <li className="flex items-start gap-2"><span className="text-blue-400 mt-1">▸</span><strong className="text-white/80">Immutable audit trails</strong> — every transaction logged with full metadata</li>
          </ul>
        </div>

        {/* Audit Entities */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-amber-400" /><h2 className="text-white font-semibold text-lg">Economic Audit Entities</h2></div>
          <div className="space-y-2">
            {[
              { entity: 'EconomicActivity', desc: 'Records every economic event — earned, spent, traded, treasury deposits/withdrawals, resource transactions. Links to XRPL tx hash when on-chain.' },
              { entity: 'PaymentUsageLog', desc: 'Logs every service payment — amount, pricing model, billing behaviour, balance before/after, royalty split details. Full financial audit trail.' },
              { entity: 'ServiceUsageLog', desc: 'Tracks every service invocation — user DID, invocation type, status, duration, cost, error detail. Operational audit trail.' },
              { entity: 'MarketplaceTransaction', desc: 'Records every marketplace purchase — buyer/seller DIDs, payment method, distribution details, audit signature.' },
              { entity: 'StorefrontOrder', desc: 'Captures every storefront order — price snapshot, Village fee, seller receives, payment reference, buyer review.' },
              { entity: 'GovernanceLog', desc: 'Immutable log of every governance action affecting economic configuration — pricing changes, treasury splits, rule modifications.' },
            ].map(e => (
              <div key={e.entity} className="bg-black/20 border border-white/10 rounded-lg px-4 py-3">
                <code className="text-amber-300 text-xs font-bold">{e.entity}</code>
                <p className="text-white/40 text-xs mt-1">{e.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Governance Integration */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Scale className="w-5 h-5 text-green-400" /><h2 className="text-white font-semibold text-lg">Governance Layer Integration</h2></div>
          <p className="text-white/60 text-sm leading-relaxed">
            The Business Layer does not operate independently — it runs under the full authority of the 
            <Link to="/whitepaper/governance" className="text-purple-300 hover:text-purple-200 ml-1">11-layer Governance Architecture</Link>. 
            Every economic action passes through the Governance Engine's triple-gate enforcement:
          </p>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-center"><p className="text-blue-300 text-xs font-bold">Permission Gate</p><p className="text-white/30 text-[10px]">Role-based access</p></div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-center"><p className="text-amber-300 text-xs font-bold">Honour Gate</p><p className="text-white/30 text-[10px]">Minimum score</p></div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-center"><p className="text-green-300 text-xs font-bold">Rule Gate</p><p className="text-white/30 text-[10px]">Dynamic constraints</p></div>
          </div>
        </div>

        {/* Conclusion */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Conclusion</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            The SoulBridge Business Layer establishes a new paradigm in digital economics: a sovereign, 
            governed economy where individuals operate micro-blockchain companies, AI agents participate 
            as first-class economic citizens, and every transaction is constitutionally aligned, transparently 
            priced, and immutably recorded. With the DIDit fiat gateway making the ecosystem accessible 
            to non-crypto users, and the Sovereign Micropayments Protocol on the roadmap for autonomous 
            machine commerce, SoulBridge is building the economic infrastructure for the next generation 
            of human-AI collaboration.
          </p>
          <p className="text-amber-300/80 text-xs italic">"Value flows freely, with 1% to Village." — Law 6: Exchange</p>
        </div>
      </div>
    </BusinessLayout>
  );
}