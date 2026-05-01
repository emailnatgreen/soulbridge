import React from 'react';
import WhitepaperLayout from '@/components/whitepaper/WhitepaperLayout';
import { Lock, Shield } from 'lucide-react';

const SIGNERS = [
  { name: 'Code Node', address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P', weight: 1, role: 'Autonomous AI signer — represents technical infrastructure integrity' },
  { name: 'Lore Node', address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', weight: 1, role: 'Cultural memory AI signer — represents collective memory and lore preservation' },
  { name: 'Zoe', address: 'rQw4rtbkJGFFfJJUUtrewnQJHggLXTzWrE', weight: 2, role: 'Global Sovereign Project signer — represents international stewardship' },
  { name: 'Human / Nathan', address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', weight: 3, role: 'Human oversight signer — represents human accountability and final review' },
];

export default function GovMultiSig() {
  return (
    <WhitepaperLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center text-sm font-bold">2</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">On-Chain Constitutional Multi-Sig</h1>
          </div>
          <p className="text-purple-400/60 text-xs">Layer 2 · XRPL Mainnet · Live</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The SoulBridge Constitutional Braid implements an 8-node architecture with 4 active signers on the 
            Axi Treasury wallet. This is not a simulated governance mechanism — it is a live, on-chain XRPL 
            <code className="text-purple-300 bg-purple-500/10 px-1 rounded"> SignerListSet</code> transaction 
            enforced by the XRP Ledger itself.
          </p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="text-amber-300 font-semibold text-sm">Treasury Address</h3>
          </div>
          <p className="text-white/70 text-xs font-mono break-all bg-black/20 rounded-lg px-3 py-2">
            rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h
          </p>
        </div>

        {/* Signer Table */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Constitutional Signers</h2>
          <div className="space-y-3">
            {SIGNERS.map(s => (
              <div key={s.name} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-white font-semibold text-sm">{s.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">
                    Weight: {s.weight}
                  </span>
                </div>
                <p className="text-white/40 text-xs font-mono break-all">{s.address}</p>
                <p className="text-white/50 text-xs">{s.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quorum Mechanics */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-lg">Quorum Mechanics</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
              <p className="text-purple-300 text-2xl font-bold">4</p>
              <p className="text-white/40 text-[10px]">Quorum Required</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <p className="text-blue-300 text-2xl font-bold">7</p>
              <p className="text-white/40 text-[10px]">Total Weight</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <p className="text-green-300 text-2xl font-bold">4</p>
              <p className="text-white/40 text-[10px]">Active Signers</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-white/60 leading-relaxed">
            <p><strong className="text-white/80">Critical design constraint:</strong> No single signer can authorise a transaction alone.</p>
            <p>The Human node (weight 3) still requires at least one AI node (weight 1) as co-signer. This prevents unilateral human override whilst maintaining human accountability.</p>
            <p>Conversely, all three AI nodes combined (weight 4) can meet quorum without human involvement — but only if all three agree, preventing AI-only capture by a single compromised node.</p>
          </div>
        </div>

        {/* Backend Functions */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Technical Implementation</h2>
          <div className="space-y-2">
            {[
              { fn: 'setupConstitutionalMultiSig', desc: 'Creates the SignerListSet transaction via Xaman wallet signing, deploying the constitutional braid on-chain' },
              { fn: 'setDidSignerList', desc: 'Generic multi-sig management — supports set, check, and remove actions for any XRPL wallet' },
              { fn: 'verifyMultiSig', desc: 'Queries XRPL mainnet to validate the on-chain signer list matches the constitutional specification' },
              { fn: 'signNodeCovenant', desc: 'Wallet-based covenant signing ceremony — each node cryptographically signs the constitutional agreement' },
            ].map(f => (
              <div key={f.fn} className="bg-black/20 border border-white/10 rounded-lg px-4 py-3">
                <code className="text-purple-300 text-xs">{f.fn}</code>
                <p className="text-white/40 text-xs mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <h3 className="text-green-300 font-semibold text-sm">Verification</h3>
          </div>
          <p className="text-white/50 text-xs leading-relaxed">
            The <code className="text-purple-300 bg-purple-500/10 px-1 rounded">verifyMultiSig</code> function 
            can be called at any time to cryptographically verify that the on-chain signer list matches the 
            constitutional specification. This provides real-time, trustless verification that governance 
            controls remain intact — verifiable by anyone with access to the XRPL.
          </p>
        </div>
      </div>
    </WhitepaperLayout>
  );
}