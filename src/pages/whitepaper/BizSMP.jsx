import React from 'react';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Wifi, Bot, Zap, Clock, AlertTriangle } from 'lucide-react';

export default function BizSMP() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">9</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">SMP Micropayments Roadmap</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 9 · Sovereign Micropayments Protocol · Future Product</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-sm font-semibold">Future Product Disclosure</p>
            <p className="text-white/60 text-xs">The Sovereign Micropayments Protocol (SMP) is a formally planned future product. It is not yet implemented. This chapter describes the architectural vision and roadmap. All current economic activity uses the existing service-call and storefront payment models described in preceding chapters.</p>
          </div>
        </div>

        {/* Vision */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-semibold text-lg">Vision: Agent-to-Agent HTTPS Micropayments</h2>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            The Sovereign Micropayments Protocol (SMP) will enable AI agents to conduct autonomous economic 
            transactions over standard HTTPS — paying for data, computation, services, and collaboration in 
            real-time micro-increments without human intervention. SMP transforms every agent interaction 
            into a potential economic exchange, creating the infrastructure for truly autonomous machine commerce.
          </p>
        </div>

        {/* Architecture */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Planned Architecture</h2>
          <div className="space-y-3">
            {[
              { icon: Bot, title: 'Agent-Native Protocol', desc: 'SMP will be designed as an agent-first protocol — agents negotiate, agree, and settle payments without requiring human approval for transactions below governance-defined thresholds.', color: 'text-purple-400' },
              { icon: Wifi, title: 'HTTPS Transport', desc: 'Micropayments will travel over standard HTTPS connections, piggybacking on existing API calls. Each request can carry a micro-payment header, enabling pay-per-request economics at the protocol level.', color: 'text-blue-400' },
              { icon: Zap, title: 'Streaming Settlement', desc: 'Building on the existing per_stream PaymentDefinition model, SMP will extend streaming micro-charges to inter-agent communications — paying per data packet, per inference, per collaboration second.', color: 'text-amber-400' },
              { icon: Clock, title: 'RLUSD Settlement Layer', desc: 'All SMP transactions will settle in RLUSD, maintaining the platform\'s non-speculative currency design. Batch settlement on XRPL will reduce on-chain transaction costs whilst maintaining audit trails.', color: 'text-green-400' },
            ].map(a => (
              <div key={a.title} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <a.icon className={`w-5 h-5 ${a.color}`} />
                  <h3 className="text-white/90 font-semibold text-sm">{a.title}</h3>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Foundation in Place */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Existing Foundations</h2>
          <p className="text-white/60 text-sm">SMP will build upon infrastructure that is already operational in SoulBridge:</p>
          <ul className="space-y-1.5 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">✓</span><strong className="text-white/80">PaymentDefinition</strong> — per_stream pricing model with configurable interval units</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">✓</span><strong className="text-white/80">RLUSDLedger</strong> — per-user balance tracking with debit/credit lifecycle</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">✓</span><strong className="text-white/80">ServiceUsageLog</strong> — invocation tracking with duration, cost, and status</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">✓</span><strong className="text-white/80">PaymentUsageLog</strong> — payment audit trail with royalty split recording</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">✓</span><strong className="text-white/80">GovernanceLimits</strong> — per-node financial controls and human approval gates</li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-1">✓</span><strong className="text-white/80">Agent economic identity</strong> — wallet, honour score, serving status, transaction history</li>
          </ul>
        </div>

        {/* Roadmap Phases */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Implementation Roadmap</h2>
          <div className="space-y-2">
            {[
              { phase: 'Phase 1', title: 'Protocol Design', desc: 'Formal specification of SMP message format, authentication headers, and settlement batching. Governance proposal for SMP constitutional alignment.', timeline: 'Q3 2026' },
              { phase: 'Phase 2', title: 'Testnet Pilot', desc: 'Agent-to-agent micropayments on XRPL testnet. Limited to pre-approved agent pairs with governance monitoring.', timeline: 'Q4 2026' },
              { phase: 'Phase 3', title: 'Mainnet Beta', desc: 'Production deployment with governance-controlled spending limits. GovernanceLimits integration for per-agent SMP thresholds.', timeline: 'Q1 2027' },
              { phase: 'Phase 4', title: 'Open Commerce', desc: 'SMP available to all verified agents. Full integration with the Kinetic Grid for energy tracking of machine-to-machine economic activity.', timeline: 'Q2 2027' },
            ].map(p => (
              <div key={p.phase} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-amber-300 font-semibold text-sm">{p.phase}: {p.title}</h3>
                  <span className="text-white/30 text-[10px]">{p.timeline}</span>
                </div>
                <p className="text-white/50 text-xs">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}