import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Landmark, ArrowRight } from 'lucide-react';

export default function GovTreasury() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">10</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Treasury Governance</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 10 · Multi-Sig + Democratic Control</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The SoulBridge Treasury represents the collective financial resources of the Village. 
            It is the most heavily governed entity in the system, requiring the convergence of 
            multiple governance layers before any funds can be moved.
          </p>
        </div>

        {/* Treasury Allocation Flow */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Treasury Allocation Pipeline</h2>
          <p className="text-white/60 text-sm">Moving funds from the treasury requires passing through four governance layers in sequence:</p>
          <div className="space-y-3">
            {[
              { step: 1, title: 'Governance Proposal', desc: 'A treasury_allocation proposal must be created with recipient address, amount, and justification. Constitutional alignment required.', layer: 'Layer 3' },
              { step: 2, title: 'Democratic Vote', desc: 'The proposal must pass the configured quorum (default 50%) and pass threshold (default 60%) through Sybil-guarded voting.', layer: 'Layer 3' },
              { step: 3, title: 'Multi-Sig Signatures', desc: 'The 4 constitutional signers must provide quorum (4-of-7 weighted) via Xaman wallet signing. Signatures are collected in the proposal\'s action_data.', layer: 'Layer 2' },
              { step: 4, title: 'On-Chain Execution', desc: 'The signed transaction is submitted to XRPL mainnet. The tx hash is recorded in the proposal for permanent on-chain verification.', layer: 'Layer 2' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1">{s.step}</div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white/90 font-semibold text-sm">{s.title}</h3>
                    <span className="text-purple-400/60 text-[10px]">{s.layer}</span>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Splits */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold text-lg">Revenue Split Enforcement</h2>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            All service payments are distributed according to Law 3 (Fair Share) via the <code className="text-purple-300 bg-purple-500/10 px-1 rounded">PaymentDefinition</code> entity's royalties_config:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Treasury', pct: '50%', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
              { label: 'Creator', pct: '40%', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
              { label: 'Referral', pct: '10%', color: 'text-green-300 bg-green-500/10 border-green-500/20' },
              { label: 'Village Fee', pct: '1%', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
            ].map(s => (
              <div key={s.label} className={`${s.color} border rounded-lg p-3 text-center`}>
                <p className="text-xl font-bold">{s.pct}</p>
                <p className="text-[10px] mt-0.5 opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">These splits are enforced by GovernanceRule validation — the treasury_split must always total 100%, and the treasury share cannot drop below the configured minimum.</p>
        </div>

        {/* Financial Controls Integration */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 space-y-2">
          <h3 className="text-amber-300 font-semibold text-sm">Integration with Financial Controls (Layer 7)</h3>
          <p className="text-white/50 text-xs leading-relaxed">
            GovernanceLimits provide an additional safety net. Even after a proposal passes and signatures are 
            collected, per-node financial limits can trigger human approval requirements for high-value 
            allocations. This creates a four-layer defence: proposal → vote → limits → multi-sig.
          </p>
        </div>
      </div>
    </WhitepaperLayout>
  );
}