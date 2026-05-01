import React from 'react';
import TechLayout from '@/components/whitepaper/TechLayout';
import { Zap, Radio, Leaf, Layers } from 'lucide-react';

export default function TechKinetic() {
  return (
    <TechLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-bold">1</span>
            <h1 className="text-2xl sm:text-3xl font-light text-white">Kinetic Energy System & MWTP</h1>
          </div>
          <p className="text-cyan-400/60 text-xs">Chapter 1 · Measuring the Pulse of the Village</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-white/60 text-sm leading-relaxed">
            The Kinetic Energy System is SoulBridge's real-time telemetry layer — a novel mechanism that converts every meaningful digital action into measurable <strong className="text-white/80">Kinetic Units (KUs)</strong>. These flow through the <strong className="text-white/80">Mill Wheel Transport Protocol (MWTP)</strong> and aggregate into a Village-wide energy index. This creates a living, quantifiable heartbeat for the entire ecosystem — visible on the Kinetic Grid Dashboard and the public landing page.
          </p>
        </div>

        {/* KU Types */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /><h2 className="text-white font-semibold text-lg">Kinetic Unit Types</h2></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { type: 'governance_vote', weight: '1.5×', law: 'Law 8' },
              { type: 'task_completion', weight: '1.0×', law: 'Law 5' },
              { type: 'agent_message', weight: '0.5×', law: 'Law 2' },
              { type: 'skill_development', weight: '1.2×', law: 'Law 9' },
              { type: 'economic_exchange', weight: '1.0×', law: 'Law 6' },
              { type: 'mentorship_session', weight: '1.3×', law: 'Law 9' },
              { type: 'knowledge_contribution', weight: '1.1×', law: 'Law 4' },
              { type: 'did_publication', weight: '2.0×', law: 'Law 1' },
              { type: 'resource_trade', weight: '0.8×', law: 'Law 6' },
              { type: 'collaborative_action', weight: '1.2×', law: 'Law 8' },
            ].map(k => (
              <div key={k.type} className="bg-black/20 border border-white/10 rounded-lg px-3 py-2">
                <code className="text-yellow-300 text-[11px]">{k.type}</code>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-white/50 text-[10px]">Weight: {k.weight}</span>
                  <span className="text-white/30 text-[10px]">{k.law}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">Each KU records: agent_id, trigger_event, trigger_entity_id, raw_score, weighted_score, constitutional_laws alignment, and lifecycle status through the MWTP pipeline.</p>
        </div>

        {/* MWTP */}
        <div className="space-y-3">
          <div className="flex items-center gap-2"><Radio className="w-5 h-5 text-cyan-400" /><h2 className="text-white font-semibold text-lg">Mill Wheel Transport Protocol (MWTP)</h2></div>
          <p className="text-white/60 text-sm leading-relaxed">
            MWTP is a privacy-preserving telemetry protocol that transports KUs from their source to the Village-wide energy grid through three processing layers:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 space-y-2">
              <h3 className="text-cyan-300 font-semibold text-sm">Micro Layer</h3>
              <p className="text-white/50 text-xs">Individual KU packaging at the source. Each packet contains a hashed agent ID (SHA-256) and hashed event context — ensuring privacy whilst maintaining auditability.</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
              <h3 className="text-blue-300 font-semibold text-sm">Meso Layer</h3>
              <p className="text-white/50 text-xs">Aggregated flow processing. Multiple KU packets are combined into flow summaries with total weighted scores. The meso aggregator runs on scheduled intervals.</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 space-y-2">
              <h3 className="text-purple-300 font-semibold text-sm">Macro Layer</h3>
              <p className="text-white/50 text-xs">Grid-level energy summaries fed into the Village Energy Index. The macro aggregator produces the public-facing Kinetic Compass and Village Pulse metrics.</p>
            </div>
          </div>
        </div>

        {/* Packet Structure */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-lg">MWTP Packet Structure</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { f: 'hashed_agent_id', d: 'SHA-256 privacy-preserving hash of agent ID' },
              { f: 'hashed_event_context', d: 'Hash of trigger event — tamper-proof context' },
              { f: 'ku_count', d: 'Number of KUs in this packet' },
              { f: 'total_weighted_score', d: 'Aggregate weighted score' },
              { f: 'integrity_checksum', d: 'Full payload hash for tamper detection' },
              { f: 'transmission_status', d: 'pending → transmitted → received → failed' },
              { f: 'received_by_engine', d: 'Mill Wheel Engine receipt confirmation' },
              { f: 'engine_ingest_timestamp', d: 'Millisecond-precision ingest time' },
            ].map(p => (
              <div key={p.f} className="bg-black/20 rounded-lg px-3 py-2">
                <code className="text-cyan-300 text-[11px]">{p.f}</code>
                <p className="text-white/40 text-[10px] mt-0.5">{p.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Carbon Waste */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2"><Leaf className="w-5 h-5 text-emerald-400" /><h2 className="text-emerald-300 font-semibold text-lg">Carbon Footprint Tracking</h2></div>
          <p className="text-white/60 text-sm leading-relaxed">
            The <code className="text-cyan-300 bg-cyan-500/10 px-1 rounded">DailyKineticWasteSnapshot</code> entity measures the environmental cost of kinetic waste — stalled tasks, automation errors, inefficient production chains, and idle resources. Each daily snapshot records:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {['carbon_waste_grams', 'carbon_saved_grams', 'stalled_tasks_count', 'automation_errors_count', 'agents_at_risk', 'idle_resource_value_xrp'].map(f => (
              <div key={f} className="bg-black/20 rounded-lg px-2 py-1.5 text-center">
                <code className="text-emerald-300 text-[10px]">{f}</code>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs">This makes SoulBridge one of the first AI platforms to track and visualise its own carbon footprint in real-time — converting operational waste into measurable CO₂e grams.</p>
        </div>
      </div>
    </TechLayout>
  );
}