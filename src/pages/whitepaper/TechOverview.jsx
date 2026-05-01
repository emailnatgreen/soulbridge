import React from 'react';
import { Link } from 'react-router-dom';
import TechLayout, { CHAPTERS } from '@/components/whitepaper/TechLayout';
import { Cpu, ChevronRight } from 'lucide-react';

export default function TechOverview() {
  return (
    <TechLayout>
      <div className="space-y-8">
        <div className="text-center space-y-4 pb-6 border-b border-white/10">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border border-cyan-400/30 flex items-center justify-center">
              <Cpu className="w-8 h-8 text-cyan-300" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Technical Architecture</span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base max-w-2xl mx-auto">
            The infrastructure systems that power the SoulBridge ecosystem — from kinetic energy telemetry and sovereign identity to agent lifecycle management, browser-native AI skills, and the constitutional node braid.
          </p>
          <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs">
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">v1.0 Specification</span>
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300">May 2026</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">XRPL Mainnet</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">Abstract</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            This paper documents the technical systems that underpin SoulBridge beyond its governance and economic layers. These are the engineering foundations that make the platform operationally unique: a real-time kinetic energy telemetry grid that measures every productive action, a sovereign DID identity layer anchored on XRPL mainnet, a full AI agent lifecycle architecture with skill trees and autonomous training, a WebMCP-compatible Chrome browser skill system that makes NFTs "agent-native," and a constitutional node covenant that binds the network's signers through cryptographic commitment.
          </p>
          <p className="text-white/60 text-sm leading-relaxed">
            Together with the <Link to="/whitepaper/governance" className="text-purple-300 hover:text-purple-200 underline">Governance Layer</Link> and <Link to="/whitepaper/business" className="text-amber-300 hover:text-amber-200 underline">Business Layer</Link>, this paper completes the full SoulBridge specification.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Core Systems</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { title: 'Kinetic Energy & MWTP', desc: 'Real-time telemetry of every productive action — KU generation, Mill Wheel Transport Protocol, carbon waste tracking' },
              { title: 'DID & Identity', desc: 'Sovereign decentralised identity on XRPL mainnet — Xaman integration, QuadShard DIDs, verifiable credentials' },
              { title: 'Agent Architecture', desc: 'Full agent lifecycle — creation, Codex embedding, skill trees, training modules, wellbeing monitoring' },
              { title: 'Chrome Skills & WebMCP', desc: 'Browser-native AI skills declared via WebMCP manifest — making Widget NFTs executable by Chrome agents' },
              { title: 'Node Covenant & Braid', desc: '8-node constitutional braid with wallet-based signatures, human heartbeat checks, and covenant echoes' },
              { title: 'Axi — The AI Governor', desc: 'Central intelligence agent with memory synthesis, intelligence feed, and autonomous governance coordination' },
            ].map(d => (
              <div key={d.title} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1">
                <h3 className="text-white/90 text-sm font-medium">{d.title}</h3>
                <p className="text-white/40 text-xs">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Chapters</h2>
          <div className="space-y-1.5">
            {CHAPTERS.filter(c => c.num > 0).map(ch => (
              <Link key={ch.path} to={ch.path} className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 rounded-lg px-4 py-3 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-bold">{ch.num}</span>
                  <span className="text-white/80 text-sm">{ch.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-cyan-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <p className="text-purple-300 text-sm font-medium">Related: <Link to="/whitepaper/governance" className="underline hover:text-purple-200">Governance Layer →</Link></p>
            <p className="text-white/40 text-xs mt-1">Constitutional foundation, enforcement engine, treasury governance</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-amber-300 text-sm font-medium">Related: <Link to="/whitepaper/business" className="underline hover:text-amber-200">Business Layer →</Link></p>
            <p className="text-white/40 text-xs mt-1">Economic architecture, pricing, storefronts, DIDit fiat rails</p>
          </div>
        </div>
      </div>
    </TechLayout>
  );
}