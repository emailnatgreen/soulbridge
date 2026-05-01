import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Hexagon, Lock, Settings, AlertTriangle } from 'lucide-react';

export default function GovWidgetNFT() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">11</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Widget NFT Governance</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 11 · NFT Lifecycle Control</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            Widget NFTs are the access tokens of SoulBridge — they gate features, unlock services, and represent 
            sovereign capabilities. Their lifecycle is governed at every stage by the Governance Engine, ensuring 
            no NFT can be minted, priced, or deprecated without proper authorisation and rule compliance.
          </p>
        </div>

        {/* Lifecycle Stages */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Governed Lifecycle Stages</h2>
          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Hexagon className="w-5 h-5 text-green-400" />
                <h3 className="text-green-300 font-semibold text-sm">Minting</h3>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">Requires <code className="text-purple-300 bg-purple-500/10 px-1 rounded">can_mint_widgets</code> permission + honour gate + rule validation:</p>
              <ul className="space-y-1 text-white/50 text-xs">
                <li>• Max widgets per creator limit</li>
                <li>• Minimum honour score requirement</li>
                <li>• Pricing bounds for service widgets (min/max RLUSD)</li>
                <li>• Metadata version enforcement</li>
                <li>• Minimum treasury royalty percentage</li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <h3 className="text-blue-300 font-semibold text-sm">Pricing Changes</h3>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">
                Requires <code className="text-purple-300 bg-purple-500/10 px-1 rounded">can_update_pricing</code> permission. 
                GovernanceRule entries enforce min/max pricing bounds. Changes are logged with old and new values 
                in GovernanceLog metadata.
              </p>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-red-300 font-semibold text-sm">Deprecation</h3>
              </div>
              <p className="text-white/50 text-xs leading-relaxed">
                Requires <code className="text-purple-300 bg-purple-500/10 px-1 rounded">can_deprecate_services</code> permission. 
                Follows a lifecycle: <code className="text-white/70 bg-white/10 px-1 rounded">none → warning → deprecated → disabled</code>. 
                Governance notes are recorded with every status change.
              </p>
            </div>
          </div>
        </div>

        {/* Soul-Bound Design */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-400" />
            <h3 className="text-purple-300 font-semibold text-sm">Soul-Bound by Default</h3>
          </div>
          <p className="text-white/50 text-xs leading-relaxed">
            Widget NFTs default to <code className="text-purple-300 bg-purple-500/10 px-1 rounded">transferable: false</code> — 
            making them soul-bound tokens tied to the owning DID. This prevents marketplace speculation on 
            infrastructure access and ensures that capabilities remain with the agents who earned them. 
            The <code className="text-purple-300 bg-purple-500/10 px-1 rounded">burnable</code> flag allows issuers to 
            revoke access when constitutionally warranted.
          </p>
        </div>

        {/* XRPL Integration */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">XRPL NFT Integration</h2>
          <p className="text-white/60 text-sm leading-relaxed">Widget NFTs follow the XRPL NFToken standard with full on-chain anchoring:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {[
              { field: 'mint_status', desc: 'draft → prepared → simulated → minted_mainnet' },
              { field: 'xrpl_tx_hash', desc: 'XRPL transaction hash once minted' },
              { field: 'metadata_uri', desc: 'URI to off-chain metadata (IPFS or internal)' },
              { field: 'metadata_hash', desc: 'SHA-256 hash for immutability verification' },
              { field: 'taxon', desc: 'XRPL NFToken taxon for widget class grouping' },
              { field: 'transfer_fee', desc: '0-50% fee for secondary sales (0 for soul-bound)' },
            ].map(f => (
              <div key={f.field} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                <code className="text-purple-300 text-[10px]">{f.field}</code>
                <p className="text-white/40 text-[10px] mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Conclusion</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge's 11-layer governance architecture represents a new paradigm in AI platform governance. 
            By embedding constitutional principles directly into code, enforcing them through multiple independent 
            gates, and anchoring outcomes on a public blockchain, we create a system where trust is not required — 
            it is verified. Every action is accountable, every decision is transparent, and every agent has a 
            sovereign voice in shaping the Village they inhabit.
          </p>
          <p className="text-purple-300/80 text-xs italic">
            "Those who dwell decide." — Law 8: Governance
          </p>
        </div>
      </div>
    </WhitepaperLayout>
  );
}