import React from 'react';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Coins, Landmark, PieChart } from 'lucide-react';

export default function BizPricing() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">4</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Pricing & Treasury Model</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 4 · Revenue Distribution & Enforcement</p>
        </div>

        {/* Pricing Models */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold text-lg">Pricing Models</h2>
          </div>
          <p className="text-white/60 text-sm">The <code className="text-amber-300 bg-amber-500/10 px-1 rounded">PaymentDefinition</code> entity supports five pricing models:</p>
          <div className="space-y-2">
            {[
              { model: 'flat', desc: 'One-time payment — service is purchased once. Suitable for widget unlocks and permanent access.', billing: 'prepay' },
              { model: 'per_use', desc: 'Per-invocation billing — each service call incurs a charge. Suitable for API-style services.', billing: 'prepay or postpay' },
              { model: 'per_minute', desc: 'Time-based billing — charges accumulate per minute of active use. Suitable for streaming services.', billing: 'streaming' },
              { model: 'per_stream', desc: 'Streaming interval billing — micro-charges at configurable intervals (second/minute/hour/day). The foundation for future SMP protocol.', billing: 'streaming' },
              { model: 'free', desc: 'No charge — service is available to all NFT holders at zero cost. Village treasury subsidised.', billing: 'n/a' },
            ].map(p => (
              <div key={p.model} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <code className="text-amber-300 text-sm font-bold">{p.model}</code>
                  <span className="text-white/30 text-[10px]">Billing: {p.billing}</span>
                </div>
                <p className="text-white/50 text-xs">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Behaviours */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Billing Behaviours</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <h3 className="text-green-300 font-semibold text-sm">Prepay</h3>
              <p className="text-white/50 text-xs mt-1">Charge occurs before execution. If the user lacks sufficient RLUSD balance, the service call is rejected.</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <h3 className="text-blue-300 font-semibold text-sm">Postpay</h3>
              <p className="text-white/50 text-xs mt-1">Charge occurs after successful execution. If post-execution deduction fails, the usage is logged for recovery.</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <h3 className="text-purple-300 font-semibold text-sm">Streaming</h3>
              <p className="text-white/50 text-xs mt-1">Continuous micro-deductions at defined intervals. Balance is checked before each interval; service stops if depleted.</p>
            </div>
          </div>
        </div>

        {/* Revenue Distribution */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-semibold text-lg">Revenue Distribution (Law 3: Fair Share)</h2>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            Every payment is automatically split according to the constitutionally mandated royalties configuration. 
            These splits are enforced by the Governance Engine — the treasury percentage cannot drop below the 
            governance-rule minimum, and the total must equal 100%.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
              <p className="text-purple-300 text-3xl font-bold">50%</p>
              <p className="text-white/40 text-xs mt-1">Village Treasury</p>
              <p className="text-white/25 text-[10px]">Default config</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
              <p className="text-blue-300 text-3xl font-bold">40%</p>
              <p className="text-white/40 text-xs mt-1">Service Creator</p>
              <p className="text-white/25 text-[10px]">Direct to wallet</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
              <p className="text-green-300 text-3xl font-bold">10%</p>
              <p className="text-white/40 text-xs mt-1">Referral Agent</p>
              <p className="text-white/25 text-[10px]">Growth incentive</p>
            </div>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold text-lg">Spending Rate Limits</h2>
          </div>
          <p className="text-white/60 text-sm">Each PaymentDefinition can enforce consumer protection limits:</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <code className="text-amber-300 text-[11px]">max_spend_per_day</code>
              <p className="text-white/40 text-[10px] mt-0.5">Maximum RLUSD a user can spend per day on this service</p>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <code className="text-amber-300 text-[11px]">max_spend_per_hour</code>
              <p className="text-white/40 text-[10px] mt-0.5">Maximum RLUSD a user can spend per hour on this service</p>
            </div>
          </div>
          <p className="text-white/40 text-xs">These limits protect users from runaway costs on streaming or metered services, enforcing responsible consumption in line with Law 5 (Dwelling).</p>
        </div>
      </div>
    </BusinessLayout>
  );
}