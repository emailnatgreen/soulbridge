import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Scale, AlertTriangle, Info, Ban } from 'lucide-react';

export default function GovRules() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">6</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Governance Rules Engine</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 6 · Dynamic, Configurable Rules</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The Rules Engine provides a dynamic constraint layer that can be modified without code changes. 
            Rules are stored as <code className="text-purple-300 bg-purple-500/10 px-1 rounded">GovernanceRule</code> entities 
            and evaluated in real-time by the Governance Engine during every action.
          </p>
        </div>

        {/* Rule Types */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Rule Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { type: 'widget_minting', desc: 'Controls who can mint, max per creator, pricing bounds, metadata version' },
              { type: 'widget_deprecation', desc: 'Governs when and how widgets can be deprecated' },
              { type: 'pricing', desc: 'Min/max RLUSD pricing for services' },
              { type: 'royalties', desc: 'Treasury split percentages, minimum treasury share' },
              { type: 'service_creation', desc: 'Constraints on new service registration' },
              { type: 'rate_limit', desc: 'API and action frequency limits' },
              { type: 'creator_onboarding', desc: 'Requirements for creator approval' },
              { type: 'role_management', desc: 'Constraints on role assignments' },
              { type: 'treasury', desc: 'Treasury spending limits and approvals' },
              { type: 'honor_threshold', desc: 'Minimum honour required per action type' },
              { type: 'general', desc: 'Catch-all for general governance constraints' },
            ].map(r => (
              <div key={r.type} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5">
                <code className="text-purple-300 text-xs">{r.type}</code>
                <p className="text-white/40 text-[11px] mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Enforcement Levels */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Enforcement Levels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
              <Ban className="w-5 h-5 text-red-400" />
              <h3 className="text-red-300 font-semibold text-sm">Hard</h3>
              <p className="text-white/50 text-xs">Blocks the action entirely. Returns a 403 error with the rule violation details. The action is not executed.</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-amber-300 font-semibold text-sm">Soft</h3>
              <p className="text-white/50 text-xs">Warns but allows the action to proceed. The warning is logged in GovernanceLog for review.</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
              <Info className="w-5 h-5 text-blue-400" />
              <h3 className="text-blue-300 font-semibold text-sm">Advisory</h3>
              <p className="text-white/50 text-xs">Logs the observation only. No warning shown to the user. Used for monitoring trends without disrupting operations.</p>
            </div>
          </div>
        </div>

        {/* Implemented Validations */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Active Validations</h2>
          <ul className="space-y-2 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><strong className="text-white/80">Max widgets per creator</strong> — prevents any single creator from minting beyond the configured limit</li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><strong className="text-white/80">Minimum honour for minting</strong> — honour gate integrated at the rule level with proper denial logging</li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><strong className="text-white/80">Pricing bounds</strong> — min/max RLUSD range for service widgets</li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><strong className="text-white/80">Minimum treasury royalty</strong> — ensures the Village always receives its constitutionally mandated share</li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><strong className="text-white/80">Metadata version enforcement</strong> — ensures all minted NFTs conform to the current metadata standard</li>
            <li className="flex items-start gap-2"><span className="text-purple-400 mt-1">▸</span><strong className="text-white/80">Treasury split total = 100%</strong> — royalty percentages must always sum correctly</li>
          </ul>
          <p className="text-white/40 text-xs">All rules are semantically versioned and can be modified via the <code className="text-purple-300 bg-purple-500/10 px-1 rounded">update_rule</code> governance action (requires <code className="text-purple-300 bg-purple-500/10 px-1 rounded">can_update_rules</code> permission).</p>
        </div>
      </div>
    </WhitepaperLayout>
  );
}