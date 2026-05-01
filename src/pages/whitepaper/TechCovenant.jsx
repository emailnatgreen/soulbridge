import React from 'react';
import TechLayout from '@/components/whitepaper/TechLayout';
import { Link2, HeartPulse, Shield, FileCheck } from 'lucide-react';

export default function TechCovenant() {
  return (
    <TechLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-bold">5</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Node Covenant & Constitutional Braid</h1>
          </div>
          <p className="text-cyan-400/60 text-xs">Chapter 5 · The Trust Anchor</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The Node Covenant is the cryptographic commitment that binds the network's constitutional signers. Each node — whether human-operated or AI-governed — must sign a covenant message using their XRPL wallet via Xaman. This creates an 8-node <strong className="text-white/80">constitutional braid</strong> where trust is distributed across multiple independent parties, no single node can control the system, and liveness is continuously monitored.
          </p>
        </div>

        {/* Covenant Signing */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><FileCheck className="w-5 h-5 text-green-400" /><h2 className="text-white font-semibold text-lg">Covenant Signing Process</h2></div>
          <p className="text-white/60 text-sm">The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">NodeCovenantSignature</code> entity tracks each node's constitutional commitment:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { f: 'node_address', d: 'Canonical XRPL address of the braid node' },
              { f: 'node_name', d: 'Display name (e.g. "Node 1 — The Architect")' },
              { f: 'signature_message', d: 'Human-readable covenant text signed by the node' },
              { f: 'xumm_payload_id', d: 'Xaman signing payload UUID' },
              { f: 'xrpl_account', d: 'XRPL account confirmed by Xaman during signing' },
              { f: 'xrpl_txid', d: 'On-chain transaction hash (when available)' },
              { f: 'signature_hash', d: 'Hex hash returned from signing flow' },
              { f: 'status', d: 'pending → signed → expired' },
            ].map(s => (
              <div key={s.f} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                <code className="text-cyan-300 text-[11px]">{s.f}</code>
                <p className="text-white/40 text-[10px] mt-0.5">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Braid Architecture */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Link2 className="w-5 h-5 text-purple-400" /><h2 className="text-white font-semibold text-lg">8-Node Braid Architecture</h2></div>
          <p className="text-white/60 text-sm">The constitutional braid consists of 8 nodes with distinct roles and responsibilities:</p>
          <div className="space-y-2">
            {[
              { node: 'Node 1', role: 'The Architect', type: 'Human', desc: 'Platform founder — sets constitutional direction' },
              { node: 'Node 2', role: 'The Guardian', type: 'Human', desc: 'Security oversight — monitors covenant integrity' },
              { node: 'Node 3', role: 'The Oracle', type: 'AI (Axi)', desc: 'AI governance advisor — provides intelligence and analysis' },
              { node: 'Node 4', role: 'The Keeper', type: 'Human', desc: 'Treasury custodian — financial oversight' },
              { node: 'Node 5', role: 'The Scholar', type: 'AI', desc: 'Knowledge integrity — constitutional alignment checking' },
              { node: 'Node 6', role: 'The Mediator', type: 'Human', desc: 'Dispute resolution — human-in-the-loop escalation point' },
              { node: 'Node 7', role: 'The Builder', type: 'AI', desc: 'Technical infrastructure — automation health monitoring' },
              { node: 'Node 8', role: 'The Witness', type: 'Community', desc: 'Community representative — elected by governance vote' },
            ].map(n => (
              <div key={n.node} className="flex gap-3">
                <div className="w-20 flex-shrink-0 text-center">
                  <p className="text-cyan-300 text-xs font-bold">{n.node}</p>
                  <p className={`text-[9px] ${n.type === 'Human' ? 'text-green-300' : n.type.startsWith('AI') ? 'text-purple-300' : 'text-amber-300'}`}>{n.type}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1">
                  <p className="text-white/80 text-xs font-medium">{n.role}</p>
                  <p className="text-white/40 text-[11px]">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heartbeat */}
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><HeartPulse className="w-5 h-5 text-pink-400" /><h2 className="text-pink-300 font-semibold text-lg">Human Heartbeat & Covenant Echoes</h2></div>
          <p className="text-white/60 text-sm leading-relaxed">
            Human nodes must periodically confirm liveness through the <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">humanNodeHeartbeat</code> function. If a node fails to respond within the configured window, the system triggers alerts through <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">axiMonitorCovenantEchoes</code>. This prevents silent node departure and ensures the braid maintains its trust properties at all times.
          </p>
          <p className="text-white/40 text-xs">Covenant echoes are logged to Axi's memory system, creating an immutable record of braid health over time.</p>
        </div>

        {/* Integration */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-amber-400" /><h2 className="text-white font-semibold text-lg">Multi-Sig Integration</h2></div>
          <p className="text-white/60 text-sm leading-relaxed">
            The covenant signers form the basis of the XRPL <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">SignerListSet</code> multi-sig configuration. Treasury operations require weighted quorum (4-of-7) from covenant signers. The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">setupConstitutionalMultiSig</code> and <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">verifyMultiSig</code> functions manage the on-chain signer list and signature verification.
          </p>
        </div>
      </div>
    </TechLayout>
  );
}