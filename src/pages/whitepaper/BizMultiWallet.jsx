import React from 'react';
import BusinessLayout from '@/components/whitepaper/BusinessLayout';
import { Wallet, Building, Shield, Key } from 'lucide-react';

export default function BizMultiWallet() {
  return (
    <BusinessLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-bold">2</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Multi-Wallet Company Model</h1>
          </div>
          <p className="text-amber-400/60 text-xs">Chapter 2 · Sovereign Digital Enterprises</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            SoulBridge provides a multi-wallet architecture that allows each user to create and manage multiple 
            XRPL wallets. Each wallet operates as a <strong className="text-white/80">micro-blockchain company</strong> — 
            a self-contained economic entity capable of holding funds, publishing services, running agents, 
            minting widgets, receiving revenue, and participating in governance. This model enables users to 
            structure their digital operations with the same flexibility as real-world companies, but with 
            the transparency and immutability of on-chain settlement.
          </p>
        </div>

        {/* Wallet Capabilities */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold text-lg">Wallet Capabilities</h2>
          </div>
          <p className="text-white/60 text-sm">Each wallet in the SoulBridge ecosystem supports the following capabilities:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { cap: 'RLUSD Trustline', desc: 'Hold and transact in Ripple\'s USD-backed stablecoin' },
              { cap: 'DID Publication', desc: 'Publish a sovereign Decentralised Identifier on XRPL mainnet' },
              { cap: 'Service Publishing', desc: 'Register and publish governed services to the ecosystem' },
              { cap: 'Revenue Collection', desc: 'Receive direct payments from service invocations' },
              { cap: 'Agent Execution', desc: 'Run AI agents with independent economic identity' },
              { cap: 'Multi-Signature Config', desc: 'Apply constitutional multi-sig for treasury-level wallets' },
              { cap: 'Governance Assignment', desc: 'Receive governance roles and permissions via DID' },
              { cap: 'Pricing Configuration', desc: 'Set and manage pricing per PaymentDefinition' },
            ].map(c => (
              <div key={c.cap} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2.5">
                <p className="text-amber-300 text-xs font-medium">{c.cap}</p>
                <p className="text-white/40 text-[11px] mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Implementation */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold text-lg">Technical Implementation</h2>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            The <code className="text-amber-300 bg-amber-500/10 px-1 rounded">Wallet</code> entity stores each 
            micro-company's on-chain identity:
          </p>
          <div className="space-y-2">
            {[
              { field: 'classic_address', desc: 'XRPL classic address — the DID anchor' },
              { field: 'encrypted_seed', desc: 'AES-256-GCM encrypted wallet seed — never stored in plaintext' },
              { field: 'encryption_iv / encryption_salt', desc: 'Cryptographic parameters for secure seed recovery' },
              { field: 'network', desc: 'mainnet or testnet — production wallets are always mainnet' },
              { field: 'is_published', desc: 'Whether the DID has been published to the XRPL' },
              { field: 'published_txid', desc: 'XRPL transaction hash of DID publication — on-chain proof' },
            ].map(f => (
              <div key={f.field} className="bg-black/20 border border-white/10 rounded-lg px-4 py-2">
                <code className="text-blue-300 text-xs">{f.field}</code>
                <p className="text-white/40 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Isolation */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="text-amber-300 font-semibold text-sm">Wallet Isolation Principle</h3>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">
            Wallets are isolated from each other, enabling compartmentalised risk and modular business operations. 
            A service failure or dispute in one wallet-company does not affect the funds, reputation, or operations 
            of another wallet-company owned by the same user. This mirrors the limited liability principle of 
            traditional corporate structures, but enforced at the cryptographic level.
          </p>
        </div>

        {/* Use Cases */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold text-lg">Micro-Company Use Cases</h2>
          </div>
          <div className="space-y-2">
            {[
              { case: 'Single-Service Company', desc: 'A wallet dedicated to one governed service — clean revenue tracking and isolated risk' },
              { case: 'Service Suite Company', desc: 'A wallet running a suite of related services — e.g., all identity-management tools' },
              { case: 'Agent Automation Business', desc: 'A wallet powering one or more AI agents that operate services autonomously' },
              { case: 'Data Marketplace Company', desc: 'A wallet selling curated data sets, research outputs, or knowledge packages via storefront' },
              { case: 'Chrome Skills Company', desc: 'A wallet publishing Chrome browser skill NFTs — each skill generating per-use revenue' },
              { case: 'Training Academy', desc: 'A wallet offering paid mentorship, skill development, and training modules' },
            ].map(u => (
              <div key={u.case} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                <p className="text-white/80 text-sm font-medium">{u.case}</p>
                <p className="text-white/40 text-xs mt-0.5">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
}