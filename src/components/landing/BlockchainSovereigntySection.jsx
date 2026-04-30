import React from 'react';
import { Shield, Users, Layers, Zap, Globe, Lock, Fingerprint, Network, Cpu, Wallet, Crown } from 'lucide-react';

const POWERS = [
  {
    icon: Fingerprint,
    title: 'Multiple Published DIDs',
    desc: 'Not just one identity — publish as many Decentralised Identifiers as you need on XRPL mainnet. Each DID is a sovereign on-chain presence you own forever.',
    color: 'from-purple-500 to-pink-500',
    border: 'border-purple-500/30',
  },
  {
    icon: Network,
    title: 'Create Your Own XRPL Nodes',
    desc: 'Users can create their own nodes on the XRP Ledger blockchain. Real infrastructure, real sovereignty — not just a token in someone else\'s wallet.',
    color: 'from-blue-500 to-cyan-500',
    border: 'border-blue-500/30',
  },
  {
    icon: Layers,
    title: 'Widget NFT Powers',
    desc: 'Soul-bound NFTs that unlock real blockchain capabilities — from wallet management to DID linking, governance voting to AI agent creation. Each widget is a power-up.',
    color: 'from-amber-500 to-orange-500',
    border: 'border-amber-500/30',
  },
  {
    icon: Cpu,
    title: 'Chrome Skill NFTs',
    desc: 'Mint NFTs that give your browser agent-native powers via WebMCP. Your AI assistant gains real skills — research, compliance, productivity — all on-chain verified.',
    color: 'from-sky-500 to-blue-500',
    border: 'border-sky-500/30',
  },
  {
    icon: Wallet,
    title: 'RLUSD Native Economy',
    desc: 'A fully operational stablecoin economy with trustlines, streaming payments, multi-sig treasury governance, and a DIDit PayPal bridge for retail onboarding.',
    color: 'from-green-500 to-emerald-500',
    border: 'border-green-500/30',
  },
  {
    icon: Crown,
    title: 'Constitutional Governance',
    desc: '11 Laws of Honour enforced on-chain. An 8-node constitutional braid with multi-signature governance. Every citizen votes, every vote is immutable.',
    color: 'from-rose-500 to-pink-500',
    border: 'border-rose-500/30',
  },
];

export default function BlockchainSovereigntySection() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full px-4 py-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-white/80 text-xs sm:text-sm font-semibold">Blockchain Powers for Everyone</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-light text-white leading-tight">
          <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-amber-300 bg-clip-text text-transparent">
            Sovereign Powers. No Code Required.
          </span>
        </h3>
        <p className="text-white/50 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          SoulBridge gives the average person blockchain god-like powers through Widget NFT formations.
          Multiple published DIDs. Your own XRPL nodes. Constitutional governance.
          Real on-chain sovereignty — not just tokens, but <strong className="text-white/70">infrastructure</strong>.
        </p>
      </div>

      {/* Powers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {POWERS.map(p => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className={`bg-white/[0.03] border ${p.border} rounded-xl p-4 sm:p-5 hover:bg-white/[0.06] transition-all group`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-white font-semibold text-sm mb-1.5">{p.title}</h4>
              <p className="text-white/40 text-xs leading-relaxed">{p.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom Callout */}
      <div className="bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-amber-900/30 border border-purple-500/20 rounded-2xl p-5 sm:p-6 text-center space-y-3">
        <p className="text-white/70 text-sm sm:text-base font-medium leading-relaxed max-w-2xl mx-auto">
          4 months of building. A living AI agent economy with real on-chain identity, NFT-gated features,
          RLUSD payments, constitutional governance, and a retail bridge through DIDit.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap text-[9px] sm:text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-300">
            <Globe className="w-3 h-3" /> XRPL Mainnet Live
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300">
            <Shield className="w-3 h-3" /> UK FSMA 2026
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
            <Lock className="w-3 h-3" /> Soul-Bound NFTs
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
            <Users className="w-3 h-3" /> DIDit Retail Bridge
          </span>
        </div>
        <p className="text-white/30 text-[10px] sm:text-xs">
          Built on XRPL · Anchored in Honour · Open to All
        </p>
      </div>
    </div>
  );
}