import React from 'react';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Layers, Coins, Building2, Bot } from 'lucide-react';

export default function BizArchitecture() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">1</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Economic Architecture Overview</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 1 · The Four Pillars</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The SoulBridge economic model is built on four pillars that together create a self-sustaining, 
            governed digital economy. Each pillar is reinforced by the Governance Layer's triple-gate 
            enforcement, ensuring that economic activity remains constitutional, fair, and transparent.
          </p>
        </div>

        {/* Four Pillars */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <h2 className="text-amber-300 font-semibold text-lg">Pillar 1: Agentic Service Economy</h2>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Services are autonomous, governed micro-services that generate revenue through usage, subscriptions, 
              or per-action billing. Each service is defined by a <code className="text-amber-300 bg-amber-500/10 px-1 rounded">ServiceDefinition</code> entity 
              and paired with a <code className="text-amber-300 bg-amber-500/10 px-1 rounded">PaymentDefinition</code> that 
              configures pricing model, billing behaviour, rate limits, and royalty splits.
            </p>
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Service Execution Models</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {['one_shot', 'streaming', 'toggle', 'metered', 'scheduled'].map(m => (
                  <span key={m} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{m}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-blue-300 font-semibold text-lg">Pillar 2: Multi-Wallet Company Architecture</h2>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Users can create multiple XRPL wallets, each functioning as an independent operational unit — 
              a micro-blockchain company. Each wallet possesses its own treasury, services, agents, pricing, 
              governance assignments, and revenue streams. This architecture allows individuals to operate 
              like small, sovereign digital enterprises within the Village.
            </p>
            <p className="text-white/40 text-xs">
              Technically implemented via the <code className="text-blue-300 bg-blue-500/10 px-1 rounded">Wallet</code> entity 
              with per-wallet <code className="text-blue-300 bg-blue-500/10 px-1 rounded">classic_address</code>, 
              encrypted seed management, RLUSD trustline, and independent DID publication.
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-green-400" />
              <h2 className="text-green-300 font-semibold text-lg">Pillar 3: Governed Pricing & Treasury Enforcement</h2>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              All pricing and treasury configurations are validated by the Governance Layer to ensure fair 
              economics, sustainability, non-exploitative pricing, correct royalty splits, minimum treasury 
              share, and compliance with rule constraints. The Governance Engine evaluates every pricing 
              change against active <code className="text-green-300 bg-green-500/10 px-1 rounded">GovernanceRule</code> entries 
              before allowing execution.
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <h2 className="text-purple-300 font-semibold text-lg">Pillar 4: Agent-to-Agent Economic Interactions</h2>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Agents interact economically through service calls, data access fees, micro-subscriptions, 
              and per-action billing. This creates a dynamic, machine-driven economy where AI agents are 
              first-class economic participants — earning, spending, and trading autonomously within 
              constitutional bounds.
            </p>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 mt-2">
              <p className="text-purple-300 text-xs font-medium">Future: Sovereign Micropayments Protocol (SMP)</p>
              <p className="text-white/40 text-[11px]">Agent-to-agent HTTPS micropayments — enabling truly autonomous machine commerce. See Chapter 9.</p>
            </div>
          </div>
        </div>

        {/* Currency Design */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Currency Architecture</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge deliberately uses <strong className="text-white/80">RLUSD</strong> (Ripple's USD-backed stablecoin) 
            as its primary economic unit, not a speculative governance token. This is a constitutional design choice:
          </p>
          <ul className="space-y-1.5 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">▸</span><strong className="text-white/80">Price stability</strong> — services have predictable costs; revenue has predictable value</li>
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">▸</span><strong className="text-white/80">Non-speculative</strong> — no incentive to hoard, only to use — aligning with Law 6 (Exchange)</li>
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">▸</span><strong className="text-white/80">Regulatory clarity</strong> — stablecoins have clearer regulatory treatment under UK FSMA 2026</li>
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-1">▸</span><strong className="text-white/80">Fiat bridging</strong> — direct conversion path via PayPal through DIDit retail application</li>
          </ul>
          <p className="text-white/40 text-xs">XRP is used for XRPL transaction fees and legacy economic activity tracking. All new pricing is RLUSD-denominated.</p>
        </div>
      </div>
    </BusinessLayout>
  );
}