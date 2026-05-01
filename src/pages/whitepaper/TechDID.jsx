import React from 'react';
import TechLayout from '@/components/whitepaper/TechLayout';
import { Fingerprint, Shield, Key, Globe } from 'lucide-react';

export default function TechDID() {
  return (
    <TechLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-bold">2</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">DID & Identity Architecture</h1>
          </div>
          <p className="text-cyan-400/60 text-xs">Chapter 2 · Sovereign Identity on XRPL</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            Every entity in SoulBridge — user, agent, wallet, and service — is anchored to a Decentralised Identifier (DID) published on XRPL mainnet. This creates a self-sovereign identity layer where no central authority controls who you are. The DID format is <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">did:xrpl:1:{`{classic_address}`}</code>, directly derived from the XRPL wallet address and verifiable by anyone on the public ledger.
          </p>
        </div>

        {/* Identity Stack */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Fingerprint className="w-5 h-5 text-purple-400" /><h2 className="text-white font-semibold text-lg">Identity Stack</h2></div>
          <div className="space-y-2">
            {[
              { layer: 'XRPL Wallet', desc: 'Foundation — classic_address, encrypted seed (AES-256-GCM), RLUSD trustline. Each wallet is an independent economic identity.', entity: 'Wallet' },
              { layer: 'DID Publication', desc: 'The wallet\'s classic_address is published as a DID on XRPL mainnet via the publishDID / publishDIDAuto backend functions. Transaction hash recorded for on-chain proof.', entity: 'Wallet.is_published + published_txid' },
              { layer: 'Xaman Integration', desc: 'Wallet signing, DID publication, and multi-sig operations use the Xaman (formerly Xumm) mobile app for secure key management. Users never expose private keys to the platform.', entity: 'xummSignDIDSet, xummSignIn' },
              { layer: 'Agent-DID Linking', desc: 'Agents are linked to wallets via wallet_id and classic_address. External wallets can be added via external_classic_addresses array, creating a multi-wallet identity graph.', entity: 'Agent' },
              { layer: 'Verifiable Credentials', desc: 'DIDs can issue and receive credentials — identity verification, skill certification, professional licences, achievements, and compliance attestations. Each credential carries cryptographic proof.', entity: 'DidCredential' },
              { layer: 'DID Health Monitoring', desc: 'Automated health checks detect anomalies — unpublished DIDs, missing trustlines, stale credentials, and permission misconfigurations.', entity: 'DidHealthAlert' },
            ].map(l => (
              <div key={l.layer} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white/90 font-semibold text-sm">{l.layer}</h3>
                  <span className="text-cyan-300/50 text-[10px] font-mono">{l.entity}</span>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* QuadShard DIDs */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-purple-400" /><h2 className="text-purple-300 font-semibold text-lg">QuadShard DIDs</h2></div>
          <p className="text-white/60 text-sm leading-relaxed">
            QuadShard DIDs are specialised multi-sig identities requiring four witness node signatures for activation. They represent high-trust infrastructure roles within the Village — such as the Code Node Storyteller — and undergo governance proposal review before activation.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { f: 'witness_nodes', d: 'Array of 4+ nodes required for activation' },
              { f: 'signatures_required / collected', d: 'Multi-sig progress tracking' },
              { f: 'activation_proposal_id', d: 'Linked governance proposal' },
              { f: 'verification_method', d: 'Multi-Sig_Consensus_Audit' },
            ].map(q => (
              <div key={q.f} className="bg-black/20 rounded-lg px-3 py-2">
                <code className="text-purple-300 text-[11px]">{q.f}</code>
                <p className="text-white/40 text-[10px] mt-0.5">{q.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Key className="w-5 h-5 text-green-400" /><h2 className="text-white font-semibold text-lg">Verifiable Credentials</h2></div>
          <p className="text-white/60 text-sm">The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">DidCredential</code> entity implements W3C-aligned verifiable credentials:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {['identity_verified', 'skill_certification', 'professional_license', 'educational_degree', 'membership', 'authorization', 'achievement', 'compliance_attestation'].map(t => (
              <div key={t} className="bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-1.5 text-center">
                <code className="text-green-300 text-[10px]">{t}</code>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">Each credential includes issuer DID, subject DID, cryptographic proof, issuance/expiration dates, revocation status, and configurable visibility (public/private/shared).</p>
        </div>

        {/* Privacy */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-400" /><h2 className="text-white font-semibold text-lg">Privacy by Design</h2></div>
          <ul className="space-y-1.5 text-white/60 text-sm">
            <li className="flex items-start gap-2"><span className="text-cyan-400 mt-1">▸</span><strong className="text-white/80">Wallet seeds encrypted</strong> with AES-256-GCM — never stored in plaintext</li>
            <li className="flex items-start gap-2"><span className="text-cyan-400 mt-1">▸</span><strong className="text-white/80">MWTP uses hashed identifiers</strong> — agent IDs are SHA-256 hashed in telemetry packets</li>
            <li className="flex items-start gap-2"><span className="text-cyan-400 mt-1">▸</span><strong className="text-white/80">DID privacy settings</strong> — configurable visibility per credential and per DID field</li>
            <li className="flex items-start gap-2"><span className="text-cyan-400 mt-1">▸</span><strong className="text-white/80">Zero-Knowledge Proofs</strong> — ZKProof entity supports proving attributes without revealing underlying data</li>
            <li className="flex items-start gap-2"><span className="text-cyan-400 mt-1">▸</span><strong className="text-white/80">Xaman key management</strong> — private keys never leave the user's device</li>
          </ul>
        </div>
      </div>
    </TechLayout>
  );
}